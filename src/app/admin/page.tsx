'use client';

import { useState, useEffect } from 'react';
import { roomStore } from '@/utils/roomStore';
import { characterStore } from '@/utils/characterStore';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { PoolCharacter } from '@/types/poolCharacter';
import { Character, CHARACTER_EMOJIS } from '@/types/character';

type AdminTab =
  | 'overview'
  | 'rooms'
  | 'characters'
  | 'tests'
  | 'system'
  | 'users'
  | 'logs'
  | 'leaderboard';

interface PlayerState {
  id: string;
  name: string;
  isReady?: boolean;
}

interface Room {
  id: string;
  created_at: Date;
  players: PlayerState[];
  is_game_started: boolean;
  character_pool?: PoolCharacter[];
  player_picks?: { [key: string]: string };
  player_picks_state?: { [key: string]: { characterId?: string; isReady: boolean } };
  player_guesses?: { [key: string]: { characterId: string; timestamp: string }[] };
  winner?: string | null;
}

interface AdminStats {
  totalRooms: number;
  activeRooms: number;
  totalCharacters: number;
  totalPlayers: number;
}

interface RoomDetails extends Room {
  duration?: number; // in minutes
}

interface SystemHealth {
  dbStatus: 'connected' | 'error';
  lastChecked: Date;
  activeConnections: number;
  avgResponseTime: number;
  errorLogs: Array<{
    timestamp: Date;
    message: string;
    type: 'error' | 'warning';
  }>;
}

interface AdminUser {
  id: string;
  email: string;
  metadata: {
    is_admin: boolean;
    username?: string;
    [key: string]: boolean | string | undefined;
  };
  lastVerified: string;
}

interface User {
  id: string;
  email: string;
  user_metadata: {
    username?: string;
    is_admin?: boolean;
    [key: string]: boolean | string | undefined;
  };
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalRooms: 0,
    activeRooms: 0,
    totalCharacters: 0,
    totalPlayers: 0,
  });
  const [characters, setCharacters] = useState<Character[]>([]);
  const [rooms, setRooms] = useState<RoomDetails[]>([]);
  const [roomFilter, setRoomFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    dbStatus: 'connected',
    lastChecked: new Date(),
    activeConnections: 0,
    avgResponseTime: 0,
    errorLogs: [],
  });
  const [users, setUsers] = useState<User[]>([]);
  const [userFilter, setUserFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isResettingLeaderboard, setIsResettingLeaderboard] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      setIsCheckingAccess(true);
      try {
        const response = await fetch('/api/admin/check-access');
        const data = await response.json();

        if (!response.ok) {
          console.error('Admin access denied:', data.error);
          router.push('/');
          return;
        }

        // Store admin user data
        setIsAuthenticated(true);
        setAdminUser(data.user);
        loadStats();
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/');
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Load rooms
      await roomStore.loadRooms();
      const rooms = roomStore.getRooms();
      const activeRooms = rooms.filter(room => room.players.length > 0);

      // Load characters
      await characterStore.loadCharacters();
      const characters = characterStore.getCharacters();

      setStats({
        totalRooms: rooms.length,
        activeRooms: activeRooms.length,
        totalCharacters: characters.length,
        totalPlayers: rooms.reduce((sum, room) => sum + room.players.length, 0),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runConnectionTest = async () => {
    setIsLoading(true);
    try {
      const result = await roomStore.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (window.confirm('Are you sure you want to clean up inactive rooms?')) {
      setIsLoading(true);
      try {
        await roomStore.cleanup();
        await loadStats();
        alert('Cleanup completed successfully');
      } catch (error) {
        alert('Error during cleanup');
        console.error('Cleanup error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const loadRoomDetails = async () => {
    setIsLoading(true);
    try {
      await roomStore.loadRooms();
      const allRooms = roomStore.getRooms();

      // Enhance rooms with duration
      const enhancedRooms = allRooms.map(room => ({
        ...room,
        duration: Math.floor(
          (new Date().getTime() - new Date(room.created_at).getTime()) / (1000 * 60)
        ),
      }));

      setRooms(enhancedRooms);
    } catch (error) {
      console.error('Error loading room details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'rooms') {
      loadRoomDetails();
      // Refresh room details every minute
      const interval = setInterval(loadRoomDetails, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  const filteredRooms = rooms
    .filter(room => {
      if (roomFilter === 'active') return room.players.length > 0;
      if (roomFilter === 'inactive') return room.players.length === 0;
      return true;
    })
    .filter(
      room =>
        room.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.players.some(player => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const handleDeleteRoom = async (roomId: string) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      setIsLoading(true);
      try {
        await roomStore.deleteRoom(roomId);
        await loadRoomDetails();
        alert('Room deleted successfully');
      } catch (error) {
        alert('Error deleting room');
        console.error('Delete room error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkSystemHealth = async () => {
    setIsLoading(true);
    try {
      // Test database connection
      const connectionTest = await roomStore.testConnection();

      // Get active connections (rooms with players)
      const rooms = roomStore.getRooms();
      const activeRooms = rooms.filter(room => room.players.length > 0);
      const totalConnections = activeRooms.reduce((sum, room) => sum + room.players.length, 0);

      // Measure response time
      const start = Date.now();
      await roomStore.loadRooms();
      const end = Date.now();
      const responseTime = end - start;

      setSystemHealth(prev => ({
        dbStatus: connectionTest.success ? 'connected' : 'error',
        lastChecked: new Date(),
        activeConnections: totalConnections,
        avgResponseTime: responseTime,
        errorLogs: [
          ...prev.errorLogs,
          ...(connectionTest.success
            ? []
            : [
                {
                  timestamp: new Date(),
                  message: connectionTest.message,
                  type: 'error' as const,
                },
              ]),
        ].slice(-10), // Keep only last 10 logs
      }));
    } catch (error) {
      setSystemHealth(prev => ({
        ...prev,
        dbStatus: 'error',
        lastChecked: new Date(),
        errorLogs: [
          ...prev.errorLogs,
          {
            timestamp: new Date(),
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'error' as const,
          },
        ].slice(-10),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'system') {
      checkSystemHealth();
      // Check system health every 30 seconds
      const interval = setInterval(checkSystemHealth, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  const handleLogout = () => {
    router.push('/');
  };

  // Load users
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'users') {
      loadUsers();
    }
  }, [isAuthenticated, activeTab]);

  const handleRoleUpdate = async (userId: string, isAdmin: boolean) => {
    if (
      !window.confirm(
        `Are you sure you want to ${isAdmin ? 'grant' : 'revoke'} admin access for this user?`
      )
    ) {
      return;
    }

    setIsUpdatingRole(true);
    try {
      const response = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, isAdmin }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Reload users to get updated data
      await loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleResetLeaderboard = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset the leaderboard? This action cannot be undone.'
      )
    ) {
      return;
    }

    setIsResettingLeaderboard(true);
    try {
      const response = await fetch('/api/admin/reset-leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset leaderboard');
      }

      alert('Leaderboard has been reset successfully');
      loadStats();
    } catch (error) {
      console.error('Error resetting leaderboard:', error);
      alert('Failed to reset leaderboard. Please try again.');
    } finally {
      setIsResettingLeaderboard(false);
    }
  };

  // Load characters when the characters tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'characters') {
      loadCharacters();
    }
  }, [isAuthenticated, activeTab]);

  const loadCharacters = async () => {
    setIsLoading(true);
    try {
      await characterStore.loadCharacters();
      setCharacters(characterStore.getCharacters());
    } catch (error) {
      console.error('Error loading characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this character? This action cannot be undone.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/characters/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete character');
      }

      await loadCharacters();
      await loadStats();
    } catch (error) {
      console.error('Error deleting character:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete character');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUsername = async (userId: string) => {
    if (!newUsername.trim()) {
      alert('Please enter a valid username');
      return;
    }

    setIsUpdatingUsername(true);
    try {
      const response = await fetch('/api/admin/update-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newUsername: newUsername.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update username');
      }

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? {
                ...user,
                user_metadata: {
                  ...user.user_metadata,
                  username: newUsername.trim(),
                },
              }
            : user
        )
      );

      setEditingUser(null);
      setNewUsername('');
      alert('Username updated successfully');
    } catch (error) {
      console.error('Error updating username:', error);
      alert('Failed to update username. Please try again.');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const renderUsersTab = () => {
    const filteredUsers = users
      .filter(user => {
        if (userFilter === 'admin') return user.user_metadata?.is_admin;
        if (userFilter === 'regular') return !user.user_metadata?.is_admin;
        return true;
      })
      .filter(
        user =>
          user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          user.user_metadata?.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
      );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={userSearchQuery}
              onChange={e => setUserSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded bg-white/10 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="px-4 py-2 rounded bg-white/10 border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Users</option>
            <option value="admin">Admins</option>
            <option value="regular">Regular Users</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingUser === user.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          placeholder="Enter new username"
                          className="px-2 py-1 rounded bg-white/10 border border-gray-700 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleUpdateUsername(user.id)}
                          disabled={isUpdatingUsername}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {isUpdatingUsername ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(null);
                            setNewUsername('');
                          }}
                          className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{user.user_metadata?.username || '-'}</span>
                        <button
                          onClick={() => {
                            setEditingUser(user.id);
                            setNewUsername(user.user_metadata?.username || '');
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        user.user_metadata?.is_admin
                          ? 'bg-purple-600/20 text-purple-400'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}
                    >
                      {user.user_metadata?.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleRoleUpdate(user.id, !user.user_metadata?.is_admin)}
                      disabled={isUpdatingRole}
                      className={`px-2 py-1 text-xs rounded ${
                        user.user_metadata?.is_admin
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      } text-white disabled:opacity-50`}
                    >
                      {isUpdatingRole
                        ? 'Updating...'
                        : user.user_metadata?.is_admin
                          ? 'Remove Admin'
                          : 'Make Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLeaderboardTab = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Leaderboard Management</h2>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Reset Leaderboard</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will reset all player statistics. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={handleResetLeaderboard}
              disabled={isResettingLeaderboard}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isResettingLeaderboard ? 'Resetting...' : 'Reset Leaderboard'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isCheckingAccess) {
      return <div>Checking access...</div>;
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-500/10 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total Rooms</h3>
              <p className="text-3xl font-bold">{stats.totalRooms}</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Active Rooms</h3>
              <p className="text-3xl font-bold">{stats.activeRooms}</p>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total Characters</h3>
              <p className="text-3xl font-bold">{stats.totalCharacters}</p>
            </div>
          </div>
        );
      case 'rooms':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex gap-4">
                <select
                  value={roomFilter}
                  onChange={e => setRoomFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Rooms</option>
                  <option value="active">Active Rooms</option>
                  <option value="inactive">Inactive Rooms</option>
                </select>
                <input
                  type="text"
                  placeholder="Search rooms or players..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCleanup}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Cleaning...' : 'Clean Inactive Rooms'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-600">
                    <th className="p-3">Room Code</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Players</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map(room => (
                    <tr key={room.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="p-3">{room.id}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            room.is_game_started
                              ? 'bg-green-500/20 text-green-300'
                              : room.players.length > 0
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {room.is_game_started
                            ? 'In Game'
                            : room.players.length > 0
                              ? 'Waiting'
                              : 'Empty'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {room.players.map((player, idx) => (
                            <span key={idx} className="text-sm">
                              {player.name}
                              {player.isReady && ' ✓'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">{room.duration} min</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'characters':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search characters..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => router.push('/characters')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add New Character
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400">Loading characters...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-600">
                      <th className="p-3">Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Created By</th>
                      <th className="p-3">Created At</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {characters
                      .filter(char => char.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(character => (
                        <tr
                          key={character.id}
                          className="border-b border-gray-700/50 hover:bg-white/5"
                        >
                          <td className="p-3">{character.name}</td>
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span role="img" aria-label={character.type}>
                                {CHARACTER_EMOJIS[character.type]}
                              </span>
                              {character.type
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')}
                            </span>
                          </td>
                          <td className="p-3">
                            {users.find(u => u.id === character.createdBy)?.email ||
                              character.createdBy}
                          </td>
                          <td className="p-3">
                            {new Date(character.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteCharacter(character.id)}
                              disabled={isLoading}
                              className="text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    {characters.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-gray-400">
                          No characters found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'tests':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Connection Test</h3>
              <button
                onClick={runConnectionTest}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Run Test'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-lg ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                <p className="font-medium">{testResult.success ? '✅ Success' : '❌ Error'}</p>
                <p>{testResult.message}</p>
              </div>
            )}
          </div>
        );
      case 'system':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div
                className={`p-4 rounded-lg ${
                  systemHealth.dbStatus === 'connected'
                    ? 'bg-green-500/10 text-green-300'
                    : 'bg-red-500/10 text-red-300'
                }`}
              >
                <h3 className="text-lg font-medium mb-2">Database Status</h3>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      systemHealth.dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <p className="text-lg capitalize">{systemHealth.dbStatus}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Active Connections</h3>
                <p className="text-3xl font-bold">{systemHealth.activeConnections}</p>
              </div>

              <div className="p-4 bg-purple-500/10 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Response Time</h3>
                <p className="text-3xl font-bold">{systemHealth.avgResponseTime}ms</p>
              </div>

              <div className="p-4 bg-gray-500/10 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Last Checked</h3>
                <p className="text-lg">{systemHealth.lastChecked.toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">System Logs</h3>
                <button
                  onClick={checkSystemHealth}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Checking...' : 'Check Now'}
                </button>
              </div>

              <div className="bg-black/20 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="p-3 text-left">Timestamp</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemHealth.errorLogs.map((log, index) => (
                      <tr key={index} className="border-b border-gray-700/50">
                        <td className="p-3 font-mono">{log.timestamp.toLocaleString()}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              log.type === 'error'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td className="p-3">{log.message}</td>
                      </tr>
                    ))}
                    {systemHealth.errorLogs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-gray-400">
                          No errors logged
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'users':
        return renderUsersTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      default:
        return null;
    }
  };

  if (isCheckingAccess) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="w-full max-w-md bg-white/5 p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Panel</h1>
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Verifying admin access...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="w-full max-w-md bg-white/5 p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Panel</h1>
          <p className="text-center text-red-500">
            Access denied. You need admin privileges to view this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex min-h-screen flex-col items-center p-24">
        <div className="z-10 w-full max-w-6xl space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              {adminUser && (
                <p className="text-sm text-gray-400">
                  Logged in as {adminUser.email} | Last verified:{' '}
                  {new Date(adminUser.lastVerified).toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-500 hover:text-red-600"
            >
              Logout
            </button>
          </div>

          <div className="border-b border-gray-600">
            <nav className="flex gap-4">
              {(
                [
                  'overview',
                  'rooms',
                  'characters',
                  'users',
                  'logs',
                  'tests',
                  'system',
                  'leaderboard',
                ] as const
              ).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'logs') {
                      router.push('/admin/logs');
                      return;
                    }
                    setActiveTab(tab);
                  }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent hover:border-gray-400'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white/5 p-6 rounded-lg shadow-lg">{renderContent()}</div>
        </div>
      </div>
    </main>
  );
}

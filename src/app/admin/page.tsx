'use client';

import { useState, useEffect } from 'react';
import { roomStore } from '@/utils/roomStore';
import { characterStore } from '@/utils/characterStore';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Navbar from '@/components/Navbar';
import { PoolCharacter } from '@/types/poolCharacter';

type AdminTab = 'overview' | 'rooms' | 'characters' | 'tests' | 'system';

interface PlayerState {
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
  winner?: string;
}

interface AdminStats {
  totalRooms: number;
  activeRooms: number;
  totalCharacters: number;
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

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdminStats>({
    totalRooms: 0,
    activeRooms: 0,
    totalCharacters: 0,
  });
  const [rooms, setRooms] = useState<RoomDetails[]>([]);
  const [roomFilter, setRoomFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchQuery, setSearchQuery] = useState('');
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    dbStatus: 'connected',
    lastChecked: new Date(),
    activeConnections: 0,
    avgResponseTime: 0,
    errorLogs: [],
  });

  // Check if already authenticated
  useEffect(() => {
    const isAuth = Cookies.get('adminPageAuth') === 'true';
    setIsAuthenticated(isAuth);
    if (isAuth) {
      loadStats();
    }
  }, []);

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
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (password === correctPassword) {
      Cookies.set('adminPageAuth', 'true', { expires: 1 }); // Expires in 1 day
      setIsAuthenticated(true);
      setError('');
      loadStats();
    } else {
      setError('Incorrect password');
    }
    setPassword('');
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

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="w-full max-w-md bg-white/5 p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Panel</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Enter Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Access Admin Panel
            </button>
          </form>
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
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <button
              onClick={() => {
                Cookies.remove('adminPageAuth');
                router.refresh();
              }}
              className="px-4 py-2 text-sm text-red-500 hover:text-red-600"
            >
              Logout
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-600">
            <nav className="flex gap-4">
              {(['overview', 'rooms', 'characters', 'tests', 'system'] as AdminTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
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

          {/* Tab Content */}
          <div className="bg-white/5 p-6 rounded-lg shadow-lg">
            {activeTab === 'overview' && (
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
            )}

            {activeTab === 'rooms' && (
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
            )}

            {activeTab === 'characters' && (
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/characters')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Manage Characters
                </button>
                {/* Character management features can be added here */}
              </div>
            )}

            {activeTab === 'tests' && (
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
            )}

            {activeTab === 'system' && (
              <div className="space-y-8">
                {/* System Status Overview */}
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

                {/* Error Logs */}
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
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

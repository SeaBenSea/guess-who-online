'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/utils/supabase';

interface AdminLog {
  id: string;
  action_type: string;
  performed_by: string;
  target_id: string;
  target_type: string;
  details: Record<string, string | number | boolean | null>;
  created_at: string;
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

export default function AdminLogsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

        setIsAuthenticated(true);
        setAdminUser(data.user);
        loadLogs();
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/');
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs
    .filter(log => {
      if (actionFilter === 'all') return true;
      return log.action_type === actionFilter;
    })
    .filter(log => {
      const searchLower = searchQuery.toLowerCase();
      return (
        log.target_id.toLowerCase().includes(searchLower) ||
        log.action_type.toLowerCase().includes(searchLower) ||
        log.target_type.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    });

  const handleLogout = () => {
    router.push('/');
  };

  if (isCheckingAccess) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="w-full max-w-md bg-white/5 p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Logs</h1>
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
          <h1 className="text-2xl font-bold text-center mb-6">Admin Logs</h1>
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
              <h1 className="text-2xl font-bold">Admin Logs</h1>
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

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-4">
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="all">All Actions</option>
                <option value="room_deletion">Room Deletions</option>
                <option value="admin_role_change">Admin Role Changes</option>
                <option value="character_deletion">Character Deletions</option>
              </select>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-600">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target Type</th>
                    <th className="p-3">Target ID</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="p-3">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            log.action_type === 'admin_role_change'
                              ? 'bg-blue-500/20 text-blue-300'
                              : log.action_type === 'room_deletion'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {log.action_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3">{log.target_type}</td>
                      <td className="p-3">
                        <span className="font-mono text-xs">{log.target_id}</span>
                      </td>
                      <td className="p-3">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 

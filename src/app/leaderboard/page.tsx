'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface LeaderboardEntry {
  user_id: string;
  games_played: number;
  wins: number;
  user_metadata?: {
    username: string;
  };
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch leaderboard');
        }
        const data = await response.json();
        setLeaderboard(data);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      }
    }

    fetchLeaderboard();
  }, []);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 p-24">
          <div className="max-w-5xl mx-auto font-mono">
            <div className="text-red-500 text-center">{error}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 p-24">
        <div className="max-w-5xl mx-auto font-mono">
          <h1 className="text-6xl font-bold text-center mb-8">Leaderboard</h1>

          <div className="mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Player</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Games</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Wins</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">
                      Win Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 font-bold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{entry.user_metadata?.username || 'Unknown Player'}</td>
                      <td className="px-6 py-4 text-gray-600">{entry.games_played}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {entry.wins}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {entry.games_played > 0
                            ? `${((entry.wins / entry.games_played) * 100).toFixed(1)}%`
                            : '0%'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

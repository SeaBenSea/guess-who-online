'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface LeaderboardEntry {
  nickname: string;
  games_played: number;
  wins: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('wins', { ascending: false });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      setLeaderboard(data || []);
    }

    fetchLeaderboard();
  }, [supabase]);

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
                    <tr key={entry.nickname} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 font-bold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{entry.nickname}</td>
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-opacity-80' : 'bg-opacity-0';
  };

  return (
    <nav className="font-mono p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold hover:opacity-80 transition-opacity">
            <span className="animate-shake inline-block">Guess</span> Who Online
          </Link>

          <div className="flex gap-4">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors ${isActive('/')}`}
            >
              Home
            </Link>
            <Link
              href="/characters"
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors ${isActive('/characters')}`}
            >
              Characters
            </Link>
            <Link
              href="/leaderboard"
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 transition-colors ${isActive('/leaderboard')}`}
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

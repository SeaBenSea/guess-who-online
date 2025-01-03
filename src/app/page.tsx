'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateRoomCode } from '@/utils/roomCode';
import { roomStore } from '@/utils/roomStore';
import JoinGameModal from '@/components/JoinGameModal';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Session } from '@supabase/supabase-js';

export default function Home() {
  const router = useRouter();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Home] Initial session:', session?.user?.email, session?.user?.user_metadata);
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Home] Auth state changed:', _event, session?.user?.email);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleCreateGame = async () => {
    console.log('[Home] Creating game, session:', session?.user?.email);
    if (!session) {
      console.log('[Home] No session, cannot create game');
      return;
    }

    setIsCreating(true);
    try {
      const roomCode = generateRoomCode();
      console.log('[Home] Generated room code:', roomCode);

      const created = await roomStore.createRoom(roomCode);
      console.log('[Home] Room creation result:', created);

      if (!created) {
        throw new Error('Failed to create room');
      }

      const joined = await roomStore.joinRoom(
        roomCode,
        session.user.id,
        session.user.user_metadata.username
      );
      console.log('[Home] Room join result:', joined);

      if (!joined) {
        throw new Error('Failed to join room');
      }

      console.log('[Home] Successfully created and joined room:', roomCode);
      router.push(`/room/${roomCode}`);
    } catch (error) {
      console.error('[Home] Failed to create game room:', error);
      alert('Failed to create game room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-6xl font-bold text-center mb-8">
          <span style={{ display: 'inline-block' }} className="animate-shake">
            Guess
          </span>{' '}
          Who Online
        </h1>
        <p className="text-xl text-center mb-8">
          The classic game of deduction, now playable online with friends!
        </p>

        {!session ? (
          <div className="flex flex-col items-center gap-4 mb-8">
            <p className="text-lg text-center text-gray-600 mb-4">Sign in to start playing!</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/auth/signin"
                className="px-6 py-3 text-lg font-semibold text-white bg-violet-500 rounded-lg hover:bg-violet-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-3 text-lg font-semibold text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Sign Up
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              ───── Sign in to access game features ─────
            </p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4">
              <p className="text-lg">
                Playing as: <span className="font-bold">{session.user.user_metadata.username}</span>
              </p>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.refresh();
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCreateGame}
              disabled={isCreating || !session}
              className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              disabled={!session}
              className="px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Join Game
            </button>
          </div>

          <button
            onClick={() => router.push('/characters')}
            disabled={!session}
            className="px-6 py-3 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            Manage Characters
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            disabled={!session}
            className="px-6 py-3 text-lg font-semibold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            Leaderboard
          </button>
        </div>
      </div>

      {session && (
        <JoinGameModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          userId={session.user.id}
          displayName={session.user.user_metadata.username}
        />
      )}
    </main>
  );
}

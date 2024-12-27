'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomCode } from '@/utils/roomCode';
import { roomStore } from '@/utils/roomStore';
import JoinGameModal from '@/components/JoinGameModal';
import NicknameInput from '@/components/NicknameInput';

export default function Home() {
  const router = useRouter();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [playerNickname, setPlayerNickname] = useState<string | null>(null);

  const handleCreateGame = async () => {
    if (!playerNickname) return;

    setIsCreating(true);
    try {
      const roomCode = generateRoomCode();

      const created = await roomStore.createRoom(roomCode);
      if (!created) {
        throw new Error('Failed to create room');
      }

      const joined = await roomStore.joinRoom(roomCode, playerNickname);
      if (!joined) {
        throw new Error('Failed to join room');
      }

      router.push(`/room/${roomCode}`);
    } catch (error) {
      console.error('Failed to create game room:', error);
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
        {playerNickname ? (
          <div className="text-center mb-8">
            <p className="text-lg">
              Playing as: <span className="font-bold">{playerNickname}</span>
            </p>
            <button
              onClick={() => setPlayerNickname(null)}
              className="text-sm text-blue-500 hover:text-blue-600 mt-2"
            >
              Change Nickname
            </button>
          </div>
        ) : null}
        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCreateGame}
              disabled={isCreating || !playerNickname}
              className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              disabled={!playerNickname}
              className="px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Join Game
            </button>
          </div>

          <button
            onClick={() => router.push('/characters')}
            className="px-6 py-3 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Manage Characters
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-6 py-3 text-lg font-semibold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Leaderboard
          </button>
        </div>
      </div>

      <NicknameInput isVisible={!playerNickname} onSubmit={setPlayerNickname} />

      <JoinGameModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        playerNickname={playerNickname}
      />
    </main>
  );
}

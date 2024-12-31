'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { roomStore } from '@/utils/roomStore';

interface JoinGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  displayName: string | null;
}

export default function JoinGameModal({
  isOpen,
  onClose,
  userId,
  displayName,
}: JoinGameModalProps) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  if (!isOpen || !userId || !displayName) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsJoining(true);

    try {
      const code = roomCode.toUpperCase();
      console.log('[JoinModal] Attempting to join room:', code);

      const exists = await roomStore.roomExists(code);
      console.log('[JoinModal] Room exists:', exists);

      if (!exists) {
        setError('Room does not exist');
        return;
      }

      const { canJoin, reason } = await roomStore.canJoinRoom(code, userId, displayName);
      console.log('[JoinModal] Can join room:', canJoin, 'Reason:', reason);

      if (!canJoin) {
        setError(reason || 'Cannot join room');
        return;
      }

      const joined = await roomStore.joinRoom(code, userId, displayName);
      console.log('[JoinModal] Join result:', joined);

      if (joined) {
        console.log('[JoinModal] Successfully joined room, navigating...');
        router.push(`/room/${code}`);
      } else {
        setError('Failed to join room');
      }
    } catch (error) {
      console.error('[JoinModal] Join room error:', error);
      setError('An error occurred while joining the room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Join Game</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="roomCode" className="block text-sm font-medium mb-2">
              Room Code
            </label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter 6-digit code"
              maxLength={6}
              pattern="[A-Z0-9]{6}"
              required
              disabled={isJoining}
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
              disabled={isJoining}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              disabled={isJoining}
            >
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

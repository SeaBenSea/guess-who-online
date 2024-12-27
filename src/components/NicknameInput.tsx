'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface NicknameInputProps {
  onSubmit: (nickname: string) => void;
  isVisible: boolean;
}

export default function NicknameInput({ onSubmit, isVisible }: NicknameInputProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if nickname is stored in cookies
    const storedNickname = Cookies.get('playerNickname');
    if (storedNickname) {
      setNickname(storedNickname);
      onSubmit(storedNickname);
    }
  }, [onSubmit]);

  if (!isVisible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 2) {
      setError('Nickname must be at least 2 characters long');
      return;
    }
    if (trimmedNickname.length > 15) {
      setError('Nickname must be less than 15 characters');
      return;
    }

    // Store nickname in cookies
    Cookies.set('playerNickname', trimmedNickname, { expires: 7 }); // Expires in 7 days
    onSubmit(trimmedNickname);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Choose Your Nickname</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="nickname" className="block text-sm font-medium mb-2">
              Nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={e => {
                setError('');
                setNickname(e.target.value);
              }}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter your nickname"
              maxLength={15}
              required
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

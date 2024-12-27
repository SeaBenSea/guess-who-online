'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { roomStore } from '@/utils/roomStore';
import { CHARACTER_EMOJIS, CharacterType } from '@/types/character';
import { PoolCharacter } from '@/types/poolCharacter';
import Cookies from 'js-cookie';
import Image from 'next/image';

interface GameBoardProps {
  params: Promise<{
    code: string;
  }>;
}

interface EliminatedState {
  [characterId: string]: boolean;
}

export default function GameBoard({ params }: GameBoardProps) {
  const router = useRouter();
  const { code } = use(params);
  const [nickname, setNickname] = useState<string>('');
  const [poolCharacters, setPoolCharacters] = useState<PoolCharacter[]>([]);
  const [eliminated, setEliminated] = useState<EliminatedState>({});
  const [guessCount, setGuessCount] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);
  const [playerPicks, setPlayerPicks] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Get the stored nickname
    const storedNickname = Cookies.get('playerNickname');
    if (!storedNickname) {
      router.replace('/');
      return;
    }
    setNickname(storedNickname);

    // Load initial game state
    const loadGameState = async () => {
      const room = await roomStore.getRoom(code);
      if (!room) {
        router.replace('/');
        return;
      }

      const pool = await roomStore.getCharacterPool(code);
      setPoolCharacters(pool);

      const count = await roomStore.getGuessCount(code, storedNickname);
      setGuessCount(count);

      const currentWinner = await roomStore.getWinner(code);
      setWinner(currentWinner);

      if (room.player_picks) {
        setPlayerPicks(room.player_picks);
      }
    };

    loadGameState();

    // Subscribe to room changes
    const subscription = roomStore.subscribeToRoom(code, async room => {
      if (!room) {
        router.replace('/');
        return;
      }

      // Update winner if game is over
      if (room.winner) {
        setWinner(room.winner);
      }

      // Update guess count
      const count = await roomStore.getGuessCount(code, storedNickname);
      setGuessCount(count);

      // Update player picks
      if (room.player_picks) {
        setPlayerPicks(room.player_picks);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [code, router]);

  const handleCardClick = async (characterId: string) => {
    if (winner) return; // Game is over

    if (isGuessing) {
      // Make a guess
      if (guessCount >= 2) {
        alert('You have no more guesses left!');
        return;
      }

      const success = await roomStore.makeGuess(code, nickname, characterId);
      if (success) {
        setGuessCount(prev => prev + 1);
      }
      setIsGuessing(false);
    } else {
      // Toggle elimination
      setEliminated(prev => ({
        ...prev,
        [characterId]: !prev[characterId],
      }));
    }
  };

  const getStatusMessage = () => {
    if (winner) {
      return winner === nickname ? 'You won! 🎉' : `${winner} won!`;
    }
    if (isGuessing) {
      return 'Make your guess!';
    }
    return 'Ask questions and try to guess the character!';
  };

  const handleExit = async () => {
    // Only show confirmation if game is in progress (no winner)
    if (
      !winner &&
      !confirm('Are you sure you want to exit? If the game is in progress, you will lose.')
    ) {
      return;
    }
    await roomStore.leaveRoom(code, nickname);
    router.replace('/');
  };

  if (!nickname) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </main>
    );
  }

  const myPick = playerPicks[nickname];
  const myCharacter = poolCharacters.find(c => c.id === myPick);
  const opponentNickname = Object.keys(playerPicks).find(n => n !== nickname);

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      {/* Game Status */}
      <div className="w-full max-w-4xl mb-8">
        <div className="bg-white/10 rounded-lg p-6 text-center">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Game Status</h1>
            <button
              onClick={handleExit}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Exit Game
            </button>
          </div>
          <p className="text-xl text-green-400">{getStatusMessage()}</p>
          {!winner && <p className="text-lg mt-2">Guesses remaining: {2 - guessCount}</p>}
        </div>
      </div>

      {/* Game Board */}
      <div className="w-full max-w-6xl grid gap-8">
        {/* Player Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* My Info */}
          <div className="bg-white/10 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Your Character</h2>
            {myCharacter && (
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center">
                  {myCharacter.imageUrl ? (
                    <Image
                      src={myCharacter.imageUrl}
                      alt={myCharacter.name}
                      className="w-full h-full object-cover rounded-lg"
                      width={96}
                      height={96}
                    />
                  ) : (
                    <span className="text-6xl">
                      {CHARACTER_EMOJIS[myCharacter.type as CharacterType]}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{myCharacter.name}</h3>
                  <p className="text-gray-400 capitalize">{myCharacter.type.replace('_', ' ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Opponent Info */}
          <div className="bg-white/10 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              {opponentNickname ? `${opponentNickname}'s Character` : 'Waiting for opponent...'}
            </h2>
            {opponentNickname && (
              <div className="flex items-center justify-center">
                <div className="w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center">
                  <span className="text-6xl">❓</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Controls */}
        {!winner && (
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setIsGuessing(true)}
              disabled={isGuessing || guessCount >= 2}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isGuessing || guessCount >= 2
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Make a Guess
            </button>
            {isGuessing && (
              <button
                onClick={() => setIsGuessing(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Cancel Guess
              </button>
            )}
          </div>
        )}

        {/* Character Pool */}
        <div className="bg-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Characters in Play</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {poolCharacters.map(character => (
              <div
                key={character.id}
                onClick={() => handleCardClick(character.id)}
                className={`p-4 rounded-lg transition-all cursor-pointer ${
                  eliminated[character.id]
                    ? 'opacity-50 bg-gray-800'
                    : isGuessing
                      ? 'bg-yellow-600/20 hover:bg-yellow-600/30'
                      : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="aspect-square bg-white/5 rounded-lg mb-2 flex items-center justify-center">
                  {character.imageUrl ? (
                    <Image
                      src={character.imageUrl}
                      alt={character.name}
                      className={`w-full h-full object-cover rounded-lg ${
                        eliminated[character.id] ? 'grayscale' : ''
                      }`}
                      width={96}
                      height={96}
                    />
                  ) : (
                    <span className="text-4xl">
                      {CHARACTER_EMOJIS[character.type as CharacterType]}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-center text-sm">{character.name}</h3>
                <p className="text-xs text-center text-gray-400 capitalize">
                  {character.type.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { roomStore } from '@/utils/roomStore';
import { RealtimeChannel } from '@supabase/supabase-js';
import { characterStore } from '@/utils/characterStore';
import { Character, CHARACTER_EMOJIS, CharacterType } from '@/types/character';
import { PoolCharacter } from '@/types/poolCharacter';
import CharacterPickModal from '@/components/CharacterPickModal';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Session } from '@supabase/supabase-js';

interface PlayerState {
  id: string;
  name: string;
}

interface GameRoomProps {
  params: Promise<{
    code: string;
  }>;
}

interface PlayerPickState {
  id: string;
  name: string;
  characterId?: string;
  isReady: boolean;
}

export default function GameRoom({ params }: GameRoomProps) {
  const router = useRouter();
  const { code } = use(params);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showCharacterPool, setShowCharacterPool] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [poolCharacters, setPoolCharacters] = useState<PoolCharacter[]>([]);
  const hasJoined = useRef(false);
  const isUnmounting = useRef(false);
  const [showPickModal, setShowPickModal] = useState(false);
  const [playerPicks, setPlayerPicks] = useState<PlayerPickState[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session?.user?.user_metadata?.username) {
        router.replace('/');
        return;
      }
      setNickname(session.user.user_metadata.username);
      setUserId(session.user.id);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session?.user?.user_metadata?.username) {
        router.replace('/');
        return;
      }
      setNickname(session.user.user_metadata.username);
      setUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  useEffect(() => {
    const loadCharacters = async () => {
      await characterStore.loadCharacters();
      setCharacters(characterStore.getCharacters());
    };
    loadCharacters();
  }, []);

  useEffect(() => {
    const loadPool = async () => {
      const pool = await roomStore.getCharacterPool(code);
      setPoolCharacters(pool);
    };

    const subscription = roomStore.subscribeToCharacterPool(code, pool => {
      setPoolCharacters(pool);
    });

    loadPool();

    return () => {
      subscription.unsubscribe();
    };
  }, [code]);

  useEffect(() => {
    if (!session?.user?.user_metadata?.username) return;

    let subscription: RealtimeChannel;

    const initializeRoom = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if room exists
        const exists = await roomStore.roomExists(code);
        if (!exists) {
          setError('Room not found');
          router.replace('/');
          return;
        }

        // Get initial room state
        const room = await roomStore.getRoom(code);
        if (room) {
          setPlayers(room.players || []);

          // Show character pick modal if game is started
          if (room.is_game_started && !showPickModal) {
            setShowPickModal(true);
            setPlayerPicks(
              room.players.map(p => ({
                id: p.id,
                name: p.name,
                characterId: undefined,
                isReady: false,
              }))
            );
          }

          // Check if we're already in the room
          hasJoined.current = room.players?.some(p => p.id === userId) || false;

          // If not in room, join
          if (!hasJoined.current) {
            const joined = await roomStore.joinRoom(code, userId, nickname);
            if (joined) {
              hasJoined.current = true;
            } else {
              setError('Failed to join room');
              return;
            }
          }
        }

        // Subscribe to room changes
        subscription = roomStore.subscribeToRoom(code, updatedRoom => {
          if (!updatedRoom) {
            setError('Room was deleted');
            router.replace('/');
            return;
          }

          setPlayers(updatedRoom.players || []);

          // Show character pick modal if game is started
          if (updatedRoom.is_game_started) {
            if (!showPickModal) {
              setShowPickModal(true);
              setPlayerPicks(
                updatedRoom.players.map(p => ({
                  id: p.id,
                  name: p.name,
                  characterId: undefined,
                  isReady: false,
                }))
              );
            }

            // Update player picks from the room state
            if (updatedRoom.player_picks_state) {
              setPlayerPicks(
                updatedRoom.players.map(p => ({
                  id: p.id,
                  name: p.name,
                  characterId: updatedRoom.player_picks?.[p.id],
                  isReady: updatedRoom.player_picks_state?.[p.id]?.isReady || false,
                }))
              );
            }
          }

          // If we're not in the players list anymore, redirect to home
          if (!updatedRoom.players?.some(p => p.id === userId)) {
            router.replace('/');
          }
        });
      } catch (error) {
        console.error('[GameRoom] Error initializing room:', error);
        setError('Failed to initialize room');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRoom();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [code, router, nickname, showPickModal, session?.user?.user_metadata?.username, userId]);

  const handleExit = async () => {
    if (userId && hasJoined.current) {
      isUnmounting.current = true;
      await roomStore.leaveRoom(code, userId);
      hasJoined.current = false;
    }
    router.push('/');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCharacter = async (character: Character) => {
    if (!nickname) return;
    await roomStore.addCharacterToPool(code, character.id, nickname);
  };

  const handleRemoveCharacter = async (characterId: string) => {
    await roomStore.removeCharacterFromPool(code, characterId);
  };

  // Check if game can start
  const canStartGame = players.length === 2 && poolCharacters.length >= 2;

  const handleStartGame = async () => {
    if (!canStartGame) return;
    await roomStore.startGame(code);
  };

  // Show character pick modal when game starts
  useEffect(() => {
    const subscription = roomStore.subscribeToRoom(code, room => {
      if (!room) {
        setError('Room was deleted');
        router.replace('/');
        return;
      }

      setPlayers(room.players || []);

      // Initialize player picks when game starts
      if (room.is_game_started && !showPickModal) {
        setShowPickModal(true);
        setPlayerPicks(
          room.players.map(p => ({
            id: p.id,
            name: p.name,
            characterId: undefined,
            isReady: false,
          }))
        );
      }

      // If we're not in the players list anymore, redirect to home
      if (!room.players?.some(p => p.id === userId)) {
        router.replace('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [code, router, showPickModal, userId]);

  const handleCharacterPick = async (characterId: string) => {
    if (!userId) return;
    await roomStore.pickCharacter(code, userId, characterId, false);
  };

  const handleReady = async () => {
    if (!userId) return;
    const myPick = playerPicks.find(p => p.id === userId);
    if (myPick?.characterId) {
      await roomStore.pickCharacter(code, userId, myPick.characterId, true);
    }
  };

  // Start game when both players are ready
  useEffect(() => {
    if (playerPicks.length === 2 && playerPicks.every(p => p.isReady)) {
      // Save character picks to room and redirect to game
      router.push(`/game/${code}`);
    }
  }, [playerPicks, code, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl">Loading room...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-lg">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
          <h1 className="text-4xl font-bold text-center mb-8">Game Room: {code}</h1>
          <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm">
            <div className="text-center mb-6">
              {players.length < 2 ? (
                <p className="text-xl">Waiting for opponent to join...</p>
              ) : poolCharacters.length < 2 ? (
                <p className="text-xl">Need at least 2 characters in the pool...</p>
              ) : (
                <p className="text-xl text-green-500 font-bold">Ready to start the game!</p>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4 text-center">Players ({players.length}/2)</h2>
              <div className="space-y-4">
                {players.map(player => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {player.name} {player.id === userId && '(You)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {players.length < 2 && (
              <div className="text-center mb-8">
                <p className="text-lg mb-2">Share this code with your friend:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-bold text-xl">{code}</span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setShowCharacterPool(true)}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Manage Character Pool
              </button>
              <button
                onClick={handleStartGame}
                disabled={!canStartGame}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                  canStartGame
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                Start Game
              </button>
              <button
                onClick={handleExit}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Exit Game
              </button>
            </div>

            <div className="text-center mb-6">
              {!canStartGame && (
                <p className="text-sm text-gray-400">
                  {players.length < 2
                    ? 'Waiting for opponent to join...'
                    : poolCharacters.length < 2
                      ? 'Add at least 2 characters to the pool to start'
                      : ''}
                </p>
              )}
            </div>

            <div className="mt-8 p-4 rounded-lg bg-white/5">
              <h2 className="text-lg font-bold mb-4">Selected Characters</h2>
              {poolCharacters.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {poolCharacters.map(character => (
                    <div key={character.id} className="p-4 bg-white/10 rounded-lg relative group">
                      <button
                        onClick={() => handleRemoveCharacter(character.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Remove character"
                      >
                        ✕
                      </button>
                      <div className="aspect-square bg-white/5 rounded-lg mb-2 flex items-center justify-center">
                        {character.imageUrl ? (
                          <Image
                            src={character.imageUrl}
                            alt={character.name}
                            className="w-full h-full object-cover rounded-lg"
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
                      <p className="text-xs text-center text-gray-400">
                        Added by {character.added_by}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  No characters selected yet. Use the Manage Character Pool button to add
                  characters.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Character Pool Modal */}
      {showCharacterPool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Character Pool</h2>
              <button
                onClick={() => setShowCharacterPool(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {characters.map(character => {
                const isInPool = poolCharacters.some(pc => pc.id === character.id);
                return (
                  <div
                    key={character.id}
                    onClick={() => !isInPool && handleAddCharacter(character)}
                    className={`p-4 bg-white/10 rounded-lg transition-colors ${
                      isInPool
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-white/20 cursor-pointer'
                    }`}
                  >
                    <div className="aspect-square bg-white/5 rounded-lg mb-2 flex items-center justify-center">
                      {character.imageUrl ? (
                        <Image
                          src={character.imageUrl}
                          alt={character.name}
                          className="w-full h-full object-cover rounded-lg"
                          width={96}
                          height={96}
                        />
                      ) : (
                        <span className="text-4xl">
                          {CHARACTER_EMOJIS[character.type as CharacterType]}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-center">{character.name}</h3>
                    <p className="text-sm text-center text-gray-400 capitalize">
                      {character.type.replace('_', ' ')}
                    </p>
                  </div>
                );
              })}
            </div>

            {characters.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No characters available. Create some characters in the admin panel first.
              </div>
            )}
          </div>
        </div>
      )}

      <CharacterPickModal
        isOpen={showPickModal}
        poolCharacters={poolCharacters}
        onPick={handleCharacterPick}
        onReady={handleReady}
        playerId={userId}
        playerName={nickname}
        players={playerPicks}
      />
    </>
  );
}

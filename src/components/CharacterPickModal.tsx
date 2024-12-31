import { CHARACTER_EMOJIS, CharacterType } from '@/types/character';
import { PoolCharacter } from '@/types/poolCharacter';
import Image from 'next/image';

interface PlayerPickState {
  id: string;
  name: string;
  characterId?: string;
  isReady: boolean;
}

interface CharacterPickModalProps {
  isOpen: boolean;
  poolCharacters: PoolCharacter[];
  onPick: (characterId: string) => void;
  onReady: () => void;
  playerId: string;
  playerName: string;
  players: PlayerPickState[];
}

export default function CharacterPickModal({
  isOpen,
  poolCharacters,
  onPick,
  onReady,
  playerId,
  playerName,
  players,
}: CharacterPickModalProps) {
  if (!isOpen) return null;

  const myState = players.find(p => p.id === playerId);
  const canReady = !!myState?.characterId && !myState.isReady;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg max-w-4xl w-full">
        {/* Player Status Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Player Status</h2>
          <div className="grid grid-cols-2 gap-4">
            {players.map(player => (
              <div key={player.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-lg">
                    {player.name} {player.id === playerId && '(You)'}
                  </span>
                  <span
                    className={`text-sm ${
                      player.isReady
                        ? 'text-green-500'
                        : player.characterId
                          ? 'text-yellow-500'
                          : 'text-gray-400'
                    }`}
                  >
                    {player.isReady
                      ? 'Ready!'
                      : player.characterId
                        ? 'Selected character'
                        : 'Selecting...'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Character Selection Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">
            {playerName}, pick your character!
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {poolCharacters.map(character => (
              <div
                key={character.id}
                onClick={() => !myState?.isReady && onPick(character.id)}
                className={`p-4 bg-white/10 rounded-lg transition-colors ${
                  myState?.characterId === character.id
                    ? 'ring-2 ring-green-500'
                    : myState?.isReady
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
              </div>
            ))}
          </div>

          {/* Ready Button */}
          <div className="flex justify-center">
            <button
              onClick={onReady}
              disabled={!canReady}
              className={`px-6 py-3 text-lg rounded-lg transition-colors ${
                canReady
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              Ready!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

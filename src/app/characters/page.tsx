'use client';

import { useEffect, useState } from 'react';
import { Character, NewCharacter, CHARACTER_EMOJIS } from '@/types/character';
import { characterStore } from '@/utils/characterStore';
import AddCharacterModal from '@/components/AddCharacterModal';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showOnlyMyCharacters, setShowOnlyMyCharacters] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  // Filter characters based on search query, type, and ownership
  const filteredCharacters = characters.filter(character => {
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || character.type === selectedType;
    const matchesOwnership = !showOnlyMyCharacters || character.createdBy === session?.user?.id;
    return matchesSearch && matchesType && matchesOwnership;
  });

  // Get unique character types for the filter dropdown
  const characterTypes = ['all', ...Array.from(new Set(characters.map(char => char.type)))];

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.replace('/');
        return;
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.replace('/');
        return;
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  useEffect(() => {
    if (session) {
      loadCharacters();
    }
  }, [session]);

  const loadCharacters = async () => {
    setIsLoading(true);
    await characterStore.loadCharacters();
    setCharacters(characterStore.getCharacters());
    setIsLoading(false);
  };

  const handleAddCharacter = async (newCharacter: Omit<NewCharacter, 'createdBy'>) => {
    if (!session?.user?.id) return;

    const result = await characterStore.addCharacter({
      ...newCharacter,
      createdBy: session.user.id,
    });

    if (result.error) {
      alert(result.error);
    } else if (result.character) {
      await loadCharacters();
    }
  };

  const handleDeleteCharacter = async (id: string, createdBy: string) => {
    if (!session?.user?.id) return;

    // Only allow deletion if the user created the character
    if (createdBy !== session.user.id) {
      alert('You can only delete characters that you created.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this character?')) {
      const success = await characterStore.deleteCharacter(id);
      if (success) {
        await loadCharacters();
      }
    }
  };

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <p className="text-lg">Please sign in to manage characters.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex min-h-screen flex-col items-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold">Manage Characters</h1>
              <p className="text-sm text-gray-400 mt-2">
                {characterStore.getCharacterCountForUser(session.user.id)}/20 characters created by
                you
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={characterStore.getCharacterCountForUser(session.user.id) >= 20}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Character
              </button>
            </div>
          </div>

          {/* Filter controls */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {characterTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all'
                      ? 'All Types'
                      : type
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMyCharacters}
                  onChange={e => setShowOnlyMyCharacters(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/5 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium">Show only my characters</span>
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading characters...</div>
          ) : filteredCharacters.length === 0 ? (
            <div className="bg-white/5 p-6 rounded-lg shadow-lg text-center">
              <p className="text-lg mb-4">
                {characters.length === 0
                  ? 'No characters added yet.'
                  : 'No characters match your search criteria.'}
              </p>
              <p className="text-gray-400">
                {characters.length === 0
                  ? 'Click the "Add Character" button to create your first character!'
                  : 'Try adjusting your filters to see more characters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCharacters.map(character => (
                <div key={character.id} className="bg-white/5 p-6 rounded-lg shadow-lg">
                  <div className="relative aspect-square mb-4 bg-gray-700 rounded-lg overflow-hidden">
                    {character.imageUrl ? (
                      <Image
                        src={character.imageUrl}
                        alt={character.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl" role="img" aria-label={character.type}>
                          {CHARACTER_EMOJIS[character.type]}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{character.name}</h3>
                  <p className="text-gray-400 mb-4">
                    Type:{' '}
                    {character.type
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </p>
                  {character.createdBy === session.user.id && (
                    <button
                      onClick={() => handleDeleteCharacter(character.id, character.createdBy)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <AddCharacterModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCharacter}
        />
      </div>
    </main>
  );
}

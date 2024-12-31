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
  const supabase = createClientComponentClient();
  const router = useRouter();

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
      setCharacters(characterStore.getCharacters());
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
        setCharacters(characterStore.getCharacters());
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
                {characters.length}/20 characters created
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={characters.length >= 20}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Character
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading characters...</div>
          ) : characters.length === 0 ? (
            <div className="bg-white/5 p-6 rounded-lg shadow-lg text-center">
              <p className="text-lg mb-4">No characters added yet.</p>
              <p className="text-gray-400">
                Click the &quot;Add Character&quot; button to create your first character!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map(character => (
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

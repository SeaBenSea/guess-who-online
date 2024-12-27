import { Character, NewCharacter } from '@/types/character';
import { supabase } from './supabase';

class CharacterStore {
  private characters: Character[] = [];

  async loadCharacters(): Promise<void> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading characters:', error);
      return;
    }

    this.characters = data.map(char => ({
      id: char.id,
      name: char.name,
      type: char.type,
      imageUrl: char.image_url,
      createdAt: new Date(char.created_at).getTime(),
    }));
  }

  async addCharacter(newCharacter: NewCharacter): Promise<Character | null> {
    const { data, error } = await supabase
      .from('characters')
      .insert([
        {
          name: newCharacter.name,
          type: newCharacter.type,
          image_url: newCharacter.imageUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding character:', error);
      return null;
    }

    const character: Character = {
      id: data.id,
      name: data.name,
      type: data.type,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at).getTime(),
    };

    this.characters.unshift(character);
    return character;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const { error } = await supabase.from('characters').delete().eq('id', id);

    if (error) {
      console.error('Error deleting character:', error);
      return false;
    }

    this.characters = this.characters.filter(char => char.id !== id);
    return true;
  }

  getCharacters(): Character[] {
    return [...this.characters];
  }
}

export const characterStore = new CharacterStore();

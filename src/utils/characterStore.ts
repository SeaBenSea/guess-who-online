import { Character, NewCharacter } from '@/types/character';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

class CharacterStore {
  private characters: Character[] = [];
  private supabase = createClientComponentClient();

  async loadCharacters(): Promise<void> {
    const { data, error } = await this.supabase
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
      createdBy: char.created_by,
    }));
  }

  getCharacterCountForUser(userId: string): number {
    return this.characters.filter(char => char.createdBy === userId).length;
  }

  async addCharacter(newCharacter: NewCharacter): Promise<{ character: Character | null; error?: string }> {
    const userCharacterCount = this.getCharacterCountForUser(newCharacter.createdBy);
    
    if (userCharacterCount >= 20) {
      return { character: null, error: 'You have reached the maximum limit of 20 characters.' };
    }

    const { data, error } = await this.supabase
      .from('characters')
      .insert([
        {
          name: newCharacter.name,
          type: newCharacter.type,
          image_url: newCharacter.imageUrl,
          created_by: newCharacter.createdBy,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding character:', error);
      if (error.message.includes('characters_check')) {
        return { character: null, error: 'You have reached the maximum limit of 20 characters.' };
      }
      return { character: null, error: 'Failed to add character.' };
    }

    const character: Character = {
      id: data.id,
      name: data.name,
      type: data.type,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at).getTime(),
      createdBy: data.created_by,
    };

    this.characters.unshift(character);
    return { character };
  }

  getCharacters(): Character[] {
    return this.characters;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('characters').delete().eq('id', id);

    if (error) {
      console.error('Error deleting character:', error);
      return false;
    }

    this.characters = this.characters.filter(char => char.id !== id);
    return true;
  }
}

export const characterStore = new CharacterStore();

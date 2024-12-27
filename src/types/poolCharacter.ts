import { Character } from './character';

export interface PoolCharacter extends Character {
  added_by: string;
  added_at: Date;
}

export type CharacterType =
  | 'human_male'
  | 'human_female'
  | 'dog'
  | 'cat'
  | 'bird'
  | 'fish'
  | 'robot'
  | 'alien'
  | 'monster'
  | 'superhero'
  | 'villain'
  | 'wizard'
  | 'dragon'
  | 'unicorn'
  | 'other';

export const CHARACTER_EMOJIS: Record<CharacterType, string> = {
  human_male: '👨',
  human_female: '👩',
  dog: '🐕',
  cat: '🐱',
  bird: '🦜',
  fish: '🐠',
  robot: '🤖',
  alien: '👽',
  monster: '👾',
  superhero: '🦸',
  villain: '🦹',
  wizard: '🧙',
  dragon: '🐲',
  unicorn: '🦄',
  other: '❓',
};

export interface Character {
  id: string;
  name: string;
  type: CharacterType;
  imageUrl?: string;
  createdAt: number;
  createdBy: string;
}

export interface NewCharacter {
  name: string;
  type: CharacterType;
  imageUrl?: string;
  createdBy: string;
}

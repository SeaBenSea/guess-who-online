import { supabase } from './supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Character } from '@/types/character';
import { PoolCharacter } from '@/types/poolCharacter';

interface PlayerState {
  name: string;
  isReady?: boolean;
}

interface Room {
  id: string;
  created_at: Date;
  players: PlayerState[];
  is_game_started: boolean;
  character_pool?: PoolCharacter[];
  player_picks?: { [key: string]: string }; // nickname -> characterId
  player_picks_state?: { [key: string]: { characterId?: string; isReady: boolean } }; // nickname -> pick state
  player_guesses?: { [key: string]: { characterId: string; timestamp: string }[] }; // nickname -> guesses
  winner?: string; // nickname of winner
}

class RoomStore {
  private debug(method: string, ...args: unknown[]) {
    console.log(`[RoomStore][${method}]`, ...args);
  }

  private rooms: Room[] = [];

  async loadRooms(): Promise<void> {
    this.debug('loadRooms', 'Loading all rooms');
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.debug('loadRooms:error', error);
      throw error;
    }

    this.rooms = data.map(room => ({
      ...room,
      created_at: new Date(room.created_at),
    }));
    this.debug('loadRooms:success', { count: this.rooms.length });
  }

  getRooms(): Room[] {
    return [...this.rooms];
  }

  async createRoom(code: string): Promise<boolean> {
    this.debug('createRoom', { code });
    const { error } = await supabase.from('rooms').insert([
      {
        id: code,
        players: [],
        is_game_started: false,
      },
    ]);

    if (error) {
      this.debug('createRoom:error', error);
      return false;
    }
    return true;
  }

  async roomExists(code: string): Promise<boolean> {
    this.debug('roomExists:check', { code });
    const { data, error } = await supabase.from('rooms').select('id').eq('id', code).single();

    const exists = !error && !!data;
    this.debug('roomExists:result', { code, exists, error: error?.message });
    return exists;
  }

  async canJoinRoom(
    code: string,
    nickname: string
  ): Promise<{ canJoin: boolean; reason?: string }> {
    this.debug('canJoinRoom:check', { code, nickname });
    const { data, error } = await supabase
      .from('rooms')
      .select('players, is_game_started')
      .eq('id', code)
      .single();

    if (error || !data) {
      this.debug('canJoinRoom:error', { error: error?.message });
      return { canJoin: false, reason: 'Room not found' };
    }

    if (data.is_game_started) {
      this.debug('canJoinRoom:gameStarted', { code });
      return { canJoin: false, reason: 'Game has already started' };
    }

    if (data.players.length >= 2) {
      this.debug('canJoinRoom:roomFull', { code, currentPlayers: data.players });
      return { canJoin: false, reason: 'Room is full' };
    }

    // Check if nickname is already taken in this room
    const isNicknameTaken = data.players.some(
      (p: PlayerState) => p.name.toLowerCase() === nickname.toLowerCase()
    );

    if (isNicknameTaken) {
      this.debug('canJoinRoom:nicknameTaken', { code, nickname, currentPlayers: data.players });
      return { canJoin: false, reason: 'Nickname is already taken in this room' };
    }

    this.debug('canJoinRoom:success', { code, nickname });
    return { canJoin: true };
  }

  async joinRoom(code: string, nickname: string): Promise<boolean> {
    this.debug('joinRoom:start', { code, nickname });

    // First, get the current room state
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('players')
      .eq('id', code)
      .single();

    if (fetchError || !room) {
      this.debug('joinRoom:fetchError', { error: fetchError?.message });
      return false;
    }

    // Check if player can join
    const { canJoin, reason } = await this.canJoinRoom(code, nickname);
    if (!canJoin) {
      this.debug('joinRoom:cannotJoin', { reason });
      return false;
    }

    // Update the room with the new player
    const updatedPlayers = [...room.players, { name: nickname }];
    this.debug('joinRoom:updating', {
      code,
      nickname,
      currentPlayers: room.players,
      updatedPlayers,
    });

    const { error: updateError } = await supabase
      .from('rooms')
      .update({ players: updatedPlayers })
      .eq('id', code);

    if (updateError) {
      this.debug('joinRoom:updateError', { error: updateError.message });
      return false;
    }

    this.debug('joinRoom:success', { code, nickname, updatedPlayers });
    return true;
  }

  async leaveRoom(code: string, nickname: string): Promise<boolean> {
    this.debug('leaveRoom:start', { code, nickname });

    try {
      // Get current room state
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('players, is_game_started, winner')
        .eq('id', code)
        .single();

      if (fetchError || !room) {
        this.debug('leaveRoom:fetchError', { error: fetchError?.message });
        return false;
      }

      this.debug('leaveRoom:currentState', {
        code,
        nickname,
        currentPlayers: room.players,
      });

      // If game is in progress and no winner yet, set opponent as winner
      if (room.is_game_started && !room.winner) {
        const opponent = room.players.find((p: PlayerState) => p.name !== nickname);
        if (opponent) {
          await supabase.from('rooms').update({ winner: opponent.name }).eq('id', code);

          // Update leaderboard for forfeit
          await this.updateLeaderboard(opponent.name, nickname);
        }
      }

      // Remove the player
      const updatedPlayers = room.players.filter((p: PlayerState) => p.name !== nickname);
      this.debug('leaveRoom:afterFilter', { updatedPlayers });

      // If room is empty, delete it
      if (updatedPlayers.length === 0) {
        this.debug('leaveRoom:deletingEmptyRoom', { code });

        // Try to delete the room
        const { error: deleteError } = await supabase.from('rooms').delete().eq('id', code);

        if (deleteError) {
          this.debug('leaveRoom:deleteError', { error: deleteError.message });
          return false;
        }

        this.debug('leaveRoom:success:deleted', { code });
        return true;
      }

      // Update room with remaining players
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ players: updatedPlayers })
        .eq('id', code);

      if (updateError) {
        this.debug('leaveRoom:updateError', { error: updateError.message });
        return false;
      }

      this.debug('leaveRoom:success', { code, nickname, remainingPlayers: updatedPlayers });
      return true;
    } catch (error) {
      this.debug('leaveRoom:error', { error });
      return false;
    }
  }

  async toggleReady(code: string, nickname: string): Promise<boolean> {
    this.debug('toggleReady:start', { code, nickname });

    // Get current room state
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('players')
      .eq('id', code)
      .single();

    if (fetchError || !room) {
      this.debug('toggleReady:fetchError', { error: fetchError?.message });
      return false;
    }

    // Update player's ready status
    const updatedPlayers = room.players.map((p: PlayerState) =>
      p.name === nickname ? { ...p, isReady: !p.isReady } : p
    );

    this.debug('toggleReady:updating', {
      code,
      nickname,
      currentPlayers: room.players,
      updatedPlayers,
    });

    // Update room
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ players: updatedPlayers })
      .eq('id', code);

    if (updateError) {
      this.debug('toggleReady:updateError', { error: updateError.message });
      return false;
    }

    this.debug('toggleReady:success', { code, nickname, updatedPlayers });
    return true;
  }

  async getRoom(code: string): Promise<Room | null> {
    this.debug('getRoom:start', { code });
    const { data, error } = await supabase.from('rooms').select('*').eq('id', code).single();

    if (error || !data) {
      this.debug('getRoom:error', { error: error?.message });
      return null;
    }

    const room = {
      ...data,
      created_at: new Date(data.created_at),
    };

    this.debug('getRoom:success', { code, room });
    return room;
  }

  async cleanup(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    await supabase.from('rooms').delete().lt('created_at', oneHourAgo.toISOString());
  }

  subscribeToRoom(code: string, callback: (room: Room | null) => void): RealtimeChannel {
    this.debug('subscribeToRoom', { code });
    return supabase
      .channel(`room:${code}`)
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${code}`,
        },
        (payload: RealtimePostgresChangesPayload<Room>) => {
          this.debug('subscribeToRoom:update', {
            code,
            event: payload.eventType,
            hasPayload: !!payload.new,
            newState: payload.new,
          });

          // Handle DELETE events
          if (payload.eventType === 'DELETE') {
            callback(null);
            return;
          }

          // Handle other events
          if (payload.new) {
            callback({
              ...payload.new,
              created_at: new Date(payload.new.created_at),
            });
          }
        }
      )
      .subscribe();
  }

  async getCharacterPool(code: string): Promise<PoolCharacter[]> {
    this.debug('getCharacterPool', { code });
    const { data, error } = await supabase
      .from('room_character_pools')
      .select(
        `
        character_id,
        added_by,
        added_at,
        characters (
          id,
          name,
          type,
          image_url,
          created_at
        )
      `
      )
      .eq('room_id', code);

    if (error) {
      this.debug('getCharacterPool:error', error);
      return [];
    }

    return (
      data as unknown as Array<{
        character_id: string;
        added_by: string;
        added_at: string;
        characters: {
          id: string;
          name: string;
          type: string;
          image_url: string | null;
          created_at: string;
        };
      }>
    ).map(item => ({
      id: item.characters.id,
      name: item.characters.name,
      type: item.characters.type as Character['type'],
      imageUrl: item.characters.image_url || undefined,
      createdAt: new Date(item.characters.created_at).getTime(),
      added_by: item.added_by,
      added_at: new Date(item.added_at),
    }));
  }

  subscribeToCharacterPool(
    code: string,
    callback: (characters: PoolCharacter[]) => void
  ): RealtimeChannel {
    this.debug('subscribeToCharacterPool', { code });
    const channel = supabase
      .channel(`room_pool:${code}`)
      .on(
        'postgres_changes' as const,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_character_pools',
          filter: `room_id=eq.${code}`,
        },
        async () => {
          const pool = await this.getCharacterPool(code);
          callback(pool);
        }
      )
      .on(
        'postgres_changes' as const,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_character_pools',
          filter: `room_id=eq.${code}`,
        },
        async () => {
          const pool = await this.getCharacterPool(code);
          callback(pool);
        }
      )
      .subscribe();

    return channel;
  }

  // Test function to verify connection and table access
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test 1: Create a test room
      const testCode = 'TEST123';
      const createResult = await this.createRoom(testCode);
      if (!createResult) {
        return { success: false, message: 'Failed to create test room' };
      }

      // Test 2: Fetch the room
      const room = await this.getRoom(testCode);
      if (!room) {
        return { success: false, message: 'Failed to fetch test room' };
      }

      const { data } = await supabase.from('rooms').select('id').eq('id', testCode);
      console.log(data); // Should confirm if a row exists.

      // Test 3: Clean up the test room
      await supabase.from('rooms').delete().eq('id', testCode);

      // check if the room was deleted
      const { data: deletedRoom } = await supabase.from('rooms').select('id').eq('id', testCode);
      console.log(deletedRoom); // Should confirm if a row exists.

      return {
        success: true,
        message: 'Successfully connected to Supabase and tested room operations!',
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async addCharacterToPool(code: string, characterId: string, addedBy: string): Promise<boolean> {
    this.debug('addCharacterToPool', { code, characterId, addedBy });
    const { error } = await supabase.from('room_character_pools').insert([
      {
        room_id: code,
        character_id: characterId,
        added_by: addedBy,
      },
    ]);

    if (error) {
      this.debug('addCharacterToPool:error', error);
      return false;
    }
    return true;
  }

  async removeCharacterFromPool(code: string, characterId: string): Promise<boolean> {
    this.debug('removeCharacterFromPool', { code, characterId });
    const { error } = await supabase
      .from('room_character_pools')
      .delete()
      .eq('room_id', code)
      .eq('character_id', characterId);

    if (error) {
      this.debug('removeCharacterFromPool:error', error);
      return false;
    }
    return true;
  }

  async pickCharacter(
    code: string,
    nickname: string,
    characterId: string,
    isReady: boolean = false
  ): Promise<boolean> {
    this.debug('pickCharacter', { code, nickname, characterId, isReady });

    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('player_picks, player_picks_state')
      .eq('id', code)
      .single();

    if (fetchError) {
      this.debug('pickCharacter:fetchError', fetchError);
      return false;
    }

    const currentPicks = room?.player_picks || {};
    const currentPickStates = room?.player_picks_state || {};

    const updatedPicks = { ...currentPicks };
    if (characterId) {
      updatedPicks[nickname] = characterId;
    }

    const updatedPickStates = {
      ...currentPickStates,
      [nickname]: {
        characterId,
        isReady,
      },
    };

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        player_picks: updatedPicks,
        player_picks_state: updatedPickStates,
      })
      .eq('id', code);

    if (updateError) {
      this.debug('pickCharacter:updateError', updateError);
      return false;
    }

    return true;
  }

  async startGame(code: string): Promise<boolean> {
    this.debug('startGame', { code });
    const { error } = await supabase.from('rooms').update({ is_game_started: true }).eq('id', code);

    if (error) {
      this.debug('startGame:error', error);
      return false;
    }
    return true;
  }

  async pickCharacters(code: string, picks: { [key: string]: string }): Promise<boolean> {
    this.debug('pickCharacters', { code, picks });
    const { error } = await supabase
      .from('rooms')
      .update({
        player_picks: picks,
        is_game_started: true,
      })
      .eq('id', code);

    if (error) {
      this.debug('pickCharacters:error', error);
      return false;
    }
    return true;
  }

  async getGuessCount(code: string, nickname: string): Promise<number> {
    this.debug('getGuessCount', { code, nickname });

    const { data: room, error } = await supabase
      .from('rooms')
      .select('player_guesses')
      .eq('id', code)
      .single();

    if (error) {
      this.debug('getGuessCount:error', error);
      return 0;
    }

    const playerGuesses = room?.player_guesses?.[nickname] || [];
    return playerGuesses.length;
  }

  async getWinner(code: string): Promise<string | null> {
    this.debug('getWinner', { code });

    const { data: room, error } = await supabase
      .from('rooms')
      .select('winner')
      .eq('id', code)
      .single();

    if (error) {
      this.debug('getWinner:error', error);
      return null;
    }

    return room?.winner || null;
  }

  private async updateLeaderboard(winner: string, loser: string) {
    this.debug('updateLeaderboard', { winner, loser });

    // Get current stats for winner
    const { data: existingWinner } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('nickname', winner)
      .single();

    // Get current stats for loser
    const { data: existingLoser } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('nickname', loser)
      .single();

    // Update winner stats
    const { error: winnerError } = await supabase.from('leaderboard').upsert({
      nickname: winner,
      games_played: (existingWinner?.games_played || 0) + 1,
      wins: (existingWinner?.wins || 0) + 1,
    });

    if (winnerError) {
      this.debug('updateLeaderboard:winnerError', winnerError);
      return false;
    }

    // Update loser stats
    const { error: loserError } = await supabase.from('leaderboard').upsert({
      nickname: loser,
      games_played: (existingLoser?.games_played || 0) + 1,
      wins: existingLoser?.wins || 0,
    });

    if (loserError) {
      this.debug('updateLeaderboard:loserError', loserError);
      return false;
    }

    return true;
  }

  async makeGuess(code: string, nickname: string, characterId: string): Promise<boolean> {
    this.debug('makeGuess', { code, nickname, characterId });

    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('player_guesses, player_picks')
      .eq('id', code)
      .single();

    if (fetchError) {
      this.debug('makeGuess:fetchError', fetchError);
      return false;
    }

    // Get current guesses
    const currentGuesses = room?.player_guesses || {};
    const playerGuesses = currentGuesses[nickname] || [];

    // Check if player has already made 2 guesses
    if (playerGuesses.length >= 2) {
      this.debug('makeGuess:tooManyGuesses', { nickname, guessCount: playerGuesses.length });
      return false;
    }

    // Add new guess
    const newGuess = {
      characterId,
      timestamp: new Date().toISOString(),
    };

    const updatedGuesses = {
      ...currentGuesses,
      [nickname]: [...playerGuesses, newGuess],
    };

    // Check if this guess is correct (wins the game)
    const opponentNickname = Object.keys(room.player_picks).find(n => n !== nickname);
    if (opponentNickname && room.player_picks[opponentNickname] === characterId) {
      // Player won! Update winner and leaderboard
      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          player_guesses: updatedGuesses,
          winner: nickname,
        })
        .eq('id', code);

      if (updateError) {
        this.debug('makeGuess:updateError', updateError);
        return false;
      }

      // Update leaderboard
      await this.updateLeaderboard(nickname, opponentNickname);
      return true;
    }

    // If this was their second wrong guess, they lose
    if (opponentNickname && playerGuesses.length === 1) {
      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          player_guesses: updatedGuesses,
          winner: opponentNickname, // Set opponent as winner
        })
        .eq('id', code);

      if (updateError) {
        this.debug('makeGuess:updateError', updateError);
        return false;
      }

      // Update leaderboard
      await this.updateLeaderboard(opponentNickname, nickname);
      return true;
    }

    // Update guesses only
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ player_guesses: updatedGuesses })
      .eq('id', code);

    if (updateError) {
      this.debug('makeGuess:updateError', updateError);
      return false;
    }

    return true;
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    this.debug('deleteRoom:start', { roomId });

    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);

      if (error) {
        this.debug('deleteRoom:error', { error: error.message });
        return false;
      }

      this.debug('deleteRoom:success', { roomId });
      return true;
    } catch (error) {
      this.debug('deleteRoom:error', { error });
      return false;
    }
  }
}

export const roomStore = new RoomStore();


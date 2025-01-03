import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type LeaderboardUpdateRequest = {
  winnerId: string;
  loserId: string;
  roomId: string;
};

export async function POST(request: Request) {
  try {
    const { winnerId, loserId, roomId } = (await request.json()) as LeaderboardUpdateRequest;

    // Validate input
    if (!winnerId || !loserId || !roomId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get supabase client with service role
    const supabase = createRouteHandlerClient(
      { cookies },
      {
        options: {
          db: { schema: 'public' },
        },
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    );

    // Get current user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the room exists and the game is actually finished
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('winner, player_guesses, player_picks')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify that:
    // 1. The winner matches the room's winner
    // 2. Both users were part of the game (check player_picks)
    // 3. The game was actually played (check guesses)
    if (
      room.winner !== winnerId ||
      !room.player_picks?.[winnerId] ||
      !room.player_picks?.[loserId] ||
      !room.player_guesses
    ) {
      return NextResponse.json({ error: 'Invalid game result' }, { status: 400 });
    }

    // Call the database function to update leaderboard
    const { error } = await supabase.rpc('update_leaderboard', {
      winner_id: winnerId,
      loser_id: loserId,
      room_id: roomId,
    });

    if (error) {
      console.error('Error updating leaderboard:', error);
      return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in leaderboard update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

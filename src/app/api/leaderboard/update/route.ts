import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { winnerId, loserId } = await request.json();

    // Validate input
    if (!winnerId || !loserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get supabase client with service role
    const supabase = createRouteHandlerClient(
      { cookies },
      {
        options: {
          db: { schema: 'public' },
        },
      }
    );

    // Call the database function to update leaderboard
    const { error } = await supabase.rpc('update_leaderboard', {
      winner_id: winnerId,
      loser_id: loserId,
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

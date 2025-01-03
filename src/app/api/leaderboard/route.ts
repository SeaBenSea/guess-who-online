import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    console.log('Initializing Supabase client...');
    const supabase = createRouteHandlerClient(
      {
        cookies: () => cookieStore,
      },
      {
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        options: {
          db: { schema: 'public' },
        },
      }
    );

    console.log('Fetching leaderboard data...');
    // Get leaderboard data
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard')
      .select('*')
      .order('wins', { ascending: false });

    if (leaderboardError) {
      console.error('Error fetching leaderboard:', leaderboardError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard', details: leaderboardError },
        { status: 500 }
      );
    }

    console.log('Fetching user data...');
    // Get user metadata
    const {
      data: { users },
      error: usersError,
    } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: usersError },
        { status: 500 }
      );
    }

    console.log('Combining data...');
    // Combine leaderboard data with user metadata
    const combinedData = leaderboardData.map(entry => {
      const user = users.find(u => u.id === entry.user_id);
      return {
        ...entry,
        user_metadata: user?.user_metadata,
      };
    });

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error('Unexpected error in leaderboard route:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

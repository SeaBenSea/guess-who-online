import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { characterId } = await request.json();
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient(
      { cookies: () => cookieStore },
      {
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    );

    // First check if the requesting user is an admin
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.user_metadata?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Delete the character using a function that bypasses RLS
    const { error } = await supabase.rpc('admin_delete_character', {
      character_id: characterId
    });

    if (error) {
      console.error('Error deleting character:', error);
      return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in character deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

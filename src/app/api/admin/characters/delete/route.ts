import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/utils/adminAuth';

export async function POST(request: Request) {
  try {
    const { characterId } = await request.json();

    const result = await verifyAdminAccess();

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase } = result;

    // Delete the character using a function that bypasses RLS
    const { error } = await supabase.rpc('admin_delete_character', {
      character_id: characterId,
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

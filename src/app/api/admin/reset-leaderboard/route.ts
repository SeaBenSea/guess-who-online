import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/utils/adminAuth';
import { logAdminAction } from '@/utils/adminLogger';

export async function POST() {
  try {
    const result = await verifyAdminAccess();

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase } = result;

    // Reset the leaderboard by deleting all records
    const { error } = await supabase
      .from('leaderboard')
      .delete()
      .gt('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('Error resetting leaderboard:', error);
      return NextResponse.json({ error: 'Failed to reset leaderboard' }, { status: 500 });
    }

    await logAdminAction({
      supabaseClient: supabase,
      userId: result.user.id,
      actionType: 'reset_leaderboard',
      targetId: 'leaderboard',
      targetType: 'leaderboard',
      details: {
        timestamp: new Date().toISOString(),
        performed_by_email: result.user.email || 'unknown',
      },
    });

    return NextResponse.json({ message: 'Leaderboard reset successfully' });
  } catch (error) {
    console.error('Error in reset-leaderboard route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/utils/adminAuth';
import { logAdminAction } from '@/utils/adminLogger';

export async function POST(request: Request) {
  try {
    const { userId, newUsername } = await request.json();

    if (!userId || !newUsername) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await verifyAdminAccess();

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase, user: adminUser } = result;

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) {
      console.error('Error getting user data:', userError);
      return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 });
    }

    const { user_metadata } = userData.user;

    // Update the user's username
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { username: newUsername },
    });

    if (updateError) {
      console.error('Error updating username:', updateError);
      return NextResponse.json({ error: 'Failed to update username' }, { status: 500 });
    }

    await logAdminAction({
      supabaseClient: supabase,
      userId: adminUser.id,
      actionType: 'update_username',
      targetId: userId,
      targetType: 'user',
      details: {
        newUsername,
        oldUsername: user_metadata.username || '',
        performed_by_email: adminUser.email || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ message: 'Username updated successfully' });
  } catch (error) {
    console.error('Error in update-username route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

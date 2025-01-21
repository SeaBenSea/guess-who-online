import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/utils/adminAuth';
import { logAdminAction } from '@/utils/adminLogger';

export async function POST(request: Request) {
  try {
    const { userId, isAuthenticated } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await verifyAdminAccess();

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase, user: adminUser } = result;

    // Get current user data
    const { error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) {
      console.error('Error getting user data:', userError);
      return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 });
    }

    // Update the user's email confirmation status
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: isAuthenticated, // This will set email_confirmed_at to current timestamp if true, or null if false
    });

    if (updateError) {
      console.error('Error updating user authentication:', updateError);
      return NextResponse.json({ error: 'Failed to update user authentication' }, { status: 500 });
    }

    await logAdminAction({
      supabaseClient: supabase,
      userId: adminUser.id,
      actionType: 'user_authentication',
      targetId: userId,
      targetType: 'user',
      details: {
        action: isAuthenticated ? 'confirmed_email' : 'unconfirmed_email',
        performed_by_email: adminUser.email || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ message: 'User email confirmation status updated successfully' });
  } catch (error) {
    console.error('Error in authenticate-user route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

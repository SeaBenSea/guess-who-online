import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/utils/adminAuth';

export async function POST(request: Request) {
  try {
    const { userId, isAdmin } = await request.json();

    const result = await verifyAdminAccess();

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase } = result;

    // Update user's metadata to set admin role
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { is_admin: isAdmin },
    });

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Error in set-role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

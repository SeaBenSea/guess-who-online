import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, isAdmin } = await request.json();
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient(
      { cookies: () => cookieStore },
      {
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with service role to ensure we have the latest metadata
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(session.user.id);

    if (userError || !user) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
    }

    const isAdmin = user.user_metadata?.is_admin === true;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return user data for client-side use
    return NextResponse.json({
      access: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
        lastVerified: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error checking admin access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

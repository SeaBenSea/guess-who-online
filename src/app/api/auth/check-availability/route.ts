import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    }, {
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // Check if email exists and is verified
    const { data: { users }, error: emailError } = await supabase.auth.admin.listUsers();
    if (emailError) {
      return NextResponse.json({ error: 'Failed to check email' }, { status: 500 });
    }

    const existingUser = users?.find(user => 
      user.email === email && user.email_confirmed_at !== null
    );  

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

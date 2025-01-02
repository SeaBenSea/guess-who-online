import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/utils/adminAuth';

export async function GET() {
  try {
    const result = await verifyAdminAccess();

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase } = result;

    // Get all users
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in users list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

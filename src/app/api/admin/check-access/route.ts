import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/utils/adminAuth';

export async function GET() {
  try {
    const result = await verifyAdminAccess();

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { user } = result;

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

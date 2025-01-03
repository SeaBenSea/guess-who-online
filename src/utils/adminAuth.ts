import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function verifyAdminAccess() {
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
    return { error: 'Unauthorized', status: 401 };
  }

  // Get user with service role to ensure we have the latest data
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(session.user.id);

  if (userError || !user) {
    return { error: 'Failed to verify access', status: 500 };
  }

  // Verify admin status from user metadata using service role
  const isAdmin = user.user_metadata?.is_admin === true;

  if (!isAdmin) {
    return { error: 'Access denied', status: 403 };
  }

  return { user, supabase };
}

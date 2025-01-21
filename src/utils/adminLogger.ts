import { SupabaseClient } from '@supabase/supabase-js';

export type AdminAction =
  | 'room_deletion'
  | 'admin_role_change'
  | 'character_deletion'
  | 'reset_leaderboard'
  | 'update_username'
  | 'user_authentication';

export type TargetType = 'room' | 'user' | 'character' | 'leaderboard';

interface LogActionParams {
  supabaseClient: SupabaseClient;
  userId: string;
  actionType: AdminAction;
  targetId: string;
  targetType: TargetType;
  details?: Record<string, string | number | boolean | null>;
}

export async function logAdminAction({
  supabaseClient,
  userId,
  actionType,
  targetId,
  targetType,
  details,
}: LogActionParams) {
  const { error } = await supabaseClient.from('admin_logs').insert({
    action_type: actionType,
    performed_by: userId,
    target_id: targetId,
    target_type: targetType,
    details: details || {},
  });

  if (error) {
    console.error('Error logging admin action:', error);
    return { error };
  }

  return { success: true };
}

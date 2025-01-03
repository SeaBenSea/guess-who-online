import { supabase } from '@/utils/supabase'

export type AdminAction = 'room_deletion' | 'admin_role_change' | 'character_deletion'
export type TargetType = 'room' | 'user' | 'character'

interface LogActionParams {
  actionType: AdminAction
  targetId: string
  targetType: TargetType
  details?: Record<string, string | number | boolean | null>
}

export async function logAdminAction({ actionType, targetId, targetType, details }: LogActionParams) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Error getting user:', userError)
    return { error: userError }
  }

  const { error } = await supabase.from('admin_logs').insert({
    action_type: actionType,
    performed_by: user.id,
    target_id: targetId,
    target_type: targetType,
    details: details || {},
  })

  if (error) {
    console.error('Error logging admin action:', error)
    return { error }
  }

  return { success: true }
} 

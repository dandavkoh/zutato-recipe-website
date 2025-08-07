// Server-side auth utilities
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

// Server-side function to get current user
export async function getCurrentUser() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
    firstName: user.user_metadata?.first_name,
    lastName: user.user_metadata?.last_name,
    emailVerified: user.email_confirmed_at !== null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

// Server-side function to require authentication
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
} 
import { createClient } from '@/utils/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

export interface UserSettingsResponse {
  success: boolean;
  error?: string;
  message?: string;
  nickname?: string;
}

export class UserSettingsApi {
  static async getNickname(): Promise<UserSettingsResponse> {
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'Nicht angemeldet' };
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('nickname')
        .eq('user_id', authData.user.id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, nickname: data?.nickname ?? '' };
    } catch {
      return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }

  static async updateNickname(rawNickname: string): Promise<UserSettingsResponse> {
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'Nicht angemeldet' };
      }

      const normalized = rawNickname.trim().toLowerCase();
      if (!normalized) {
        return { success: false, error: 'Accountname kann nicht gelöscht werden.' };
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: authData.user.id, nickname: normalized },
          { onConflict: 'user_id' }
        );

      if (error) {
        const pgError = error as PostgrestError;
        if (
          pgError.code === '23505' ||
          pgError.code === '409' ||
          (pgError.details && pgError.details.toLowerCase().includes('already exists')) ||
          (pgError.message && pgError.message.toLowerCase().includes('duplicate key'))
        ) {
          return { success: false, error: 'Dieser Accountname ist bereits vergeben.' };
        }
        return { success: false, error: pgError.message };
      }

      return { success: true, message: 'Accountname gespeichert.' };
    } catch {
      return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }
}


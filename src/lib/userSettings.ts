import { createClient } from '@/utils/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

export interface UserSettingsResponse {
  success: boolean;
  error?: string;
  message?: string;
  nickname?: string;
}

export interface UserPublicProfileResponse {
  success: boolean;
  error?: string;
  message?: string;
  banner?: string | null;
  avatar_url?: string | null;
  social_links?: {
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
    x?: string | null;
    pinterest?: string | null;
    youtube?: string | null;
    [key: string]: string | null | undefined;
  } | null;
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
        .from('public_user_profile')
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

  static async getUserPublicProfile(): Promise<UserPublicProfileResponse> {
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'Nicht angemeldet' };
      }

      const { data, error } = await supabase
        .from('public_user_profile')
        .select('banner, avatar_url, social_links')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        banner: (data as any)?.banner ?? null,
        avatar_url: (data as any)?.avatar_url ?? null,
        social_links: (data as any)?.social_links ?? null,
      };
    } catch {
      return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }

  static async updateUserPublicProfile(payload: {
    banner?: string | null;
    avatar_url?: string | null;
    social_links?: {
      instagram?: string | null;
      tiktok?: string | null;
      facebook?: string | null;
      x?: string | null;
      pinterest?: string | null;
      youtube?: string | null;
      [key: string]: string | null | undefined;
    } | null;
  }): Promise<UserPublicProfileResponse> {
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'Nicht angemeldet' };
      }

      const updateData: Record<string, any> = {};
      if (typeof payload.banner !== 'undefined') updateData.banner = payload.banner;
      if (typeof payload.avatar_url !== 'undefined') updateData.avatar_url = payload.avatar_url;
      if (typeof payload.social_links !== 'undefined') updateData.social_links = payload.social_links;

      // Important: use UPDATE (not UPSERT). UPSERT attempts INSERT first and fails RLS without an INSERT policy.
      const { data, error } = await supabase
        .from('public_user_profile')
        .update(updateData)
        .eq('user_id', authData.user.id)
        .select('user_id');

      if (error) {
        return { success: false, error: error.message };
      }
      if (!data || data.length === 0) {
        return { success: false, error: 'Öffentliches Profil nicht gefunden. Bitte melde dich ab und wieder an (oder migriere die DB, damit das Profil beim Signup erstellt wird).' };
      }

      return { success: true, message: 'Profil aktualisiert.' };
    } catch {
      return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }

  static async uploadAvatar(file: File): Promise<UserPublicProfileResponse> {
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'Nicht angemeldet' };
      }

      const userId = authData.user.id;
      const path = `avatars/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      const { error: uploadErr } = await supabase.storage.from('public-bucket').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type,
      });
      if (uploadErr) {
        return { success: false, error: uploadErr.message };
      }
      const { data: pub } = supabase.storage.from('public-bucket').getPublicUrl(path);
      const publicUrl = pub?.publicUrl || null;
      if (!publicUrl) {
        return { success: false, error: 'Konnte öffentliche URL nicht ermitteln' };
      }

      const updated = await this.updateUserPublicProfile({ avatar_url: publicUrl });
      if (!updated.success) return updated;
      return { success: true, avatar_url: publicUrl, message: 'Profilbild aktualisiert.' };
    } catch {
      return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  }
  static async getPublicNicknameByUserId(userId: string): Promise<UserSettingsResponse> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('public_user_profile')
        .select('nickname')
        .eq('user_id', userId)
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
        .from('public_user_profile')
        .update({ nickname: normalized })
        .eq('user_id', authData.user.id);

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


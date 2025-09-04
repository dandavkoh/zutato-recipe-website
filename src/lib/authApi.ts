import { createClient } from '@/utils/supabase/client';
import type { AuthError, AuthChangeEvent, Session } from '@supabase/supabase-js';

// Auth API Types
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
  message?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

// Real Supabase Auth API
export class AuthApi {
  // Login
  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const { reportError } = await import('@/utils/reportError');
        reportError(error, { where: 'AuthApi.login' });
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (data.user) {

        
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
          emailVerified: data.user.email_confirmed_at !== null,
          createdAt: data.user.created_at,
          updatedAt: data.user.updated_at,
        };

        return {
          success: true,
          user: authUser
        };
      }

      return {
        success: false,
        error: 'Anmeldung fehlgeschlagen'
      };
    } catch (error) {
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AuthApi.login.unexpected' });
      return {
        success: false,
        error: 'Ein unerwarteter Fehler ist aufgetreten'
      };
    }
  }

  // Register
  static async register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        const { reportError } = await import('@/utils/reportError');
        reportError(error, { where: 'AuthApi.register' });
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      if (data.user) {

        
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
          emailVerified: data.user.email_confirmed_at !== null,
          createdAt: data.user.created_at,
          updatedAt: data.user.updated_at,
        };

        return {
          success: true,
          user: authUser,
          message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.'
        };
      }

      return {
        success: false,
        error: 'Registrierung fehlgeschlagen'
      };
    } catch (error) {
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AuthApi.register.unexpected' });
      return {
        success: false,
        error: 'Ein unerwarteter Fehler ist aufgetreten'
      };
    }
  }

  // Reset Password
  static async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const { reportError } = await import('@/utils/reportError');
        reportError(error, { where: 'AuthApi.resetPassword' });
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      return {
        success: true,
        message: 'Passwort-Reset-E-Mail wurde gesendet. Bitte überprüfen Sie Ihren Posteingang.'
      };
    } catch (error) {
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AuthApi.resetPassword.unexpected' });
      return {
        success: false,
        error: 'Ein unerwarteter Fehler ist aufgetreten'
      };
    }
  }

  // Get current user (for SSR)
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // AuthSessionMissingError is expected for non-authenticated users
      if (error) {
        if (error.message !== 'Auth session missing!') {
          const { reportError } = await import('@/utils/reportError');
          reportError(error, { where: 'AuthApi.getCurrentUser' });
        }
        return null;
      }

      if (user) {
        const authUser: AuthUser = {
          id: user.id,
          email: user.email!,
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          emailVerified: user.email_confirmed_at !== null,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
        return authUser;
      }

      return null;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Auth session missing!') {
        const { reportError } = await import('@/utils/reportError');
        reportError(error, { where: 'AuthApi.getCurrentUser.unexpected' });
      }
      return null;
    }
  }

  // Logout
  static async logout(): Promise<void> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        const { reportError } = await import('@/utils/reportError');
        reportError(error, { where: 'AuthApi.logout' });
      }
      

    } catch (error) {
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AuthApi.logout.unexpected' });
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Auth session missing!') {
        const { reportError } = await import('@/utils/reportError');
        reportError(error, { where: 'AuthApi.isAuthenticated' });
      }
      return false;
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.first_name,
          lastName: session.user.user_metadata?.last_name,
          emailVerified: session.user.email_confirmed_at !== null,
          createdAt: session.user.created_at,
          updatedAt: session.user.updated_at,
        };
        callback(authUser);
      } else {
        callback(null);
      }
    });
  }

  // Update user profile
  static async updateProfile(userData: { firstName: string; lastName: string; email: string }): Promise<AuthResponse> {
    try {
      const supabase = createClient();
      // Get current user to check if email is actually changing
      const { data: currentUser } = await supabase.auth.getUser();
      const currentEmail = currentUser.user?.email;
      
      // Update user metadata (first_name, last_name)
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
      });
      
      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }
      
      // If email is changing, update it separately
      if (currentEmail && currentEmail !== userData.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: userData.email,
        });
        
        if (emailError) {
          return {
            success: false,
            error: this.getErrorMessage(emailError)
          };
        }
        
        // Return the user with updated metadata, email change will require confirmation
        return { 
          success: true,
          user: data.user ? {
            id: data.user.id,
            email: data.user.email!,
            firstName: data.user.user_metadata?.first_name,
            lastName: data.user.user_metadata?.last_name,
            emailVerified: data.user.email_confirmed_at !== null,
            createdAt: data.user.created_at,
            updatedAt: data.user.updated_at,
          } : undefined,
          message: 'Profil aktualisiert. Bitte bestätigen Sie die E-Mail-Änderung in Ihrem Posteingang.'
        };
      }
      
      return {
        success: true,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
          emailVerified: data.user.email_confirmed_at !== null,
          createdAt: data.user.created_at,
          updatedAt: data.user.updated_at,
        } : undefined
      };
    } catch (error) {
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AuthApi.updateProfile' });
      return {
        success: false,
        error: 'Ein unerwarteter Fehler ist aufgetreten'
      };
    }
  }

  // Update password
  static async updatePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const supabase = createClient();
      // First, verify the current password by trying to sign in
      const { data: currentUser } = await supabase.auth.getUser();
      const currentEmail = currentUser.user?.email;
      
      if (!currentEmail) {
        return {
          success: false,
          error: 'Kein Benutzer angemeldet'
        };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });
      
      if (signInError) {
        return {
          success: false,
          error: 'Aktuelles Passwort ist falsch'
        };
      }
      
      // If current password is correct, update to new password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        return {
          success: false,
          error: this.getErrorMessage(error)
        };
      }

      return {
        success: true,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
          emailVerified: data.user.email_confirmed_at !== null,
          createdAt: data.user.created_at,
          updatedAt: data.user.updated_at,
        } : undefined
      };
    } catch (error) {
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AuthApi.updatePassword' });
      return {
        success: false,
        error: 'Ein unerwarteter Fehler ist aufgetreten'
      };
    }
  }



  // Helper method to get user-friendly error messages
  private static getErrorMessage(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Ungültige E-Mail-Adresse oder Passwort';
      case 'Email not confirmed':
        return 'E-Mail-Adresse nicht bestätigt. Bitte überprüfen Sie Ihren Posteingang.';
      case 'User already registered':
        return 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits';
      case 'Password should be at least 6 characters':
        return 'Passwort muss mindestens 6 Zeichen lang sein';
      case 'Unable to validate email address: invalid format':
        return 'Ungültiges E-Mail-Format';
      case 'Signup is disabled':
        return 'Registrierung ist derzeit deaktiviert';
      case 'Signup is disabled for this email domain':
        return 'Registrierung ist für diese E-Mail-Domain deaktiviert';
      default:
        return error.message || 'Ein Fehler ist aufgetreten';
    }
  }
} 
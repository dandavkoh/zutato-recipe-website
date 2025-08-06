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

// Mock Auth API - In a real app, this would connect to your backend
export class AuthApi {
  private static users: AuthUser[] = [
    {
      id: '1',
      email: 'demo@zutato.de',
      firstName: 'Demo',
      lastName: 'User',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  // Login
  static async login(email: string, password: string): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demo purposes, accept any password for demo@zutato.de
    if (email === 'demo@zutato.de' && password.length >= 6) {
      const user = this.users.find(u => u.email === email);
      if (user) {
        return {
          success: true,
          user
        };
      }
    }

    return {
      success: false,
      error: 'Ungültige E-Mail-Adresse oder Passwort'
    };
  }

  // Register
  static async register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if user already exists
    const existingUser = this.users.find(u => u.email === email);
    if (existingUser) {
      return {
        success: false,
        error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits'
      };
    }

    // Create new user
    const newUser: AuthUser = {
      id: (this.users.length + 1).toString(),
      email,
      firstName,
      lastName,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(newUser);

    return {
      success: true,
      user: newUser,
      message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.'
    };
  }

  // Reset Password
  static async resetPassword(email: string): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = this.users.find(u => u.email === email);
    if (!user) {
      return {
        success: false,
        error: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden'
      };
    }

    return {
      success: true,
      message: 'Passwort-Reset-E-Mail wurde gesendet. Bitte überprüfen Sie Ihren Posteingang.'
    };
  }

  // Get current user (for SSR)
  static async getCurrentUser(): Promise<AuthUser | null> {
    // In a real app, this would check for a valid session/token
    // For demo purposes, return the demo user
    return this.users.find(u => u.email === 'demo@zutato.de') || null;
  }

  // Logout
  static async logout(): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, this would invalidate the session/token
    console.log('User logged out');
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
} 
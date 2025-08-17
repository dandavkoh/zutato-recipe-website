'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';
import { validateLoginForm, validateEmail } from '@/utils/clientAuthUtils';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Laden...</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, resetPassword } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Get message from URL params (e.g., from registration)
  const message = searchParams.get('message');

  // Form validation
  const validateForm = (): boolean => {
    const validation = validateLoginForm(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    // Clear general error when user starts typing
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Redirect to the page they were trying to access, or to home
        const redirect = searchParams.get('redirect') || searchParams.get('from') || '/';
        router.push(redirect);
      } else {
        setErrors({ general: result.error || 'Anmeldung fehlgeschlagen' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setErrors({ email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen.' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(formData.email);

      if (result.success) {
        setErrors({ general: 'Passwort-Reset-E-Mail wurde gesendet. Bitte überprüfen Sie Ihren Posteingang.' });
      } else {
        setErrors({ general: result.error || 'Fehler beim Senden der Passwort-Reset-E-Mail' });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setErrors({ general: 'Fehler beim Senden der Passwort-Reset-E-Mail. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col">
      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4">
              <span className="text-3xl font-bold text-orange-600">🍳 ZUTATO</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Willkommen zurück</h1>
            <p className="text-gray-600">Melden Sie sich an, um Ihre Rezepte zu verwalten</p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl">
              <div className="flex items-center">
                <FontAwesomeIcon icon="check-circle" size="base" className="text-green-500 mr-2" />
                <p className="text-green-700 text-sm">{message}</p>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl">
              <div className="flex items-center">
                <FontAwesomeIcon icon="exclamation-circle" size="base" className="text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{errors.general}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="max.mustermann@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FontAwesomeIcon 
                      icon={showPassword ? 'eye-slash' : 'eye'} 
                      size="base" 
                      style="regular"
                    />
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Angemeldet bleiben</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors disabled:opacity-50"
                >
                  Passwort vergessen?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-600 text-white font-semibold py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon="spinner" size="base" className="animate-spin mr-2" />
                    Anmelden...
                  </>
                ) : (
                  'Anmelden'
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="text-center mt-6">
              <p className="text-gray-600">
                Noch kein Konto?{' '}
                <Link 
                  href="/register" 
                  className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                >
                  Registrieren
                </Link>
              </p>
            </div>

            {/* Terms and Privacy */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                Durch die Anmeldung stimmen Sie unseren{' '}
                <Link href="/agb" className="text-orange-600 hover:underline">Nutzungsbedingungen</Link>{' '}
                und{' '}
                <Link href="/datenschutz" className="text-orange-600 hover:underline">Datenschutzrichtlinien</Link>{' '}
                zu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
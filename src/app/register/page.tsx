'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';
import { 
  validateRegistrationForm, 
  getPasswordStrength, 
  validatePassword
} from '@/utils/authUtils';
import { AuthApi } from '@/lib/authApi';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form validation
  const validateForm = (): boolean => {
    const validation = validateRegistrationForm(formData);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await AuthApi.register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );

      if (result.success) {
        router.push('/login?message=' + encodeURIComponent('Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.'));
      } else {
        setErrors({ email: result.error || 'Registrierung fehlgeschlagen' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ email: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Konto erstellen</h1>
            <p className="text-gray-600">Werden Sie Teil der ZUTATO-Community</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Max"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Mustermann"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

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
                {formData.password && (
                  <div className="mt-2">
                    <p className={`text-sm font-medium ${
                      passwordStrength.color === 'text-green-500' ? 'text-green-600' : 
                      passwordStrength.color === 'text-yellow-500' ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      Stärke: {passwordStrength.strength}
                    </p>
                    <div className="mt-1 flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => {
                        const validation = validatePassword(formData.password);
                        const validCount = 5 - validation.errors.length;
                        const isActive = level <= validCount;
                        return (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              isActive ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort bestätigen *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FontAwesomeIcon 
                      icon={showConfirmPassword ? 'eye-slash' : 'eye'} 
                      size="base" 
                      style="regular"
                    />
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
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
                    Registriere...
                  </>
                ) : (
                  'Konto erstellen'
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="text-center mt-6">
              <p className="text-gray-600">
                Bereits ein Konto?{' '}
                <Link 
                  href="/login" 
                  className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                >
                  Anmelden
                </Link>
              </p>
            </div>

            {/* Terms and Privacy */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                Durch die Registrierung stimmen Sie unseren{' '}
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
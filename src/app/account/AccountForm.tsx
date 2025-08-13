'use client';

import React, { useState } from 'react';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';
import { AuthApi } from '@/lib/authApi';
import { validateEmail, validatePassword, getPasswordStrength } from '@/utils/clientAuthUtils';

interface AccountFormProps {
  initialUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function AccountForm({ initialUser }: AccountFormProps) {
  const [formData, setFormData] = useState({
    firstName: initialUser.firstName,
    lastName: initialUser.lastName,
    email: initialUser.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const validateName = (name: string) => {
    if (!name.trim()) return { isValid: false, error: 'Pflichtfeld' };
    if (name.trim().length < 2) return { isValid: false, error: 'Mindestens 2 Zeichen' };
    return { isValid: true };
  };

  const validateProfileForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    const firstNameValidation = validateName(formData.firstName);
    if (!firstNameValidation.isValid) newErrors.firstName = firstNameValidation.error!;
    const lastNameValidation = validateName(formData.lastName);
    if (!lastNameValidation.isValid) newErrors.lastName = lastNameValidation.error!;
    if (!formData.email.trim()) newErrors.email = 'E-Mail ist erforderlich';
    else if (!validateEmail(formData.email)) newErrors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!formData.currentPassword.trim()) newErrors.currentPassword = 'Aktuelles Passwort ist erforderlich';
    if (!formData.newPassword) newErrors.newPassword = 'Neues Passwort ist erforderlich';
    else {
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) newErrors.newPassword = passwordValidation.errors.join(', ');
    }
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
    else if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as { name: keyof typeof formData; value: string };
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ValidationErrors]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (successMessage) setSuccessMessage('');
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;
    setLoading(true);
    try {
      const result = await AuthApi.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
      });
      if (result.success) {
        setSuccessMessage(result.message || 'Profil erfolgreich aktualisiert!');
      } else {
        setErrors({ email: result.error || 'Fehler beim Aktualisieren des Profils' });
      }
    } catch (error) {
      setErrors({ email: 'Fehler beim Aktualisieren des Profils' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    setLoading(true);
    try {
      const result = await AuthApi.updatePassword(formData.currentPassword, formData.newPassword);
      if (result.success) {
        setSuccessMessage('Passwort erfolgreich geändert!');
        setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        setErrors({ currentPassword: result.error || 'Fehler beim Ändern des Passworts' });
      }
    } catch (error) {
      setErrors({ currentPassword: 'Fehler beim Ändern des Passworts' });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    const s = getPasswordStrength(formData.newPassword);
    const errorsCount = validatePassword(formData.newPassword).errors.length;
    const percentage = ((5 - errorsCount) / 5) * 100;
    return { ...s, percentage } as { strength: string; color: string; percentage: number };
  })();

  return (
    <div>
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-700 text-sm">{successMessage}</div>
        </div>
      )}

      <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
        <label className="block text-gray-900 text-sm font-semibold mb-4">
          Profilinformationen
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FontAwesomeIcon icon="fa-user" size="base" style="regular" />
              </div>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full bg-gray-50 border ${errors.firstName ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                placeholder="Vorname"
              />
            </div>
            {errors.firstName && (
              <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FontAwesomeIcon icon="fa-user" size="base" style="regular" />
              </div>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full bg-gray-50 border ${errors.lastName ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                placeholder="Nachname"
              />
            </div>
            {errors.lastName && (
              <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FontAwesomeIcon icon="fa-envelope" size="base" style="regular" />
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
              placeholder="E-Mail-Adresse"
            />
          </div>
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Speichere...' : 'Profil speichern'}
        </button>
      </div>

      <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
        <label className="block text-gray-900 text-sm font-semibold mb-4">
          Passwort ändern
        </label>

        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FontAwesomeIcon icon="fa-lock" size="base" style="regular" />
            </div>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className={`w-full bg-gray-50 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-12 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
              placeholder="Aktuelles Passwort"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'} size="base" style="regular" />
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-red-600 text-sm mt-1">{errors.currentPassword}</p>
          )}
        </div>

        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FontAwesomeIcon icon="fa-lock" size="base" style="regular" />
            </div>
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className={`w-full bg-gray-50 border ${errors.newPassword ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-12 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
              placeholder="Neues Passwort"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={showNewPassword ? 'fa-eye-slash' : 'fa-eye'} size="base" style="regular" />
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-red-600 text-sm mt-1">{errors.newPassword}</p>
          )}
          {formData.newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      passwordStrength.percentage <= 20 ? 'bg-red-500' :
                      passwordStrength.percentage <= 40 ? 'bg-orange-500' :
                      passwordStrength.percentage <= 60 ? 'bg-yellow-500' :
                      passwordStrength.percentage <= 80 ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
                <span className={`text-xs ${passwordStrength.color.replace('text-', 'text-')}`}>
                  {passwordStrength.strength}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FontAwesomeIcon icon="fa-lock" size="base" style="regular" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full bg-gray-50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-12 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
              placeholder="Passwort bestätigen"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} size="base" style="regular" />
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Ändere...' : 'Passwort ändern'}
        </button>
      </div>
    </div>
  );
}


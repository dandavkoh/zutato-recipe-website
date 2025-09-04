'use client';

import React, { useEffect, useState } from 'react';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';
import { AuthApi } from '@/lib/authApi';
import { validateEmail, validatePassword, getPasswordStrength } from '@/utils/clientAuthUtils';
import { UserSettingsApi } from '@/lib/userSettings';
import { showToast } from '@/utils/showToast';

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
  nickname?: string;
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
  const [nickname, setNickname] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameSuccess, setNicknameSuccess] = useState('');
  const [isNicknameLocked, setIsNicknameLocked] = useState(false);
  const [banner, setBanner] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [socialLinks, setSocialLinks] = useState<{ instagram?: string; tiktok?: string; facebook?: string; x?: string; pinterest?: string; youtube?: string }>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const validateName = (name: string) => {
    if (!name.trim()) return { isValid: false, error: 'Pflichtfeld' };
    if (name.trim().length < 2) return { isValid: false, error: 'Mindestens 2 Zeichen' };
    return { isValid: true };
  };

  useEffect(() => {
    const loadNickname = async () => {
      setNicknameLoading(true);
      const res = await UserSettingsApi.getNickname();
      if (res.success) {
        setNickname(res.nickname || '');
        setIsNicknameLocked(Boolean(res.nickname));
      }
      setNicknameLoading(false);
    };
    const loadPublicProfile = async () => {
      const prof = await UserSettingsApi.getUserPublicProfile();
      if (prof.success) {
        setBanner(prof.banner || '');
        setAvatarUrl(prof.avatar_url || '');
        setSocialLinks({
          instagram: prof.social_links?.instagram || '',
          tiktok: prof.social_links?.tiktok || '',
          facebook: prof.social_links?.facebook || '',
          x: prof.social_links?.x || '',
          pinterest: prof.social_links?.pinterest || '',
          youtube: prof.social_links?.youtube || '',
        });
      }
    };
    loadNickname();
    loadPublicProfile();
  }, []);

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

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    if (errors.nickname) setErrors((prev) => ({ ...prev, nickname: undefined }));
    if (nicknameSuccess) setNicknameSuccess('');
  };

  const validateNickname = (value: string) => {
    const v = value.trim();
    if (!v) return 'Pflichtfeld';
    if (v.length < 3) return 'Mindestens 3 Zeichen';
    if (!/^[a-zA-Z0-9_\-.]+$/.test(v)) return 'Nur Buchstaben, Zahlen, Unterstrich, Punkt oder Bindestrich erlaubt (keine Leerzeichen)';
    return '';
  };

  const handleSaveNickname = async () => {
    const validationError = validateNickname(nickname);
    if (validationError) {
      setErrors((prev) => ({ ...prev, nickname: validationError }));
      return;
    }
    setNicknameLoading(true);
    const res = await UserSettingsApi.updateNickname(nickname);
    if (res.success) {
      setNicknameSuccess('Accountname gespeichert.');
      setIsNicknameLocked(true);
    } else {
      setErrors((prev) => ({ ...prev, nickname: res.error || 'Fehler beim Speichern' }));
    }
    setNicknameLoading(false);
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
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AccountForm.handleSaveProfile' });
      setErrors({ email: 'Fehler beim Aktualisieren des Profils' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePublicProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    const payload = {
      banner: banner || null,
      avatar_url: avatarUrl || null,
      social_links: {
        instagram: socialLinks.instagram ? socialLinks.instagram : null,
        tiktok: socialLinks.tiktok ? socialLinks.tiktok : null,
        facebook: socialLinks.facebook ? socialLinks.facebook : null,
        x: socialLinks.x ? socialLinks.x : null,
        pinterest: socialLinks.pinterest ? socialLinks.pinterest : null,
        youtube: socialLinks.youtube ? socialLinks.youtube : null,
      },
    };
    const res = await UserSettingsApi.updateUserPublicProfile(payload);
    if (!res.success) {
      setProfileError(res.error || 'Profil konnte nicht aktualisiert werden');
    } else {
      setSuccessMessage(res.message || 'Profil aktualisiert.');
    }
    setProfileSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProfileSaving(true);
    const res = await UserSettingsApi.uploadAvatar(f);
    if (res.success) {
      setAvatarUrl(res.avatar_url || '');
      setSuccessMessage(res.message || 'Profilbild aktualisiert.');
    } else {
      setProfileError(res.error || 'Profilbild konnte nicht hochgeladen werden');
    }
    setProfileSaving(false);
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
      const { reportError } = await import('@/utils/reportError');
      reportError(error, { where: 'AccountForm.handleChangePassword' });
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
      {/* Inline green banner remains; global toasts not needed here */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-700 text-sm">{successMessage}</div>
        </div>
      )}

      <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
        <label className="block text-gray-900 text-sm font-semibold mb-4">
          Öffentliches Profil
        </label>
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Profilbild</label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden border flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <FontAwesomeIcon icon="user" style="regular" className="text-gray-400 text-2xl" />
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="w-auto max-w-[240px] text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Kurzbeschreibung</label>
            <textarea
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Erzähl kurz über dich..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Social Links</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40">
                <span className="w-10 h-10 flex items-center justify-center text-gray-500"><FontAwesomeIcon icon="instagram" style="brands" fixedWidth /></span>
                <input type="url" placeholder="Instagram URL" value={socialLinks.instagram || ''} onChange={(e) => setSocialLinks((s) => ({ ...s, instagram: e.target.value }))} className="w-full flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40">
                <span className="w-10 h-10 flex items-center justify-center text-gray-500"><FontAwesomeIcon icon="tiktok" style="brands" fixedWidth /></span>
                <input type="url" placeholder="TikTok URL" value={socialLinks.tiktok || ''} onChange={(e) => setSocialLinks((s) => ({ ...s, tiktok: e.target.value }))} className="w-full flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40">
                <span className="w-10 h-10 flex items-center justify-center text-gray-500"><FontAwesomeIcon icon="facebook" style="brands" fixedWidth /></span>
                <input type="url" placeholder="Facebook URL" value={socialLinks.facebook || ''} onChange={(e) => setSocialLinks((s) => ({ ...s, facebook: e.target.value }))} className="w-full flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40">
                <span className="w-10 h-10 flex items-center justify-center text-gray-500"><FontAwesomeIcon icon="x-twitter" style="brands" fixedWidth /></span>
                <input type="url" placeholder="X (Twitter) URL" value={socialLinks.x || ''} onChange={(e) => setSocialLinks((s) => ({ ...s, x: e.target.value }))} className="w-full flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40">
                <span className="w-10 h-10 flex items-center justify-center text-gray-500"><FontAwesomeIcon icon="pinterest" style="brands" fixedWidth /></span>
                <input type="url" placeholder="Pinterest URL" value={socialLinks.pinterest || ''} onChange={(e) => setSocialLinks((s) => ({ ...s, pinterest: e.target.value }))} className="w-full flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40">
                <span className="w-10 h-10 flex items-center justify-center text-gray-500"><FontAwesomeIcon icon="youtube" style="brands" fixedWidth /></span>
                <input type="url" placeholder="YouTube Kanal URL" value={socialLinks.youtube || ''} onChange={(e) => setSocialLinks((s) => ({ ...s, youtube: e.target.value }))} className="w-full flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
              </div>
            </div>
          </div>
        </div>
        {profileError && <div className="text-sm text-red-600 mb-2">{profileError}</div>}
        <button
          onClick={handleSavePublicProfile}
          disabled={profileSaving}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {profileSaving ? 'Speichere...' : 'Öffentliches Profil speichern'}
        </button>
      </div>
      <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
        <label className="block text-gray-900 text-sm font-semibold mb-4">
          Accountname
        </label>
        <div className="mb-4">
          <div className={`flex items-center bg-gray-50 border ${errors.nickname ? 'border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40 gap-3`}>
            <span className="pl-3 text-gray-500">
              <FontAwesomeIcon icon="fa-at" size="base" style="regular" fixedWidth />
            </span>
            <input
              type="text"
              name="nickname"
              value={nickname}
              onChange={handleNicknameChange}
              className="w-full flex-1 bg-transparent pr-0 py-3 text-gray-900 placeholder-gray-500 outline-none pl-0 !pl-0"
              placeholder="z. B. kochmeister42"
              disabled={isNicknameLocked}
            />
          </div>
          {errors.nickname && (
            <p className="text-red-600 text-sm mt-1">{errors.nickname}</p>
          )}
          {nicknameSuccess && (
            <p className="text-green-700 text-sm mt-1">{nicknameSuccess}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Dein öffentlicher Name. Einmal vergeben, kann er nicht gelöscht werden.</p>
        </div>
        {!isNicknameLocked && (
          <button
            onClick={handleSaveNickname}
            disabled={nicknameLoading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {nicknameLoading ? 'Speichere...' : 'Accountname speichern'}
          </button>
        )}
      </div>

      <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
        <label className="block text-gray-900 text-sm font-semibold mb-4">
          Profilinformationen
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className={`flex items-center bg-gray-50 border ${errors.firstName ? 'border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40 gap-3`}>
              <span className="pl-3 text-gray-500">
                <FontAwesomeIcon icon="fa-user" size="base" style="regular" fixedWidth />
              </span>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full flex-1 bg-transparent pr-0 py-3 text-gray-900 placeholder-gray-500 outline-none pl-0 !pl-0"
                placeholder="Vorname"
              />
            </div>
            {errors.firstName && (
              <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <div className={`flex items-center bg-gray-50 border ${errors.lastName ? 'border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40 gap-3`}>
              <span className="pl-3 text-gray-500">
                <FontAwesomeIcon icon="fa-user" size="base" style="regular" fixedWidth />
              </span>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full flex-1 bg-transparent pr-0 py-3 text-gray-900 placeholder-gray-500 outline-none pl-0 !pl-0"
                placeholder="Nachname"
              />
            </div>
            {errors.lastName && (
              <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className={`flex items-center bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40 gap-3`}>
            <span className="pl-3 text-gray-500">
              <FontAwesomeIcon icon="fa-envelope" size="base" style="regular" fixedWidth />
            </span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full flex-1 bg-transparent pr-0 py-3 text-gray-900 placeholder-gray-500 outline-none pl-0 !pl-0"
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
          <div className={`flex items-center bg-gray-50 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40 gap-3 pr-1`}>
            <span className="pl-3 text-gray-500">
              <FontAwesomeIcon icon="fa-lock" size="base" style="regular" fixedWidth />
            </span>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className="w-full flex-1 bg-transparent pr-0 py-3 text-gray-900 placeholder-gray-500 outline-none pl-0 !pl-0"
              placeholder="Aktuelles Passwort"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="px-3 text-gray-500 hover:text-gray-700 shrink-0"
            >
              <FontAwesomeIcon icon={showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'} size="base" style="regular" />
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-red-600 text-sm mt-1">{errors.currentPassword}</p>
          )}
        </div>

        <div className="mb-4">
          <div className={`flex items-center bg-gray-50 border ${errors.newPassword ? 'border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40 gap-3 pr-1`}>
            <span className="pl-3 text-gray-500">
              <FontAwesomeIcon icon="fa-lock" size="base" style="regular" fixedWidth />
            </span>
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="w-full flex-1 bg-transparent pr-0 py-3 text-gray-900 placeholder-gray-500 outline-none pl-0 !pl-0"
              placeholder="Neues Passwort"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="px-3 text-gray-500 hover:text-gray-700 shrink-0"
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
          <div className={`flex items-center bg-gray-50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg overflow-hidden focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-500/40 gap-3 pr-1`}>
            <span className="pl-3 text-gray-500">
              <FontAwesomeIcon icon="fa-lock" size="base" style="regular" fixedWidth />
            </span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full flex-1 bg-transparent pr-0 py-3 text-gray-900 placeholder-gray-500 outline-none pl-0 !pl-0"
              placeholder="Passwort bestätigen"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="px-3 text-gray-500 hover:text-gray-700 shrink-0"
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


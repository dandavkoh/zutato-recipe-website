// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface PasswordStrength {
  strength: string;
  color: string;
}

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Login form validation
export const validateLoginForm = (data: { email: string; password: string }): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.email.trim()) {
    errors.email = 'E-Mail-Adresse ist erforderlich';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
  }

  if (!data.password.trim()) {
    errors.password = 'Passwort ist erforderlich';
  } else if (data.password.length < 6) {
    errors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Registration form validation
export const validateRegistrationForm = (data: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  // First name validation
  if (!data.firstName.trim()) {
    errors.firstName = 'Vorname ist erforderlich';
  } else if (data.firstName.length < 2) {
    errors.firstName = 'Vorname muss mindestens 2 Zeichen lang sein';
  }

  // Last name validation
  if (!data.lastName.trim()) {
    errors.lastName = 'Nachname ist erforderlich';
  } else if (data.lastName.length < 2) {
    errors.lastName = 'Nachname muss mindestens 2 Zeichen lang sein';
  }

  // Email validation
  if (!data.email.trim()) {
    errors.email = 'E-Mail-Adresse ist erforderlich';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
  }

  // Password validation
  const passwordValidation = validatePassword(data.password);
  if (passwordValidation.errors.length > 0) {
    errors.password = passwordValidation.errors.join(', ');
  }

  // Confirm password validation
  if (!data.confirmPassword.trim()) {
    errors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwörter stimmen nicht überein';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mindestens 8 Zeichen');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe');
  }

  if (!/\d/.test(password)) {
    errors.push('Mindestens eine Zahl');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Mindestens ein Sonderzeichen');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password strength calculation
export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { strength: '', color: 'text-gray-400' };
  }

  const validation = validatePassword(password);
  const validCount = 5 - validation.errors.length;

  if (validCount <= 1) {
    return { strength: 'Sehr schwach', color: 'text-red-500' };
  } else if (validCount <= 2) {
    return { strength: 'Schwach', color: 'text-orange-500' };
  } else if (validCount <= 3) {
    return { strength: 'Mittel', color: 'text-yellow-500' };
  } else if (validCount <= 4) {
    return { strength: 'Stark', color: 'text-green-500' };
  } else {
    return { strength: 'Sehr stark', color: 'text-green-500' };
  }
}; 
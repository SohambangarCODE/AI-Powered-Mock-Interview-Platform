/**
 * Password strength validation.
 *
 * Centralised so both the auth controller (register) and reset-password flow
 * use identical rules, driven by securityConfig.PASSWORD_RULES.
 */

const { PASSWORD_RULES } = require("../config/securityConfig");

/**
 * Validate password strength against configured rules.
 *
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Password is required."] };
  }

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(
      `Password must be at least ${PASSWORD_RULES.minLength} characters long.`
    );
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }

  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  }

  if (
    PASSWORD_RULES.requireSpecial &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Password must contain at least one special character.");
  }

  return { valid: errors.length === 0, errors };
};

module.exports = { validatePasswordStrength };

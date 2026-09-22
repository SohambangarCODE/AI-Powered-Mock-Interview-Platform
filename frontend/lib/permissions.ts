/**
 * Frontend permission utilities.
 *
 * This mirrors the backend rolesConfig.js. It is used for UI gating only —
 * the backend always enforces the actual permission check.
 * Never use these to bypass backend authorization.
 */

export type Role = 'Student' | 'Mentor' | 'Administrator';
export type Permission =
  | 'interview.create'
  | 'interview.read'
  | 'report.read'
  | 'readiness.read'
  | 'resume.analyze'
  | 'challenge.attempt'
  | 'challenge.manage'
  | 'student.read'
  | 'feedback.create'
  | 'feedback.read'
  | 'user.manage'
  | 'role.manage'
  | 'company.manage'
  | 'system.manage'
  | 'analytics.read';

// ── Role → permissions map (mirrors backend rolesConfig.js) ──────────────────
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Student: [
    'interview.create',
    'interview.read',
    'report.read',
    'readiness.read',
    'challenge.attempt',
    'resume.analyze',
  ],
  Mentor: [
    'student.read',
    'interview.read',
    'report.read',
    'feedback.create',
    'feedback.read',
  ],
  Administrator: [
    'interview.create',
    'interview.read',
    'report.read',
    'readiness.read',
    'resume.analyze',
    'challenge.attempt',
    'challenge.manage',
    'student.read',
    'feedback.create',
    'feedback.read',
    'user.manage',
    'role.manage',
    'company.manage',
    'system.manage',
    'analytics.read',
  ],
};

/**
 * Check whether a role has the given permission.
 * Falls back to 'Student' for any unknown/undefined role.
 */
export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  const effectiveRole: Role = role && ROLE_PERMISSIONS[role] ? role : 'Student';
  return ROLE_PERMISSIONS[effectiveRole].includes(permission);
}

// ── Role-specific default redirect paths ──────────────────────────────────────
export const ROLE_HOME: Record<Role, string> = {
  Student:       '/dashboard',
  Mentor:        '/mentor',
  Administrator: '/admin',
};

export const DEFAULT_ROLE: Role = 'Student';

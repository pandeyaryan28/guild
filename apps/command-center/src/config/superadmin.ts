/// <reference types="vite/client" />
/**
 * @file superadmin.ts
 * Centralized RBAC configuration and whitelist definitions for Guild Command Center.
 */

export type SuperAdminPermission =
  | 'all'
  | 'view_metrics'
  | 'manage_workspaces'
  | 'manage_users'
  | 'manage_subscriptions'
  | 'override_quotas'
  | 'view_audit_logs'
  | 'export_data'
  | 'manage_platform_admins';

export type PlatformAdminRole = 'superadmin' | 'ops_admin' | 'billing_admin' | 'viewer';

export interface PlatformAdminDoc {
  uid: string;
  email: string;
  name?: string;
  role: PlatformAdminRole;
  permissions: SuperAdminPermission[];
  isSuperAdmin: boolean;
  active: boolean;
  addedAt?: any;
  addedBy?: string;
  lastLoginAt?: any;
}

export const PLATFORM_ADMINS_COLLECTION = 'platformAdmins';

/**
 * Built-in fallback root superadmins.
 * Guarantees zero-lockout during local development, staging, or initial production deployment.
 */
export const DEFAULT_SUPERADMIN_EMAILS: readonly string[] = [
  'pandeyaryan28@gmail.com',
  'admin@guild.so',
  'aryan@guild.so',
  'superadmin@guild.so',
  'security@guild.so',
];

/**
 * Parses and normalizes the comma-separated whitelist from VITE_SUPERADMIN_EMAILS.
 */
export function getSuperAdminWhitelist(): string[] {
  const envEmailsRaw = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPERADMIN_EMAILS as string | undefined)
    : '';

  const parsedEnvEmails = (envEmailsRaw || '')
    .split(/[,;]/)
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0 && email.includes('@'));

  const combined = new Set([
    ...DEFAULT_SUPERADMIN_EMAILS.map(e => e.toLowerCase()),
    ...parsedEnvEmails,
  ]);

  return Array.from(combined);
}

/**
 * Checks if a given email address is in the superadmin email whitelist.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const whitelist = getSuperAdminWhitelist();
  return whitelist.includes(normalized);
}

/**
 * Maps platform admin roles to default permission sets.
 */
export function getDefaultPermissionsForRole(role: PlatformAdminRole): SuperAdminPermission[] {
  switch (role) {
    case 'superadmin':
      return [
        'all',
        'view_metrics',
        'manage_workspaces',
        'manage_users',
        'manage_subscriptions',
        'override_quotas',
        'view_audit_logs',
        'export_data',
        'manage_platform_admins',
      ];
    case 'ops_admin':
      return ['view_metrics', 'manage_workspaces', 'manage_users', 'view_audit_logs', 'export_data'];
    case 'billing_admin':
      return ['view_metrics', 'manage_subscriptions', 'override_quotas', 'view_audit_logs', 'export_data'];
    case 'viewer':
      return ['view_metrics', 'view_audit_logs'];
    default:
      return ['view_metrics'];
  }
}

/**
 * Checks if a permissions array satisfies a required permission.
 */
export function hasPermission(
  adminPermissions: SuperAdminPermission[] | undefined,
  required: SuperAdminPermission
): boolean {
  if (!adminPermissions || adminPermissions.length === 0) return false;
  if (adminPermissions.includes('all')) return true;
  return adminPermissions.includes(required);
}

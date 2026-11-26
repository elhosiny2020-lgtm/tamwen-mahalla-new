'use client';

import React, { useEffect, useState } from 'react';
import type { User, UserRole } from '@/types';
import { getCurrentSessionUser } from '@/lib/mock-db';

export const ADMIN_ROLE_SET = new Set<UserRole>([
  'super_admin',
  'admin',
  'supply_admin_manager',
  'department_manager',
]);

export function hasRequiredRole(
  userRole: UserRole | undefined | null,
  allowedRoles?: UserRole[],
  requireAdmin = false
): boolean {
  if (!userRole) return false;
  if (requireAdmin && !ADMIN_ROLE_SET.has(userRole)) {
    return false;
  }
  if (allowedRoles && allowedRoles.length > 0) {
    return allowedRoles.includes(userRole);
  }
  return true;
}

export interface RoleGuardProps {
  /** Optional explicit user or role; if omitted, reads from active session payload */
  user?: Pick<User, 'role'> | null;
  role?: UserRole | null;
  /** Specific roles allowed to view the children */
  allowedRoles?: UserRole[];
  /** Shortcut to restrict visibility to administrative roles */
  requireAdmin?: boolean;
  /** Optional fallback element to render when unauthorized (defaults to null to hide UI element) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Helper component (`<RoleGuard>`) that conditionally hides UI elements (such as administrative
 * links, factory reset controls, and role management tabs) based on the user's role from the
 * session payload. Underlying API endpoints remain strictly guarded on the server via `requireAdminSession`.
 */
export function RoleGuard({
  user,
  role,
  allowedRoles,
  requireAdmin = false,
  fallback = null,
  children,
}: RoleGuardProps) {
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (role || user?.role) {
      return;
    }

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (cancelled) return;
      const localUser = getCurrentSessionUser();
      if (localUser?.role) {
        setSessionRole(localUser.role);
      }
    });

    fetch('/api/auth/session', { method: 'GET', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.authenticated && data?.session?.role) {
          setSessionRole(data.session.role as UserRole);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [role, user?.role]);

  const effectiveRole = role ?? user?.role ?? sessionRole;

  if (!hasRequiredRole(effectiveRole, allowedRoles, requireAdmin)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-Order Component (`withRoleGuard`) to wrap any component with role-based visibility protection.
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    allowedRoles?: UserRole[];
    requireAdmin?: boolean;
    fallback?: React.ReactNode;
  } = {}
) {
  const ComponentWithRoleGuard = (props: P & { currentUser?: Pick<User, 'role'> | null }) => {
    return (
      <RoleGuard
        user={props.currentUser}
        allowedRoles={options.allowedRoles}
        requireAdmin={options.requireAdmin}
        fallback={options.fallback ?? null}
      >
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };

  ComponentWithRoleGuard.displayName = `withRoleGuard(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ComponentWithRoleGuard;
}

export default RoleGuard;

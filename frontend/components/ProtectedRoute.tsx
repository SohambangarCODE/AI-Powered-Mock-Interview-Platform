"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  /** Required permission to access this page. If omitted, only login is required. */
  permission?: Permission;
  children: React.ReactNode;
}

/**
 * ProtectedRoute — wraps any page that requires authentication and/or a specific permission.
 *
 * Behavior:
 *  - Loading  → shows a spinner (avoids flash of unauthorized content)
 *  - Not logged in → redirects to /login  (401 pattern)
 *  - Logged in but no permission → redirects to /unauthorized  (403 pattern)
 *  - Authorized → renders children
 */
export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { isLoading, isLoggedIn, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (permission && !hasPermission(permission)) {
      router.replace("/unauthorized");
    }
  }, [isLoading, isLoggedIn, permission, hasPermission, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isLoggedIn) return null;
  if (permission && !hasPermission(permission)) return null;

  return <>{children}</>;
}

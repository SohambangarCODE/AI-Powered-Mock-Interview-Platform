"use client";

import Link from "next/link";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/permissions";

export default function UnauthorizedPage() {
  const { isLoggedIn, role } = useAuth();
  const homeHref = isLoggedIn && role ? ROLE_HOME[role] : "/";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
        <ShieldX className="size-10 text-destructive" aria-hidden />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="max-w-sm text-muted-foreground">
          You don&apos;t have permission to view this page. Contact your
          administrator if you believe this is a mistake.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href={homeHref}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Go Back
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">HTTP 403 — Forbidden</p>
    </main>
  );
}

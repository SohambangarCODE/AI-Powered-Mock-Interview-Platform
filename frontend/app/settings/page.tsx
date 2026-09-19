"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { SecurityPanel } from "@/components/dashboard/SecurityPanel";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";

const SettingsPage = () => {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background">
        <LoadingState label="Loading…" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-background">
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 md:p-8">
        <PageHeader
          heading="Settings"
          description="Manage your account security and preferences."
          icon={ShieldCheck}
        />
        
        <div className="grid gap-8">
          <SecurityPanel />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

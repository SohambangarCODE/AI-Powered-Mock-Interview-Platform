"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { useInterviewHistory } from "@/hooks/useInterviewHistory";
import { InterviewHistoryPanel } from "@/components/dashboard/InterviewHistoryPanel";

export default function SessionsPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { interviews, dataLoading} = useInterviewHistory(isLoggedIn);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, authLoading, router]);

  const handleSelectDomain = (domain: string) => {
    router.push(`/interview?domain=${encodeURIComponent(domain)}`);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background">
        <LoadingState label="Loading…" />
      </div>
    );
  }
  if (!isLoggedIn) return null;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="All sessions" title="My Sessions" />
        <div className="mt-8">
          <InterviewHistoryPanel
            interviews={interviews}
            dataLoading={dataLoading}
            onSelectDomain={handleSelectDomain}
            onStartInterview={() => router.push("/dashboard")}
          />
        </div>
      </div>
    </div>
  );
}
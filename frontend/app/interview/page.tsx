"use client";
import InterviewContent from "@/components/InterviewContent";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import React, { Suspense } from "react";

function InterviewSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-background">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" className="text-primary" label="Loading interview" />
      </div>
    </div>
  );
}

const page = () => {
  return (
    <Suspense fallback={<InterviewSkeleton />}>
      <InterviewContent />
    </Suspense>
  );
};

export default page;

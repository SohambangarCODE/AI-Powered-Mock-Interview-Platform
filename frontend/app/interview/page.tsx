"use client";
import InterviewContent from "@/components/InterviewContent";
import React, { Suspense } from "react";

function InterviewSkeleton() {
  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
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

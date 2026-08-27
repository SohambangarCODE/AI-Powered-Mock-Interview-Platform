"use client";

import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import type { ActiveSession, InterviewSummary } from "@/lib/interview";

export function useInterviewHistory(enabled: boolean) {
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchInterviews = useCallback(async () => {
    try {
      setDataLoading(true);
      const [history, active] = await Promise.allSettled([
        axiosInstance.get("/api/interviews"),
        axiosInstance.get("/api/interviews/active"),
      ]);
      if (history.status === "fulfilled")
        setInterviews(history.value.data.interviews || []);
      else console.error("Failed to fetch interviews:", history.reason);

      if (active.status === "fulfilled")
        setActiveSessions(active.value.data.active || []);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchInterviews();
  }, [enabled, fetchInterviews]);

  return { interviews, activeSessions, dataLoading, refetch: fetchInterviews };
}
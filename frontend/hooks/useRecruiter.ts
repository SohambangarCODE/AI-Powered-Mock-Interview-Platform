"use client";

import { useCallback, useEffect, useState } from "react";

import axiosInstance from "@/lib/axios";
import { apiErrorMessage } from "@/lib/interview";
import type { CompanyProfile, CompanySessionSummary } from "@/lib/recruiter";

/**
 * Owns everything the AI Recruiter Simulator reads.
 *
 * The two GETs are issued together and settled independently: a failure to load
 * past sessions must not stop the user starting a new one, so each has its own
 * error slot and the rest still renders.
 */
export function useRecruiter(enabled: boolean) {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [sessions, setSessions] = useState<CompanySessionSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setSessionsError(null);

      const [list, past] = await Promise.allSettled([
        axiosInstance.get<{ companies: CompanyProfile[]; disclaimer: string }>(
          "/api/companies",
        ),
        axiosInstance.get<{ sessions: CompanySessionSummary[] }>(
          "/api/companies/sessions",
        ),
      ]);

      if (list.status === "fulfilled") {
        setCompanies(list.value.data.companies || []);
        setDisclaimer(list.value.data.disclaimer || "");
      } else {
        setLoadError(
          apiErrorMessage(list.reason, "Could not load the company profiles."),
        );
      }

      if (past.status === "fulfilled") {
        setSessions(past.value.data.sessions || []);
      } else {
        setSessionsError(
          apiErrorMessage(past.reason, "Could not load your past simulations."),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return {
    companies,
    disclaimer,
    sessions,

    loading,
    loadError,
    sessionsError,
    reload: load,
  };
}

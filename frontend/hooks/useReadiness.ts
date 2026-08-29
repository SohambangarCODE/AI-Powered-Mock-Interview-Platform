"use client";

import { useCallback, useEffect, useState } from "react";

import axiosInstance from "@/lib/axios";
import { apiErrorMessage } from "@/lib/interview";
import {
  READINESS_AI_TIMEOUT,
  type Availability,
  type ReadinessAssessment,
  type ReadinessConfig,
  type ReadinessHistoryEntry,
  type ResumeProfile,
  type SkillTrend,
  type TrackKey,
} from "@/lib/readiness";

interface LatestResponse {
  assessment: ReadinessAssessment | null;
  profile: ResumeProfile | null;
  skillTrends: SkillTrend[];
  availability: Availability;
}

/**
 * Owns everything the readiness page reads and writes.
 *
 * The three GETs are issued together and settled independently: a failure of
 * one (say the history query) must not blank the page, so each has its own
 * error slot and the rest still renders.
 */
export function useReadiness(enabled: boolean) {
  const [config, setConfig] = useState<ReadinessConfig | null>(null);
  const [assessment, setAssessment] = useState<ReadinessAssessment | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [skillTrends, setSkillTrends] = useState<SkillTrend[]>([]);
  const [history, setHistory] = useState<ReadinessHistoryEntry[]>([]);
  const [availability, setAvailability] = useState<Availability | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPartial, setUploadPartial] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setHistoryError(null);

      const [latest, hist, cfg] = await Promise.allSettled([
        axiosInstance.get<LatestResponse>("/api/readiness/latest"),
        axiosInstance.get<{ history: ReadinessHistoryEntry[] }>(
          "/api/readiness/history",
        ),
        axiosInstance.get<{ config: ReadinessConfig }>("/api/readiness/config"),
      ]);

      if (latest.status === "fulfilled") {
        setAssessment(latest.value.data.assessment);
        setProfile(latest.value.data.profile);
        setSkillTrends(latest.value.data.skillTrends || []);
        setAvailability(latest.value.data.availability);
      } else {
        setLoadError(
          apiErrorMessage(
            latest.reason,
            "Could not load your readiness report.",
          ),
        );
      }

      if (hist.status === "fulfilled") {
        setHistory(hist.value.data.history || []);
      } else {
        setHistoryError(
          apiErrorMessage(hist.reason, "Could not load your score history."),
        );
      }

      // The config only powers explanatory copy, so a failure here degrades the
      // breakdown labels rather than the page.
      if (cfg.status === "fulfilled") setConfig(cfg.value.data.config);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  /** Compute and persist a new assessment. Resolves true on success. */
  const generate = useCallback(
    async (track?: TrackKey | null) => {
      setGenerating(true);
      setGenerateError(null);
      try {
        const { data } = await axiosInstance.post<{
          assessment: ReadinessAssessment;
          skillTrends: SkillTrend[];
          availability: Availability;
        }>(
          "/api/readiness/generate",
          track ? { track } : {},
          { timeout: READINESS_AI_TIMEOUT },
        );

        setAssessment(data.assessment);
        setSkillTrends(data.skillTrends || []);
        setAvailability(data.availability);

        // Refresh the chart so the run that just happened appears in it.
        try {
          const { data: h } = await axiosInstance.get<{
            history: ReadinessHistoryEntry[];
          }>("/api/readiness/history");
          setHistory(h.history || []);
        } catch {
          // The new assessment is already on screen; a stale chart is the only
          // cost, and the next load fixes it.
        }
        return true;
      } catch (error) {
        setGenerateError(
          apiErrorMessage(error, "Could not generate your readiness report."),
        );
        return false;
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  /** Upload + analyse a resume. Resolves true on success. */
  const uploadResume = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadPartial(false);
    try {
      const form = new FormData();
      form.append("resume", file);

      const { data } = await axiosInstance.post<{
        profile: ResumeProfile;
        partial: boolean;
      }>("/api/readiness/resume", form, { timeout: READINESS_AI_TIMEOUT });

      setProfile(data.profile);
      setUploadPartial(Boolean(data.partial));
      setAvailability((prev) =>
        prev
          ? {
              ...prev,
              hasResume: true,
              resumeUpdatedAt: data.profile.updatedAt,
              canGenerate: true,
            }
          : prev,
      );
      return true;
    } catch (error) {
      setUploadError(apiErrorMessage(error, "Could not analyse that resume."));
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    config,
    assessment,
    profile,
    skillTrends,
    history,
    availability,

    loading,
    loadError,
    historyError,
    reload: load,

    generate,
    generating,
    generateError,
    dismissGenerateError: () => setGenerateError(null),

    uploadResume,
    uploading,
    uploadError,
    uploadPartial,
    dismissUploadError: () => setUploadError(null),
  };
}

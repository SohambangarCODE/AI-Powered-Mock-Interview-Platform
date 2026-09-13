"use client";

import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import type {
  Achievement,
  AttemptHistoryItem,
  LeaderboardRow,
  ChallengeTemplate,
  UserArenaStats,
} from "@/lib/arena";

// ── Challenge list ─────────────────────────────────────────

export function useChallenges(enabled: boolean) {
  const [challenges, setChallenges] = useState<ChallengeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get("/api/arena/challenges");
      setChallenges(data.challenges || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { challenges, loading, error, refetch: fetch };
}

// ── Leaderboard ────────────────────────────────────────────

export function useLeaderboard(enabled: boolean) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [currentUser, setCurrentUser] = useState<UserArenaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get("/api/arena/leaderboard");
      setLeaderboard(data.leaderboard || []);
      setCurrentUser(data.currentUser || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { leaderboard, currentUser, loading, error, refetch: fetch };
}

// ── User arena profile ─────────────────────────────────────

export function useArenaProfile(enabled: boolean) {
  const [profile, setProfile] = useState<UserArenaStats | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get("/api/arena/me");
      setProfile(data.profile || null);
      setRank(data.rank ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load arena profile");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { profile, rank, loading, error, refetch: fetch };
}

// ── Achievements ───────────────────────────────────────────

export function useAchievements(enabled: boolean) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get("/api/arena/me/achievements");
      setAchievements(data.achievements || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load achievements");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { achievements, loading, error, refetch: fetch };
}

// ── Attempt history ────────────────────────────────────────

export function useAttemptHistory(enabled: boolean) {
  const [history, setHistory] = useState<AttemptHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get("/api/arena/me/history?limit=20");
      setHistory(data.attempts || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { history, total, loading, error, refetch: fetch };
}

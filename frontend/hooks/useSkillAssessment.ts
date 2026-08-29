"use client";

import { useCallback, useEffect, useState } from "react";

import axiosInstance from "@/lib/axios";
import { apiErrorMessage } from "@/lib/interview";
import {
  READINESS_AI_TIMEOUT,
  type Quiz,
  type SkillAssessmentState,
} from "@/lib/readiness";

/**
 * The AI-generated multiple-choice skill assessment.
 *
 * Questions are generated server-side from the candidate's own resume skills and
 * arrive without the answer key; scoring happens on the server on submit. Nothing
 * here can reveal or decide a correct answer.
 */
export function useSkillAssessment(enabled: boolean) {
  const [state, setState] = useState<SkillAssessmentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /** The quiz currently being taken, if any. */
  const [active, setActive] = useState<Quiz | null>(null);
  /** questionIndex (1-based) → chosen option index. */
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data } = await axiosInstance.get<SkillAssessmentState>(
        "/api/readiness/assessment",
      );
      setState(data);
      // A quiz left unfinished is picked back up where it was, including any
      // answers already recorded on the server.
      if (data.inProgress) {
        setActive(data.inProgress);
        setAnswers(
          Object.fromEntries(
            data.inProgress.questions
              .filter((q) => typeof q.selectedIndex === "number")
              .map((q) => [q.index, q.selectedIndex as number]),
          ),
        );
      }
    } catch (error) {
      setLoadError(
        apiErrorMessage(error, "Could not load your skill assessments."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount is the one thing an effect is for. The rule flags the
    // `setLoading(true)` that runs before the first await; the sibling
    // useInterviewHistory hook does the same and this mirrors it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) load();
  }, [enabled, load]);

  const start = useCallback(async (skills?: string[]) => {
    setStarting(true);
    setActionError(null);
    try {
      const { data } = await axiosInstance.post<{
        assessment: Quiz;
        resumed: boolean;
      }>(
        "/api/readiness/assessment/start",
        skills?.length ? { skills } : {},
        { timeout: READINESS_AI_TIMEOUT },
      );
      setActive(data.assessment);
      setAnswers({});
      // Mirror it into state so closing the quiz leaves a resumable record on
      // screen without a refetch (which would re-open it).
      setState((prev) => (prev ? { ...prev, inProgress: data.assessment } : prev));
      return true;
    } catch (error) {
      setActionError(
        apiErrorMessage(error, "Could not generate an assessment right now."),
      );
      return false;
    } finally {
      setStarting(false);
    }
  }, []);

  const choose = useCallback((questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  }, []);

  /** Submit for server-side scoring. Resolves the graded quiz, or null. */
  const submit = useCallback(async (): Promise<Quiz | null> => {
    if (!active) return null;
    setSubmitting(true);
    setActionError(null);
    try {
      const payload = active.questions.map((q) => ({
        index: q.index,
        selectedIndex: answers[q.index] ?? null,
      }));

      const { data } = await axiosInstance.post<{ assessment: Quiz }>(
        "/api/readiness/assessment/submit",
        { assessmentId: active.id, answers: payload },
      );

      setActive(null);
      setAnswers({});
      // Pull the refreshed history/latest so the result panel and the readiness
      // inputs both reflect the submission.
      await load();
      return data.assessment;
    } catch (error) {
      setActionError(
        apiErrorMessage(error, "Could not submit your assessment."),
      );
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [active, answers, load]);

  /** Abandon the on-screen quiz without submitting. It stays resumable. */
  const close = useCallback(() => {
    // Answers are deliberately kept: they are only persisted server-side on
    // submit, so clearing them here would silently throw the work away.
    setActive(null);
  }, []);

  /** Re-open the unfinished quiz, with any answers already chosen. */
  const resume = useCallback(() => {
    if (state?.inProgress) setActive(state.inProgress);
  }, [state]);

  const answeredCount = active
    ? active.questions.filter((q) => answers[q.index] !== undefined).length
    : 0;

  return {
    state,
    loading,
    loadError,
    reload: load,

    active,
    answers,
    answeredCount,
    choose,

    start,
    starting,
    submit,
    submitting,
    close,
    resume,

    actionError,
    dismissActionError: () => setActionError(null),
  };
}

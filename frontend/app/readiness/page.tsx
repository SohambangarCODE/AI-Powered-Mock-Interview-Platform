"use client";

import {
  Brain,
  FileText,
  Gauge,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AnalysisPanels from "@/components/readiness/AnalysisPanels";
import ProgressHistoryCard from "@/components/readiness/ProgressHistoryCard";
import ReadinessScoreCard from "@/components/readiness/ReadinessScoreCard";
import ResumeAnalysisCard from "@/components/readiness/ResumeAnalysisCard";
import RoadmapCard from "@/components/readiness/RoadmapCard";
import SkillAssessmentCard from "@/components/readiness/SkillAssessmentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { LoadingState, Skeleton } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/hooks/useAuth";
import { useReadiness } from "@/hooks/useReadiness";
import { trackIcon, type TrackKey } from "@/lib/readiness";
import { cn } from "@/lib/utils";

/**
 * The AI Placement Readiness page.
 *
 * Everything shown is read from the API: the score, the weights behind it, the
 * category, the analysis, the roadmap and the history all come from
 * /api/readiness/*. This page never computes a score or applies a threshold.
 */
export default function ReadinessPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();

  const {
    config,
    assessment,
    profile,
    skillTrends,
    history,
    availability,
    loading,
    loadError,
    historyError,
    reload,
    generate,
    generating,
    generateError,
    dismissGenerateError,
    uploadResume,
    uploading,
    uploadError,
    uploadPartial,
    dismissUploadError,
  } = useReadiness(isLoggedIn);

  /** null = let the backend detect the track from the resume. */
  const [track, setTrack] = useState<TrackKey | null>(null);
  /** Set when an input changed after the last report was generated. */
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  const handleGenerate = async () => {
    const ok = await generate(track);
    if (ok) setStale(false);
  };

  const handleUpload = async (file: File) => {
    const ok = await uploadResume(file);
    if (ok && assessment) setStale(true);
    return ok;
  };

  const handlePractise = (domain: string) => {
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

  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const canGenerate = availability?.canGenerate ?? false;
  const tracks = config?.tracks ?? [];

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow={firstName ? `Placement readiness for ${firstName}` : "Placement readiness"}
          title="AI Placement Readiness"
          description="Your resume, mock interviews, skill assessments and communication performance combined into one score — with the gaps and the plan to close them."
          actions={
            assessment ? (
              <Button
                size="lg"
                onClick={handleGenerate}
                loading={generating}
                disabled={!canGenerate}
              >
                {!generating && <RotateCcw aria-hidden />}
                {generating ? "Recalculating…" : "Recalculate"}
              </Button>
            ) : undefined
          }
        />

        {/* ── Inputs summary ── */}
        {availability && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Resume"
              value={availability.hasResume ? "On file" : "Not uploaded"}
              sub={
                availability.hasResume
                  ? "Skills, projects and experience extracted"
                  : "Required to generate a report"
              }
              icon={FileText}
              tone={availability.hasResume ? "success" : "warning"}
            />
            <StatCard
              label="Mock Interviews"
              value={availability.interviewCount}
              sub="Feeds the interview and communication scores"
              icon={Brain}
              tone={availability.interviewCount > 0 ? "primary" : "default"}
            />
            <StatCard
              label="Skill Assessments"
              value={availability.assessmentCount}
              sub="Measures the skills you claim"
              icon={Wrench}
              tone={availability.assessmentCount > 0 ? "primary" : "default"}
            />
            <StatCard
              label="Readiness Reports"
              value={history.length}
              sub={
                assessment
                  ? "Latest is shown below"
                  : "Generate your first report"
              }
              icon={Gauge}
              tone={assessment ? "primary" : "default"}
            />
          </div>
        )}

        {/* ── Load failure ── */}
        {loadError && (
          <Card className="mt-8 border-destructive/25 bg-destructive/5">
            <div className="flex flex-wrap items-start gap-3">
              <TriangleAlert
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-destructive">
                  {loadError}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nothing was lost — your saved reports are still on the server.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reload}>
                <RotateCcw aria-hidden />
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* ── Generate error ── */}
        {generateError && (
          <Card className="mt-8 border-destructive/25 bg-destructive/5">
            <div className="flex flex-wrap items-start gap-3">
              <TriangleAlert
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />
              <p className="min-w-0 flex-1 text-sm font-semibold text-destructive">
                {generateError}
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismissGenerateError}
                className="shrink-0 text-destructive/70 transition-colors outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="mt-8 space-y-4">
            <Card className="gap-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-32 w-full" />
            </Card>
            <Card className="gap-4">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-24 w-full" />
            </Card>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* ── Track selector ── */}
            {tracks.length > 0 && (
              <section className="space-y-3">
                <SectionHeader
                  title="Your track"
                  description="Recommendations are written for the track you are targeting. Leave it on auto and it is detected from your resume."
                />
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  <TrackTile
                    active={track === null}
                    onClick={() => setTrack(null)}
                    icon={Sparkles}
                    label="Auto-detect"
                    description="Infer from my resume's experience"
                  />
                  {tracks.map((option) => (
                    <TrackTile
                      key={option.id}
                      active={track === option.id}
                      onClick={() => setTrack(option.id)}
                      icon={trackIcon(option.id)}
                      label={option.label}
                      description={option.description}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Score / first run ── */}
            {assessment ? (
              <>
                {stale && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
                  >
                    <Sparkles
                      className="size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                      Your inputs changed since this report was generated.
                      Recalculate to bring the score up to date.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleGenerate}
                      loading={generating}
                      className="shrink-0"
                    >
                      {!generating && <RotateCcw aria-hidden />}
                      Recalculate
                    </Button>
                  </div>
                )}

                <ReadinessScoreCard
                  assessment={assessment}
                  config={config}
                  onRegenerate={handleGenerate}
                  generating={generating}
                />

                <AnalysisPanels analysis={assessment.analysis} />

                <RoadmapCard
                  roadmap={assessment.roadmap}
                  trackLabel={assessment.trackLabel}
                  track={assessment.track}
                  onPractise={handlePractise}
                />
              </>
            ) : (
              !loadError && (
                <Card className="border-dashed">
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Gauge className="size-7" aria-hidden />
                    </span>
                    <p className="text-lg font-semibold text-foreground">
                      No readiness report yet
                    </p>
                    <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
                      {canGenerate
                        ? "Everything needed is on file. Generate your report and we will score your resume, interviews, skill assessments and communication, then write you a roadmap."
                        : "Upload your resume below to unlock the readiness score. Mock interviews and skill assessments make it more accurate, but they are not required to start."}
                    </p>
                    <div className="mt-5">
                      <Button
                        size="lg"
                        onClick={handleGenerate}
                        loading={generating}
                        disabled={!canGenerate}
                      >
                        {!generating && <Gauge aria-hidden />}
                        {generating
                          ? "Analysing your profile…"
                          : "Generate my readiness report"}
                      </Button>
                    </div>
                    {!canGenerate && (
                      <Badge variant="warning" size="sm" className="mt-3">
                        Resume required
                      </Badge>
                    )}
                  </div>
                </Card>
              )
            )}

            {/* ── Resume ── */}
            <ResumeAnalysisCard
              profile={profile}
              uploading={uploading}
              uploadError={uploadError}
              uploadPartial={uploadPartial}
              onUpload={handleUpload}
              onDismissError={dismissUploadError}
            />

            {/* ── Skill assessment ── */}
            <SkillAssessmentCard
              enabled={isLoggedIn}
              questionCount={config?.assessment.questionsPerAssessment}
              maxSkills={config?.assessment.maxSkillsPerAssessment}
              bands={config?.scoreBands}
              onCompleted={() => {
                if (assessment) setStale(true);
              }}
            />

            {/* ── History ── */}
            <ProgressHistoryCard
              history={history}
              skillTrends={skillTrends}
              bands={config?.scoreBands}
              error={historyError}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** One selectable track in the track picker. */
function TrackTile({
  active,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-primary/25 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}

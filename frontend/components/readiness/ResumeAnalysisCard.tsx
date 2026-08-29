"use client";

import {
  Award,
  Briefcase,
  CircleCheck,
  CloudUpload,
  FileText,
  FolderGit2,
  GraduationCap,
  RefreshCw,
  TriangleAlert,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { formatRelative } from "@/lib/interview";
import {
  ACCEPTED_RESUME_EXTENSIONS,
  EXPERIENCE_TYPE_LABEL,
  MAX_RESUME_SIZE_MB,
  formatFileSize,
  formatYears,
  validateResumeFile,
  type ResumeProfile,
} from "@/lib/readiness";
import { cn } from "@/lib/utils";

/**
 * Resume upload + the structured extraction the AI produced from it.
 *
 * Nothing here is illustrative: every skill, project, role, certificate and
 * degree shown was parsed out of the file the candidate uploaded and read back
 * from the database.
 */
export default function ResumeAnalysisCard({
  profile,
  uploading,
  uploadError,
  uploadPartial,
  onUpload,
  onDismissError,
}: {
  profile: ResumeProfile | null;
  uploading: boolean;
  uploadError: string | null;
  uploadPartial: boolean;
  onUpload: (file: File) => Promise<boolean>;
  onDismissError: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  const showUploader = !profile || replacing;
  const error = localError || uploadError;

  const pickFile = (f: File) => {
    const problem = validateResumeFile(f);
    if (problem) {
      setLocalError(problem);
      setFile(null);
      return;
    }
    setLocalError(null);
    onDismissError();
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    const ok = await onUpload(file);
    if (ok) {
      setFile(null);
      setReplacing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const cancelReplace = () => {
    setReplacing(false);
    setFile(null);
    setLocalError(null);
    onDismissError();
  };

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Resume Analysis
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile
                ? `${profile.fileName || "Resume"} · ${formatFileSize(profile.fileSize)} · updated ${formatRelative(profile.updatedAt)}`
                : "Upload a resume to unlock the readiness score"}
            </p>
          </div>
        </div>
        {profile && !replacing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReplacing(true)}
            className="shrink-0"
          >
            <RefreshCw aria-hidden />
            Replace
          </Button>
        )}
      </div>

      <div className="p-5">
        {/* ── Uploading ── */}
        {uploading && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Spinner size="lg" className="text-primary" label="Analysing" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-semibold text-foreground">
                Extracting your resume…
              </p>
              <p className="text-xs text-muted-foreground">
                Reading skills, projects, experience, certifications and
                education. This usually takes 5–15 seconds.
              </p>
            </div>
          </div>
        )}

        {/* ── Upload form ── */}
        {!uploading && showUploader && (
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a resume file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) pickFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              className={cn(
                "relative cursor-pointer rounded-xl border border-dashed p-8 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                dragging
                  ? "border-primary bg-primary/5"
                  : file
                    ? "border-primary/40 bg-primary/5"
                    : "border-border-strong hover:border-primary/50 hover:bg-muted/40",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_RESUME_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                }}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="max-w-[200px] truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setLocalError(null);
                    }}
                    className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors outline-none hover:bg-border hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                    <CloudUpload className="size-5" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    Drop your resume here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse ·{" "}
                    {ACCEPTED_RESUME_EXTENSIONS.join(" or ").toUpperCase()} · Max{" "}
                    {MAX_RESUME_SIZE_MB} MB
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5"
              >
                <TriangleAlert
                  className="mt-px size-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleUpload} disabled={!file} className="flex-1">
                <CloudUpload aria-hidden />
                Analyse Resume
              </Button>
              {replacing && (
                <Button variant="ghost" onClick={cancelReplace}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Extraction ── */}
        {!uploading && profile && !replacing && (
          <div className="space-y-6">
            {uploadPartial && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5"
              >
                <TriangleAlert
                  className="mt-px size-4 shrink-0 text-warning-foreground"
                  aria-hidden
                />
                <p className="text-sm text-warning-foreground">
                  The upload succeeded but little structure could be extracted.
                  A text-based PDF (not a scan) gives a much better resume score.
                </p>
              </div>
            )}

            {profile.summary && (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                    AI Summary
                  </p>
                  <Badge variant="outline" size="sm" className="ml-auto">
                    {profile.experienceLevel} Level
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {formatYears(profile.totalYearsExperience)} experience
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {profile.summary}
                </p>
              </div>
            )}

            {/* Skills */}
            <Section
              icon={Wrench}
              title="Skills"
              count={profile.skills.length}
              empty="No skills could be extracted."
            >
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <Badge
                    key={skill.name}
                    variant="neutral"
                    size="sm"
                    title={skill.evidence || skill.category}
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </Section>

            {/* Projects */}
            <Section
              icon={FolderGit2}
              title="Projects"
              count={profile.projects.length}
              empty="No projects listed on your resume."
            >
              <ul className="space-y-2.5">
                {profile.projects.map((p) => (
                  <li
                    key={p.name}
                    className="rounded-lg border border-border p-3.5"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    {p.technologies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.technologies.map((t) => (
                          <Badge key={t} variant="outline" size="sm">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Experience */}
            <Section
              icon={Briefcase}
              title="Experience"
              count={profile.experience.length}
              empty="No work experience listed."
            >
              <ul className="space-y-2.5">
                {profile.experience.map((e, i) => (
                  <li
                    key={`${e.role}-${e.organization}-${i}`}
                    className="rounded-lg border border-border p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {e.role || "Role not stated"}
                      </p>
                      <Badge variant="outline" size="sm">
                        {EXPERIENCE_TYPE_LABEL[e.type] || e.type}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[e.organization, e.duration].filter(Boolean).join(" · ")}
                    </p>
                    {e.highlights.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {e.highlights.map((h) => (
                          <li
                            key={h}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <span
                              className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground"
                              aria-hidden
                            />
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Certifications */}
            <Section
              icon={Award}
              title="Certifications"
              count={profile.certifications.length}
              empty="No certifications listed."
            >
              <ul className="space-y-2">
                {profile.certifications.map((c, i) => (
                  <li
                    key={`${c.name}-${i}`}
                    className="flex items-start gap-2.5 rounded-lg border border-border p-3"
                  >
                    <CircleCheck
                      className="mt-px size-4 shrink-0 text-success"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {c.name}
                      </p>
                      {(c.issuer || c.year) && (
                        <p className="text-xs text-muted-foreground">
                          {[c.issuer, c.year].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Education */}
            <Section
              icon={GraduationCap}
              title="Education"
              count={profile.education.length}
              empty="No education listed."
            >
              <ul className="space-y-2">
                {profile.education.map((e, i) => (
                  <li
                    key={`${e.degree}-${i}`}
                    className="rounded-lg border border-border p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {e.degree || "Qualification"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[e.institution, e.year, e.score]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {/* ── Empty (no profile, uploader hidden — cannot happen today, kept honest) ── */}
        {!uploading && !profile && !showUploader && (
          <EmptyState
            icon={FileText}
            title="No resume on file"
            description="Upload a resume to have your skills, projects and experience extracted."
          />
        )}
      </div>
    </Card>
  );
}

/** One extraction section, collapsed to a single line when it is empty. */
function Section({
  icon: Icon,
  title,
  count,
  empty,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        {title}
        {count > 0 && (
          <span className="tnum font-normal text-muted-foreground">
            ({count})
          </span>
        )}
      </p>
      {count > 0 ? (
        children
      ) : (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

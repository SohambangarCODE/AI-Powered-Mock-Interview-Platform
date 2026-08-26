import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const sizeClass = {
  sm: "size-3.5",
  default: "size-4",
  lg: "size-6",
} as const

/** Indeterminate activity indicator. */
export function Spinner({
  size = "default",
  className,
  label = "Loading",
}: {
  size?: keyof typeof sizeClass
  className?: string
  label?: string
}) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("animate-spin text-muted-foreground", sizeClass[size], className)}
    />
  )
}

/**
 * Centred spinner + caption, for a panel that is waiting on its first payload.
 * Use Skeleton instead when the eventual shape of the content is known.
 */
export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className
      )}
    >
      <Spinner size="lg" className="text-primary" label={label} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/** Grey placeholder block that mirrors the shape of the content still loading. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  )
}

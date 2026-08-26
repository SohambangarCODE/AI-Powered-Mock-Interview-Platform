import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const toneClass = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
} as const

export type StatTone = keyof typeof toneClass

/**
 * Single metric tile. Every instance has the same three rows — label, primary
 * number, supporting line — so a row of them lines up regardless of content
 * length, and none of them grows taller than its neighbours.
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: LucideIcon
  tone?: StatTone
  className?: string
}) {
  return (
    <Card className={cn("gap-0 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              toneClass[tone]
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>

      <p className="tnum mt-3 text-2xl leading-none font-semibold text-foreground">
        {value}
      </p>

      {/* Reserved line keeps every card the same height even without a sub */}
      <p className="mt-2 min-h-4 text-xs text-muted-foreground">{sub}</p>
    </Card>
  )
}

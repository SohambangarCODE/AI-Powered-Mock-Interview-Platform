import Link from "next/link"
import { MessagesSquare } from "lucide-react"

import { cn } from "@/lib/utils"

const sizes = {
  sm: { box: "size-8 rounded-lg", icon: "size-4", name: "text-sm", sub: "text-[10px]" },
  default: {
    box: "size-9 rounded-lg",
    icon: "size-[18px]",
    name: "text-[15px]",
    sub: "text-[10px]",
  },
  lg: { box: "size-11 rounded-xl", icon: "size-5", name: "text-lg", sub: "text-[11px]" },
} as const

/**
 * Product mark. Previously duplicated inline in the navbar and both auth
 * screens; kept here so the three always match.
 */
export function Logo({
  href = "/",
  size = "default",
  showWordmark = true,
  className,
}: {
  /** Pass null to render a non-interactive mark (e.g. inside a link already). */
  href?: string | null
  size?: keyof typeof sizes
  showWordmark?: boolean
  className?: string
}) {
  const s = sizes[size]

  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary text-primary-foreground",
          s.box
        )}
      >
        <MessagesSquare className={s.icon} aria-hidden />
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn("font-heading font-semibold tracking-tight text-foreground", s.name)}
          >
            MockInterview
          </span>
          <span
            className={cn(
              "mt-0.5 font-medium tracking-wide text-muted-foreground uppercase",
              s.sub
            )}
          >
            AI Powered
          </span>
        </span>
      )}
    </>
  )

  const classes = cn("flex items-center gap-2.5", className)

  if (!href) return <span className={classes}>{content}</span>

  return (
    <Link
      href={href}
      aria-label="MockInterview home"
      className={cn(
        classes,
        "rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
      )}
    >
      {content}
    </Link>
  )
}

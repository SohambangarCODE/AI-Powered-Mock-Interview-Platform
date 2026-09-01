"use client"

import * as React from "react"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />

        {/* Centring wrapper — fixed to the viewport, never itself scrolls or
            resizes based on the dialog's content. */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content
            className={cn(
              // grid-rows: header / scrollable body / footer. Grid gives each
              // row a hard track size instead of flex's flex-1-vs-content
              // negotiation, so the middle row is reliably the only one that
              // scrolls, and the height is a real fixed value (not a max-*
              // cap fighting a translate that reads that same value).
              "grid h-[85dvh] max-h-[720px] w-full max-w-lg grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-border bg-card shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              className
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0 space-y-1">
                <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-sm text-muted-foreground">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Close"
                className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-4" aria-hidden />
              </Dialog.Close>
            </div>

            {children && (
              <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>
            )}

            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-6 py-4">
                {footer}
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
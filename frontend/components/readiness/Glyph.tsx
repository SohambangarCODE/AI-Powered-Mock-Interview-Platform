"use client";

import { createElement } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Renders a lucide icon that was resolved from a runtime key.
 *
 * Aliasing a looked-up icon to `const Icon = iconFor(key)` and rendering
 * `<Icon />` reads to the React lint rules as a component created during
 * render. Icons taken straight from a static config array are fine as JSX; the
 * ones derived from a function call come through here instead.
 */
export function Glyph({
  icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return createElement(icon, { className, "aria-hidden": true });
}

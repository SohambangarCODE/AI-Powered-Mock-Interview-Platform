"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  Target,
  BarChart3,
  Gauge,
  Sparkles,
  Search,
  Puzzle,
} from "lucide-react";

function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }
    const sectionIds = ["features", "how-it-works", "domains"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );

    const els = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pathname]);

  const isActive = (path: string) => {
    if (path.startsWith("/#")) {
      return pathname === "/" && activeSection === path.replace("/#", "");
    }
    if (path === "/sessions") {
    return pathname === path || pathname.startsWith("/sessions/");
  }
    return pathname === path;

  };

  const handleNavClick = (e: React.MouseEvent<HTMLElement>, href: string) => {
    if (href.startsWith("/#") && pathname === "/") {
      e.preventDefault();
      const id = href.replace("/#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });

        window.history.replaceState(null, "", href);
      }
    }
    setMobileMenuOpen(false);
  };

  const navLinks = isLoggedIn
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/interview", label: "Practice", icon: Target },
        { href: "/sessions", label: "My Sessions", icon: BarChart3 },
        { href: "/readiness", label: "Readiness", icon: Gauge },
      ]
    : [
        { href: "/#features", label: "Features", icon: Sparkles },
        { href: "/#how-it-works", label: "How It Works", icon: Search },
        { href: "/#domains", label: "Domains", icon: Puzzle },
      ];

  // Two items can share a destination, so highlight by position rather than by
  // href — otherwise both would read as current at the same time.
  const activeIndex = navLinks.findIndex((link) => isActive(link.href));

  const initials =
    (user?.name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";
  const firstName = (user?.name || "User").split(" ")[0];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-background",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo href={isLoggedIn ? "/dashboard" : "/"} />

          {/* Desktop nav links */}
          <div className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link, i) => {
              const Icon = link.icon;
              const active = i === activeIndex;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop right side */}
          <div className="hidden items-center gap-2 md:flex">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-2.5 rounded-full border border-border bg-muted/50 py-1 pr-3 pl-1">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {initials}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    Hi, {firstName}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Get Started for free</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        className={cn(
          "overflow-hidden border-t border-border transition-all duration-200 ease-in-out md:hidden",
          mobileMenuOpen
            ? "max-h-[28rem] opacity-100"
            : "max-h-0 border-t-0 opacity-0",
        )}
      >
        <div className="space-y-1 bg-background px-4 py-4 sm:px-6">
          {navLinks.map((link, i) => {
            const Icon = link.icon;
            const active = i === activeIndex;
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {link.label}
              </Link>
            );
          })}

          <div className="mt-2 border-t border-border pt-3">
            {isLoggedIn ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 px-1">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </span>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-medium text-foreground">
                      {firstName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={logout}>
                  Log Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Log In
                  </Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started for free
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ROLE_HOME } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  LayoutDashboard,
  Target,
  Building2,
  BarChart3,
  Gauge,
  Sparkles,
  Search,
  Puzzle,
  Swords,
  Settings,
  Users,
  MessageSquare,
  LineChart,
  ShieldCheck,
  ChevronDown,
  LogOut,
} from "lucide-react";

// ── Role-based nav link definitions ──────────────────────────────────────────
// Settings / Feedback / Log Out live in the profile dropdown now, not here.
const STUDENT_LINKS = [
  { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
  { href: "/interview",  label: "Practice",     icon: Target },
  { href: "/sessions",   label: "My Sessions",  icon: BarChart3 },
  { href: "/recruiter",  label: "Recruiter",    icon: Building2 },
  { href: "/readiness",  label: "Readiness",    icon: Gauge },
  { href: "/arena",      label: "Arena",        icon: Swords },
];

const MENTOR_LINKS = [
  { href: "/mentor?tab=dashboard",   label: "Dashboard",    icon: LayoutDashboard },
  { href: "/mentor?tab=students",    label: "My Students",  icon: Users },
];

const ADMIN_LINKS = [
  { href: "/admin?tab=dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin?tab=users",        label: "Users",       icon: Users },
  { href: "/admin?tab=analytics",    label: "Analytics",   icon: LineChart },
];

const PUBLIC_LINKS = [
  { href: "/#features",     label: "Features",    icon: Sparkles },
  { href: "/#how-it-works", label: "How It Works", icon: Search },
  { href: "/#domains",      label: "Domains",     icon: Puzzle },
];

function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, logout, role } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    // If it's a hash link on the homepage
    if (path.startsWith("/#")) {
      return pathname === "/" && activeSection === path.replace("/#", "");
    }
    
    // Check path with query parameters if present
    const [basePath, queryStr] = path.split("?");
    if (queryStr) {
      const targetParams = new URLSearchParams(queryStr);
      const isCorrectPath = pathname === basePath || pathname.startsWith(basePath + "/");
      let matchesAllParams = true;
      for (const [key, val] of targetParams.entries()) {
        if (searchParams.get(key) !== val) {
          matchesAllParams = false;
          break;
        }
      }
      // Special case: if tab=dashboard, we consider it active if the query param is exactly "dashboard"
      // or if it's completely missing (which defaults to dashboard).
      if (basePath === "/mentor" && targetParams.get("tab") === "dashboard" && !searchParams.has("tab")) {
         return pathname === basePath;
      }
      if (basePath === "/admin" && targetParams.get("tab") === "dashboard" && !searchParams.has("tab")) {
         return pathname === basePath;
      }
      return isCorrectPath && matchesAllParams;
    }

    if (path === "/sessions") {
      return pathname === path || pathname.startsWith("/sessions/");
    }
    if (path === "/arena") {
      return pathname === path || pathname.startsWith("/arena/");
    }
    if (path === "/recruiter") {
      return pathname === path || pathname.startsWith("/recruiter/");
    }
    if (path === "/feedback") {
      return pathname === path || pathname.startsWith("/feedback/");
    }
    if (path === "/admin") {
      return pathname === "/admin";
    }
    if (path === "/mentor") {
      return pathname === "/mentor" || pathname.startsWith("/mentor/");
    }
    return pathname === path;
  };

  // Resolve nav links based on role
  // Default to PUBLIC_LINKS during SSR to prevent hydration mismatch.
  const navLinks = (!mounted || !isLoggedIn)
    ? PUBLIC_LINKS
    : role === "Administrator"
    ? ADMIN_LINKS
    : role === "Mentor"
    ? MENTOR_LINKS
    : STUDENT_LINKS;

  // Feedback only makes sense for students; keep it out of the dropdown for other roles.
  const showFeedback = isLoggedIn && role !== "Administrator" && role !== "Mentor";

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

  // Two items can share a destination, so highlight by position rather than by
  // href — otherwise both would read as current at the same time.
  const activeIndex = navLinks.findIndex((link) => isActive(link.href));

  // Account-area pages (settings/feedback) now live in the dropdown, so the
  // trigger itself needs to show "current" state for them.
  const isAccountActive =
    isActive("/settings") || (showFeedback && isActive("/feedback"));

  const initials =
    (user?.name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";
  const firstName = (user?.name || "User").split(" ")[0];

  // Role badge color
  const ROLE_BADGE: Record<string, string> = {
    Administrator: "bg-destructive/10 text-destructive border border-destructive/20",
    Mentor:        "bg-chart-5/10 text-chart-5 border border-chart-5/20",
    Student:       "bg-primary/10 text-primary border border-primary/20",
  };
  const roleBadgeClass = role ? ROLE_BADGE[role] : ROLE_BADGE.Student;

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
          <Logo href={(mounted && isLoggedIn) ? (ROLE_HOME[role as keyof typeof ROLE_HOME] ?? "/dashboard") : "/"} />

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
            {(mounted && isLoggedIn) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2.5 rounded-full border py-1 pr-2.5 pl-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      isAccountActive
                        ? "border-primary/30 bg-primary/10"
                        : "border-border bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {initials}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground leading-tight">
                        Hi, {firstName}
                      </span>
                      {role && (
                        <span className={cn("rounded px-1 text-[10px] font-semibold leading-tight", roleBadgeClass)}>
                          {role}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{user?.name || "User"}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="size-4" aria-hidden />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {showFeedback && (
                    <DropdownMenuItem asChild>
                      <Link href="/feedback" className="flex items-center gap-2 cursor-pointer">
                        <MessageSquare className="size-4" aria-hidden />
                        Feedback
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            ? "max-h-[36rem] opacity-100"
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
            {(mounted && isLoggedIn) ? (
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
                    {role && (
                      <span className={cn("mt-0.5 w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold", roleBadgeClass)}>
                        {role}
                      </span>
                    )}
                  </div>
                </div>

                {/* Account actions, grouped under the profile — same items as the desktop dropdown */}
                <div className="space-y-1">
                  <Link
                    href="/settings"
                    onClick={(e) => handleNavClick(e, "/settings")}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive("/settings")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Settings className="size-4" aria-hidden />
                    Settings
                  </Link>
                  {showFeedback && (
                    <Link
                      href="/feedback"
                      onClick={(e) => handleNavClick(e, "/feedback")}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive("/feedback")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <MessageSquare className="size-4" aria-hidden />
                      Feedback
                    </Link>
                  )}
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
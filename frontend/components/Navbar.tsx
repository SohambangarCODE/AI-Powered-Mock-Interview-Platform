"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LayoutDashboard,
  Target,
  BarChart3,
  Sparkles,
  Search,
  Puzzle,
} from "lucide-react";

function Navbar() {
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    createdAt: "2023-01-01T00:00:00Z",
    _id: "1",
  }; // Replace with your actual user data

  const isLoggedIn = true; // Replace with your actual authentication logic
  const logout = () => {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  const navLinks = isLoggedIn
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/practice", label: "Practice", icon: Target },
        { href: "/history", label: "My Sessions", icon: BarChart3 },
      ]
    : [
        { href: "/#features", label: "Features", icon: Sparkles },
        { href: "/#how-it-works", label: "How It Works", icon: Search },
        { href: "/#domains", label: "Domains", icon: Puzzle },
      ];

  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";
  const firstName = user.name.split(" ")[0] || "User";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 p-1 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-background/40 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group flex-shrink-0"
          >
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl rotate-6 opacity-40 group-hover:rotate-12 transition-transform duration-300" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-black text-sm tracking-tight">
                  AI
                </span>
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
                MockInterview
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">
                AI Powered
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <button
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    {isActive(link.href) && (
                      <span className="sr-only">(current)</span>
                    )}
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-muted/60">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-white">
                      {initials}
                    </span>
                  </div>
                  <span className="text-sm text-foreground">
                    Hi, <span className="font-medium">{firstName}</span>
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  >
                    Get Started for free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-border ${
          mobileMenuOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 sm:px-6 py-4 space-y-1 bg-background/95 backdrop-blur-md">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <button
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {isActive(link.href) && (
                    <span className="sr-only">(current)</span>
                  )}
                </button>
              </Link>
            );
          })}

          <div className="pt-3 mt-2 border-t border-border">
            {isLoggedIn ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {initials}
                    </span>
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium text-foreground">
                      {firstName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={logout}>
                  Log Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                    Get Started for free
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

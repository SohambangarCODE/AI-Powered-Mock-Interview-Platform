"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import React, { useState } from "react";
import { CircleAlert, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPPORT_EMAIL } from "@/lib/constants";

const page = () => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      // Specific error messages from backend
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.response?.status === 400) {
        setError("Invalid credentials. Please check your email and password.");
      } else if (err?.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Connection error. Please check your network.");
      }
    }
  };

  return (
    // The navbar is 64px and this page sits inside main's pt-16, so subtract it
    // rather than using min-h-screen and overflowing the viewport.
    <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[26rem]">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="p-2 shadow-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Log in to continue practicing your interviews
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate={false}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={error ? true : undefined}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={error ? true : undefined}
                  required
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5"
                >
                  <CircleAlert
                    className="mt-px size-4 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t-0 bg-transparent">
              <Button
                type="submit"
                size="lg"
                loading={isLoading}
                className="w-full"
              >
                {isLoading ? "Logging in..." : "Log in"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign up for free
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
  <Mail className="size-3.5 shrink-0" aria-hidden />
  Need help?{" "}
  
    <a 
    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}`}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-primary underline-offset-4 hover:underline"
  >
    {SUPPORT_EMAIL}
  </a>
</p>
      </div>
    </div>
  );
};

export default page;

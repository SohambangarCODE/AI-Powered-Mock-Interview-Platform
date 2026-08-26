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
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const page = () => {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await register(formData.name, formData.email, formData.password);
    } catch (err: any) {
      // Specific error messages from backend
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.response?.status === 400) {
        setError("Registration failed. Please check the form and try again.");
      } else if (err?.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Connection error. Please check your network.");
      }
    }
  };

  // Only surfaced once both fields have content, so it does not flash while typing.
  const mismatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  return (
    <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[26rem]">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="p-2 shadow-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>
              Start practicing interviews with AI-powered feedback
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  aria-invalid={mismatch || undefined}
                  required
                  minLength={8}
                />
                {mismatch && (
                  <p className="text-xs font-medium text-destructive">
                    Passwords do not match
                  </p>
                )}
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
                  <p className="text-sm font-medium text-destructive">{error}</p>
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
                {isLoading ? "Creating account..." : "Get started for free"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Log in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default page;

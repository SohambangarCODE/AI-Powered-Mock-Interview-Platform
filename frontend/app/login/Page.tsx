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
import Link from "next/link";
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

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
      setError(err?.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo above the card */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2.5 group">
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
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              Welcome back
            </CardTitle>
            <CardDescription>
              Log in to continue practicing your interviews
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium">
                  {error}
                </p>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                {isLoading ? "Logging in..." : "Log in"}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary font-medium hover:underline"
                >
                  Sign up for free
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
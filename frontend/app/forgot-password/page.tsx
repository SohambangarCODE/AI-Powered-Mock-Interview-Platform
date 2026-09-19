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
import { CircleAlert, CircleCheck, KeyRound } from "lucide-react";
import { forgotPassword } from "@/lib/security";

type Step = "form" | "loading" | "sent";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [step, setStep] = useState<Step>("form");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setStep("loading");

        try {
            await forgotPassword(email);
            setStep("sent");
        } catch (err: any) {
            // Network / server error — still show the generic confirmation for security
            if (err?.response?.status === 429) {
                setError("Too many requests. Please wait before trying again.");
                setStep("form");
            } else {
                // Treat as success so we don't reveal account existence
                setStep("sent");
            }
        }
    };

    if (step === "sent") {
        return (
            <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
                <div className="w-full max-w-[26rem]">
                    <div className="mb-8 flex justify-center">
                        <Logo size="lg" />
                    </div>
                    <Card className="p-2 shadow-sm">
                        <CardHeader className="space-y-1.5 text-center">
                            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-success/10">
                                <CircleCheck className="size-6 text-success" />
                            </div>
                            <CardTitle className="text-xl">Check your inbox</CardTitle>
                            <CardDescription>
                                If an account with <strong>{email}</strong> exists, we sent a
                                password reset link. Check your email (and spam folder).
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex flex-col gap-3 border-t-0 bg-transparent">
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full"
                                onClick={() => setStep("form")}
                            >
                                Try a different email
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                Remembered your password?{" "}
                                <Link
                                    href="/login"
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Log in
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
            <div className="w-full max-w-[26rem]">
                <div className="mb-8 flex justify-center">
                    <Logo size="lg" />
                </div>

                <Card className="p-2 shadow-sm">
                    <CardHeader className="space-y-1.5 text-center">
                        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <KeyRound className="size-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Forgot your password?</CardTitle>
                        <CardDescription>
                            Enter your email and we&apos;ll send you a reset link if an
                            account exists.
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    <p className="text-sm font-medium text-destructive">{error}</p>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4 border-t-0 bg-transparent">
                            <Button
                                type="submit"
                                size="lg"
                                loading={step === "loading"}
                                className="w-full"
                            >
                                {step === "loading" ? "Sending…" : "Send reset link"}
                            </Button>

                            <p className="text-center text-sm text-muted-foreground">
                                Remembered it?{" "}
                                <Link
                                    href="/login"
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Back to login
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

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
import React, { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Mail, RefreshCw } from "lucide-react";
import { verifyEmail, resendVerification } from "@/lib/security";
import { useSearchParams, useRouter } from "next/navigation";

type Step = "pending" | "verifying" | "success" | "error";

const VerifyEmailPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [step, setStep] = useState<Step>("pending");
    const [errorMsg, setErrorMsg] = useState("");
    const [resendEmail, setResendEmail] = useState("");
    const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
    const [resendError, setResendError] = useState("");

    // Auto-verify if token is in the URL (user clicked email link)
    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) return;

        setStep("verifying");
        verifyEmail(token)
            .then(() => setStep("success"))
            .catch((err: any) => {
                const msg = err?.response?.data?.message || "Verification failed.";
                setErrorMsg(msg);
                setStep("error");
            });
    }, [searchParams]);

    // Pre-fill resend email from sessionStorage (set by register flow)
    useEffect(() => {
        if (typeof window !== "undefined") {
            const pending = sessionStorage.getItem("pendingVerificationEmail");
            if (pending) setResendEmail(pending);
        }
    }, []);

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        setResendError("");
        setResendStatus("sending");
        try {
            await resendVerification(resendEmail);
            setResendStatus("sent");
        } catch {
            setResendError("Failed to resend. Please try again.");
            setResendStatus("idle");
        }
    };

    // ── Success state ──────────────────────────────────────────────────────────
    if (step === "success") {
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
                            <CardTitle className="text-xl">Email verified!</CardTitle>
                            <CardDescription>
                                Your account is confirmed. You can now log in.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex flex-col gap-3 border-t-0 bg-transparent">
                            <Button size="lg" className="w-full" onClick={() => router.push("/login")}>
                                Log in to your account
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    // ── Verifying state ────────────────────────────────────────────────────────
    if (step === "verifying") {
        return (
            <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
                <div className="w-full max-w-[26rem] text-center">
                    <div className="mb-8 flex justify-center">
                        <Logo size="lg" />
                    </div>
                    <p className="text-sm text-muted-foreground">Verifying your email…</p>
                </div>
            </div>
        );
    }

    // ── Error / link expired state ─────────────────────────────────────────────
    if (step === "error") {
        return (
            <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
                <div className="w-full max-w-[26rem]">
                    <div className="mb-8 flex justify-center">
                        <Logo size="lg" />
                    </div>
                    <Card className="p-2 shadow-sm">
                        <CardHeader className="space-y-1.5 text-center">
                            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                                <CircleAlert className="size-6 text-destructive" />
                            </div>
                            <CardTitle className="text-xl">Link invalid or expired</CardTitle>
                            <CardDescription>{errorMsg}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleResend} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="resend-email">Resend verification to</Label>
                                    <Input
                                        id="resend-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={resendEmail}
                                        onChange={(e) => setResendEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                {resendError && (
                                    <p className="text-sm text-destructive">{resendError}</p>
                                )}
                                {resendStatus === "sent" && (
                                    <p className="text-sm text-success">
                                        A new verification link has been sent — check your email.
                                    </p>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full"
                                    loading={resendStatus === "sending"}
                                    disabled={resendStatus === "sent"}
                                >
                                    <RefreshCw className="size-4" aria-hidden />
                                    {resendStatus === "sent" ? "Link sent!" : "Resend verification email"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // ── Default: "check your email" state ─────────────────────────────────────
    return (
        <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
            <div className="w-full max-w-[26rem]">
                <div className="mb-8 flex justify-center">
                    <Logo size="lg" />
                </div>

                <Card className="p-2 shadow-sm">
                    <CardHeader className="space-y-1.5 text-center">
                        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Mail className="size-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Check your email</CardTitle>
                        <CardDescription>
                            We sent a verification link to{" "}
                            {resendEmail ? (
                                <strong>{resendEmail}</strong>
                            ) : (
                                "your email address"
                            )}
                            . Click the link to activate your account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                            Didn&apos;t receive it? Check your spam folder, or resend below.
                        </div>

                        <form onSubmit={handleResend} className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="resend-email-main">Your email</Label>
                                <Input
                                    id="resend-email-main"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={resendEmail}
                                    onChange={(e) => setResendEmail(e.target.value)}
                                    required
                                />
                            </div>
                            {resendError && (
                                <p className="text-sm text-destructive">{resendError}</p>
                            )}
                            {resendStatus === "sent" && (
                                <p className="text-sm text-success">
                                    New link sent — check your inbox!
                                </p>
                            )}
                            <Button
                                type="submit"
                                variant="outline"
                                className="w-full"
                                loading={resendStatus === "sending"}
                                disabled={resendStatus === "sent"}
                            >
                                <RefreshCw className="size-4" aria-hidden />
                                {resendStatus === "sent" ? "Link sent!" : "Resend verification email"}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="border-t-0 bg-transparent">
                        <p className="w-full text-center text-sm text-muted-foreground">
                            Already verified?{" "}
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
};

export default VerifyEmailPage;

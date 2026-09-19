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
import React, { useEffect, useState, Suspense } from "react";
import {
    CircleAlert,
    CircleCheck,
    Eye,
    EyeOff,
    ShieldCheck,
} from "lucide-react";
import { resetPassword } from "@/lib/security";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Step = "form" | "submitting" | "success" | "invalid";

/** Visual password strength indicator */
function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ characters", ok: password.length >= 8 },
        { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
        { label: "Lowercase letter", ok: /[a-z]/.test(password) },
        { label: "Number", ok: /[0-9]/.test(password) },
        { label: "Special character", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];

    if (!password) return null;

    const passed = checks.filter((c) => c.ok).length;
    const pct = (passed / checks.length) * 100;
    const color =
        pct <= 40
            ? "bg-destructive"
            : pct <= 60
                ? "bg-warning"
                : pct <= 80
                    ? "bg-chart-4"
                    : "bg-success";

    return (
        <div className="space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                    className={cn("h-full rounded-full transition-all", color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {checks.map((c) => (
                    <p
                        key={c.label}
                        className={cn(
                            "flex items-center gap-1.5 text-xs",
                            c.ok ? "text-success" : "text-muted-foreground"
                        )}
                    >
                        <span
                            className={cn(
                                "size-1.5 rounded-full",
                                c.ok ? "bg-success" : "bg-border"
                            )}
                        />
                        {c.label}
                    </p>
                ))}
            </div>
        </div>
    );
}

const ResetPasswordContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<Step>("form");
    const [error, setError] = useState("");

    useEffect(() => {
        const t = searchParams.get("token");
        if (!t) {
            setStep("invalid");
            setError("No reset token found. Please use the link from your email.");
        } else {
            setToken(t);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setStep("submitting");

        try {
            await resetPassword(token, newPassword);
            setStep("success");
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                "Password reset failed. Please try again.";
            const expired = err?.response?.data?.expired;
            setError(msg);
            setStep(expired ? "invalid" : "form");
        }
    };

    // ── Success ────────────────────────────────────────────────────────────────
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
                            <CardTitle className="text-xl">Password reset!</CardTitle>
                            <CardDescription>
                                Your password has been updated. All existing sessions have been
                                logged out for your security.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="border-t-0 bg-transparent">
                            <Button
                                size="lg"
                                className="w-full"
                                onClick={() => router.push("/login")}
                            >
                                Log in with new password
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    // ── Invalid / expired link ─────────────────────────────────────────────────
    if (step === "invalid") {
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
                            <CardDescription>{error}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex flex-col gap-3 border-t-0 bg-transparent">
                            <Button
                                size="lg"
                                className="w-full"
                                onClick={() => router.push("/forgot-password")}
                            >
                                Request a new reset link
                            </Button>
                            <Link
                                href="/login"
                                className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Back to login
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    const mismatch =
        confirmPassword.length > 0 && newPassword !== confirmPassword;

    return (
        <div className="section-band flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
            <div className="w-full max-w-[26rem]">
                <div className="mb-8 flex justify-center">
                    <Logo size="lg" />
                </div>

                <Card className="p-2 shadow-sm">
                    <CardHeader className="space-y-1.5 text-center">
                        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <ShieldCheck className="size-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Set a new password</CardTitle>
                        <CardDescription>
                            Choose a strong password for your account.
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New password</Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((p) => !p)}
                                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-4" aria-hidden />
                                        ) : (
                                            <Eye className="size-4" aria-hidden />
                                        )}
                                    </button>
                                </div>
                                <PasswordStrength password={newPassword} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm new password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    aria-invalid={mismatch || undefined}
                                    required
                                />
                                {mismatch && (
                                    <p className="text-xs font-medium text-destructive">
                                        Passwords do not match.
                                    </p>
                                )}
                            </div>

                            {error && step === "form" && (
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
                                loading={step === "submitting"}
                                className="w-full"
                            >
                                {step === "submitting" ? "Resetting…" : "Reset password"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}

"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Bot,
  Brain,
  Check,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  ClipboardList,
  EyeOff,
  Gauge,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  Repeat,
  ScanSearch,
  Search,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
  TriangleAlert,
  Users,
  Waypoints,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

    useEffect(() => {
    if (!isLoading && isLoggedIn) {
      router.replace("/dashboard");
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.replace("#", "");
      // slight delay to ensure layout is painted before scrolling
      requestAnimationFrame(() => {
        setTimeout(() => scrollToSection(id), 50);
      });
    }
  }, []);

  const features: { icon: LucideIcon; title: string; description: string }[] = [
    {
      icon: Target,
      title: "Domain-Specific Questions",
      description:
        "Practice with questions tailored to your industry: JavaScript, React, Python, Data Science, DevOps, and more.",
    },
    {
      icon: Bot,
      title: "AI-Powered Evaluation",
      description:
        "Get intelligent feedback from Groq AI on technical accuracy, communication skills, and problem-solving approach.",
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description:
        "Receive real-time constructive feedback after each answer to help you improve immediately.",
    },
    {
      icon: Gauge,
      title: "Performance Scoring",
      description:
        "Get scored on each interview and track your improvement across different domains.",
    },
    {
      icon: Repeat,
      title: "Multiple Attempts",
      description:
        "Practice unlimited interviews across all domains to build confidence and expertise.",
    },
    {
      icon: Lightbulb,
      title: "Smart Follow-ups",
      description:
        "AI generates contextual follow-up questions based on your previous answers to dive deeper.",
    },
  ];

  const domains = [
    "JavaScript/Node.js",
    "React",
    "Python",
    "Data Science",
    "DevOps",
    "System Design",
    "Database Design",
    "General",
  ];

  const aiCapabilities: {
    icon: LucideIcon;
    title: string;
    description: string;
    highlight: string;
  }[] = [
    {
      icon: AudioLines,
      title: "Natural Language Understanding",
      description:
        "Our AI comprehends nuanced answers, not just keywords. It understands intent, context, and depth — just like a senior interviewer would.",
      highlight: "Powered by Groq LLM",
    },
    {
      icon: ScanSearch,
      title: "Deep Answer Analysis",
      description:
        "Every response is analyzed across multiple dimensions: technical correctness, clarity, structure, and completeness.",
      highlight: "Multi-dimensional scoring",
    },
    {
      icon: Sparkles,
      title: "Dynamic Question Generation",
      description:
        "Questions adapt to your seniority level and are never repeated. The AI creates fresh, relevant scenarios each session.",
      highlight: "Infinitely fresh content",
    },
    {
      icon: Waypoints,
      title: "Contextual Follow-ups",
      description:
        "Just like a real interviewer, the AI follows up on your answers — probing deeper on strong points and clarifying weak ones.",
      highlight: "Real interview simulation",
    },
  ];

  const mockInterviewBenefits: {
    icon: LucideIcon;
    problem: string;
    solution: string;
    stat: string;
  }[] = [
    {
      icon: Brain,
      problem: "Interview anxiety freezes your mind",
      solution:
        "Repeated mock sessions build neural pathways for calm, structured thinking under pressure.",
      stat: "73% reduction in anxiety after 5 sessions",
    },
    {
      icon: MessageCircle,
      problem: "You know the answer but can't articulate it",
      solution:
        "Practice translates knowledge into clear, confident verbal delivery with structured communication.",
      stat: "2x improvement in answer clarity",
    },
    {
      icon: Timer,
      problem: "You run out of time or ramble",
      solution:
        "Timed responses train you to be concise, complete, and on-point within expected timeframes.",
      stat: "60% better time management",
    },
    {
      icon: EyeOff,
      problem: "You don't know your own blind spots",
      solution:
        "AI identifies patterns in your weak areas across sessions so you know exactly what to study.",
      stat: "Precise gap identification",
    },
  ];

  const testimonials = [
    {
      name: "Rohan Sharma",
      role: "Frontend Developer @ Flipkart",
      avatar: "RS",
      text: "After 10 mock sessions, I walked into my Flipkart interview feeling genuinely prepared. The AI's feedback on my React answers was shockingly accurate.",
      rating: 5,
    },
    {
      name: "Priya Nair",
      role: "Data Scientist @ Razorpay",
      avatar: "PN",
      text: "I used to ramble in interviews. The AI flagged this after my second session and I actively worked on it. Got the offer after targeting exactly those weak spots.",
      rating: 5,
    },
    {
      name: "Arjun Mehta",
      role: "DevOps Engineer @ Infosys",
      avatar: "AM",
      text: "The system design questions were spot-on for what I faced in actual interviews. The follow-up questions especially felt like a real technical round.",
      rating: 5,
    },
  ];

  const comparisonPoints = [
    { label: "Available 24/7", ai: true, traditional: false },
    { label: "Instant feedback", ai: true, traditional: false },
    { label: "Unlimited practice", ai: true, traditional: false },
    { label: "Unbiased evaluation", ai: true, traditional: false },
    { label: "Tracks progress over time", ai: true, traditional: false },
    { label: "Domain-specific questions", ai: true, traditional: true },
    { label: "Adapts to your answers", ai: true, traditional: true },
    { label: "Human nuance", ai: false, traditional: true },
  ];

  const faqs = [
    {
      q: "How does the AI evaluate my answers?",
      a: "Our AI uses Groq's large language model to analyze your answers across multiple dimensions: technical accuracy, completeness, communication clarity, and problem-solving approach. It compares your response to expert-level expected answers and generates detailed feedback.",
    },
    {
      q: "Is this better than practicing with a friend?",
      a: "It's complementary. AI provides unbiased, instant, consistent feedback at any time — something a friend can't always give. It also remembers your history and can spot patterns across sessions. Use both for best results.",
    },
    {
      q: "How many questions are in each mock interview?",
      a: "Each session has 5–8 questions per domain, including AI-generated follow-up questions based on your previous answers. No two sessions are exactly alike.",
    },
    {
      q: "Can I target a specific company's interview style?",
      a: "Our domain-specific question banks are designed around real interview patterns from top tech companies. System Design questions, for example, follow patterns from FAANG-style interviews.",
    },
    {
      q: "How is my progress tracked?",
      a: "Your dashboard tracks scores per session, improvement trends, and weak areas identified by the AI. You can compare performance across sessions and domains.",
    },
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Sign Up",
      desc: "Create your free account in seconds",
    },
    {
      step: "2",
      title: "Choose Domain",
      desc: "Select your interview domain",
    },
    {
      step: "3",
      title: "Practice",
      desc: "Answer AI-generated questions",
    },
    {
      step: "4",
      title: "Improve",
      desc: "Get feedback and track progress",
    },
  ];

  const aiFlow: { label: string; icon: LucideIcon }[] = [
    { label: "Your Answer", icon: MessageSquare },
    { label: "NLP Analysis", icon: Search },
    { label: "Knowledge Scoring", icon: Gauge },
    { label: "Gap Detection", icon: TriangleAlert },
    { label: "Follow-up Gen", icon: CircleHelp },
    { label: "Feedback Report", icon: ClipboardList },
  ];

  const stats = [
    { label: "8+ Domains", value: "JavaScript, React, Python, and more" },
    { label: "AI Powered", value: "Groq LLM for intelligent feedback" },
    { label: "24/7 Available", value: "Practice anytime, anywhere" },
    { label: "Instant Scoring", value: "Get results in seconds" },
  ];

  if (isLoading || isLoggedIn) {
    return null; 
  }

  return (
    <div className="bg-background">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6">
              <Sparkles aria-hidden />
              AI-Powered Interview Platform
            </Badge>

            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Master Your <span className="text-primary">Interview Skills</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Practice with AI-powered mock interviews tailored to your domain. Get
              instant intelligent feedback and watch your confidence grow with every
              session.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="xl" onClick={() => router.push("/register")}>
                Start Free Practice
                <ArrowRight aria-hidden />
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => router.push("/login")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Info strip ────────────────────────────────────── */}
      <section className="section-band border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 divide-border sm:divide-x lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="px-2 py-8 text-center sm:px-6">
                <dt className="text-base font-semibold text-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1.5 text-sm text-muted-foreground">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Why mock interviews work ──────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionIntro
          eyebrow="Why Mock Interviews Work"
          title="Real Problems. Real Solutions."
          lead="Most candidates fail not because they lack knowledge — but because they've never practiced translating that knowledge under pressure."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {mockInterviewBenefits.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.problem}
                className="p-6 transition-colors hover:border-border-strong"
              >
                <div className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      The Problem
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {item.problem}
                    </p>

                    <p className="mt-4 text-xs font-medium tracking-wide text-primary uppercase">
                      How We Fix It
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.solution}
                    </p>

                    <Badge className="mt-4" size="sm">
                      <TrendingUp aria-hidden />
                      {item.stat}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section
        id="features"
        className="section-band scroll-mt-20 border-y border-border"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <SectionIntro
            title="Everything You Need to Succeed"
            lead="Comprehensive features designed to make you interview-ready"
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="p-6 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <SectionIntro title="How It Works" />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((item) => (
            <li key={item.step} className="bg-card p-6">
              <span className="tnum block text-2xl font-semibold text-primary/35">
                {item.step.padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Domains ───────────────────────────────────────── */}
      <section
        id="domains"
        className="section-band scroll-mt-20 border-y border-border"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <SectionIntro
            title="Practice Across Multiple Domains"
            lead="Choose from a variety of interview domains to build expertise"
          />

          <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
            {domains.map((domain) => (
              <Card
                key={domain}
                className="items-center justify-center p-5 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
              >
                <p className="text-sm font-medium text-foreground">{domain}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI capabilities ───────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionIntro
          eyebrow="Under the Hood"
          title="How Our AI Actually Works"
          lead="Not a quiz engine. Not keyword-matching. A genuine AI interviewer that thinks, listens, and responds like a senior engineer would."
        />

        <div className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-2">
          {aiCapabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h3 className="text-base font-semibold text-foreground">
                      {cap.title}
                    </h3>
                    <Badge variant="neutral" size="sm">
                      {cap.highlight}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {cap.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI flow */}
        <Card className="mt-14 p-8">
          <p className="text-center text-xs font-medium tracking-widest text-muted-foreground uppercase">
            AI Interview Flow
          </p>
          <ol className="mt-8 flex flex-wrap items-start justify-center gap-x-2 gap-y-6">
            {aiFlow.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="flex items-start gap-2">
                  <div className="flex w-20 flex-col items-center gap-2">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      {step.label}
                    </p>
                  </div>
                  {i < aiFlow.length - 1 && (
                    <ArrowRight
                      className="mt-3 size-4 shrink-0 text-border-strong"
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {/* ── Sample feedback ───────────────────────────────── */}
      <section className="section-band border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <SectionIntro
            eyebrow="See It In Action"
            title="What AI Feedback Looks Like"
            lead="Detailed, actionable, and instantly generated"
          />

          <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-2">
            {/* Sample question */}
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-chart-2" />
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Interview Question
                </p>
              </div>
              <p className="mt-4 text-base leading-relaxed font-medium text-foreground">
                {`"Explain the difference between \`useEffect\` and \`useLayoutEffect\` in React. When would you use each?"`}
              </p>
              <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Your Answer
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80 italic">
                  {`"useEffect runs after the render is painted to the screen, while useLayoutEffect runs synchronously after all DOM mutations but before the browser paints..."`}
                </p>
              </div>
            </Card>

            {/* Sample AI feedback */}
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                  AI Feedback
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">Overall Score</p>
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-4/5 rounded-full bg-primary" />
                  </div>
                  <span className="tnum text-sm font-semibold text-primary">
                    8/10
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <FeedbackBlock
                  icon={CircleCheck}
                  label="Strengths"
                  tone="text-success"
                  body="Correctly identified the timing difference. Mentioned DOM mutations — shows deeper understanding."
                />
                <FeedbackBlock
                  icon={TriangleAlert}
                  label="Improve"
                  tone="text-warning-foreground"
                  body="Missed the performance implication: useLayoutEffect can cause visual lag if overused. Didn't mention accessibility-related animation use cases."
                />
                <FeedbackBlock
                  icon={Repeat}
                  label="Follow-up Question"
                  tone="text-primary"
                  body={`"Can overusing useLayoutEffect affect perceived performance? How would you debug it?"`}
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Comparison ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionIntro
          title="AI Mock Interviews vs Traditional Prep"
          lead="See why thousands are switching to AI-first practice"
        />

        <Card className="mx-auto mt-14 max-w-2xl gap-0 p-0">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border bg-muted/40 px-5 py-3 sm:gap-x-8">
            <span className="sr-only">Capability</span>
            <p className="flex w-24 items-center justify-center gap-1.5 text-xs font-semibold text-primary">
              <Bot className="size-3.5" aria-hidden />
              AI Mock
            </p>
            <p className="flex w-24 items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              Traditional
            </p>
          </div>

          <ul className="divide-y divide-border">
            {comparisonPoints.map((point) => (
              <li
                key={point.label}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-3 sm:gap-x-8"
              >
                <p className="text-sm font-medium text-foreground">{point.label}</p>
                <div className="flex w-24 justify-center">
                  <ComparisonMark on={point.ai} />
                </div>
                <div className="flex w-24 justify-center">
                  <ComparisonMark on={point.traditional} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="section-band border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <SectionIntro
            eyebrow="Success Stories"
            title="Real Results from Real Candidates"
          />

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map((t, index) => (
              <Card
                key={t.name}
                className={
                  activeTab === index
                    ? "border-primary/50 p-6 transition-colors"
                    : "p-6 transition-colors"
                }
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {t.avatar}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.role}
                    </p>
                  </div>
                </div>

                <div
                  className="mt-4 flex gap-0.5"
                  aria-label={`${t.rating} out of 5`}
                >
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-3.5 fill-warning text-warning"
                      aria-hidden
                    />
                  ))}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-muted-foreground italic">
                  {`"${t.text}"`}
                </p>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setActiveTab(i)}
                aria-label={`Highlight ${t.name}`}
                aria-pressed={activeTab === i}
                className={
                  activeTab === i
                    ? "h-1.5 w-6 rounded-full bg-primary transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    : "h-1.5 w-1.5 rounded-full bg-border-strong transition-all outline-none hover:bg-muted-foreground/50 focus-visible:ring-3 focus-visible:ring-ring/50"
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionIntro
          title="Frequently Asked Questions"
          lead="Everything you need to know about our AI interview platform"
        />

        <div className="mt-14 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {faqs.map((faq, index) => {
            const open = activeFaq === index;
            return (
              <div key={faq.q}>
                <button
                  onClick={() => setActiveFaq(open ? null : index)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <p className="text-sm font-semibold text-foreground">{faq.q}</p>
                  <ChevronDown
                    className={
                      open
                        ? "size-4 shrink-0 rotate-180 text-primary transition-transform duration-200"
                        : "size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                    }
                    aria-hidden
                  />
                </button>
                {open && (
                  <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ready to Excel in Your Next Interview?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Start practicing now with our AI-powered interview platform. Free to
              use, no credit card required.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="xl" onClick={() => router.push("/register")}>
                Start Practicing Now
                <ArrowRight aria-hidden />
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => router.push("/login")}
              >
                Already have an account?
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────

/** Consistent centred heading block used by every section on this page. */
function SectionIntro({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <Badge variant="neutral" className="mb-5">
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {lead}
        </p>
      )}
    </div>
  );
}

function FeedbackBlock({
  icon: Icon,
  label,
  tone,
  body,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
  body: string;
}) {
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ComparisonMark({ on }: { on: boolean }) {
  return on ? (
    <span
      className="flex size-5 items-center justify-center rounded-full bg-success/10 text-success"
      aria-label="Yes"
    >
      <Check className="size-3.5" aria-hidden />
    </span>
  ) : (
    <span
      className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground"
      aria-label="No"
    >
      <X className="size-3.5" aria-hidden />
    </span>
  );
}

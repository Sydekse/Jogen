import React from "react";
import { Zap, Globe, Sun, Moon, ArrowRight, Sparkles, Send, FileText, CheckCircle, BadgeCheck, Shield } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { JogenLogo } from "@/src/components/ui/jogenLogo";

export function LandingPage({ onGetStarted, onDemo, darkMode, setDarkMode, lang, setLang }: {
  onGetStarted: () => void; onDemo: () => void;
  darkMode: boolean; setDarkMode: (v: boolean) => void;
  lang: "en" | "am"; setLang: (l: "en" | "am") => void;
}) {
  const FEATURES = [
    {
      icon: Zap,
      color: "text-violet-500", bg: "bg-violet-500/10",
      title: "AI Regulatory Assistant",
      desc: "RAG-powered chatbot trained on Ethiopian proclamations, commercial code, and tax law. Ask in Amharic or English — get cited, accurate answers instantly.",
      tags: ["Proclamation 1396/2025", "Commercial Code", "Tax Law"],
    },
    {
      icon: BadgeCheck,
      color: "text-blue-500", bg: "bg-blue-500/10",
      title: "Verified Expert Network",
      desc: "Connect with licensed Ethiopian lawyers, accountants, and regulatory consultants. Every expert is credential-verified by our compliance team before listing.",
      tags: ["Identity Verified", "License Checked", "Compliance Reviewed"],
    },
    {
      icon: Shield,
      color: "text-emerald-500", bg: "bg-emerald-500/10",
      title: "Secure Escrow Payments",
      desc: "Funds are held in escrow via Telebirr or CBE Birr and released only when your session completes successfully. Dispute protection built in.",
      tags: ["Telebirr", "CBE Birr", "Escrow Protected"],
    },
  ];

  const STEPS = [
    { n: "01", title: "Ask the AI", desc: "Type your regulatory or tax question in Amharic or English. Jogen AI responds with cited Ethiopian law." },
    { n: "02", title: "Escalate if Needed", desc: "For complex matters, the AI flags it and connects you to a verified human expert in the right specialty." },
    { n: "03", title: "Pay & Consult", desc: "Book a session, authorize payment via Telebirr or CBE Birr, and get expert guidance — securely billed per minute." },
  ];

  const STATS = [
    { value: "50+", label: "Verified Experts" },
    { value: "8", label: "Legal Specialties" },
    { value: "500+", label: "Consultations" },
    { value: "100%", label: "Escrow Protected" },
  ];

  return (
    <div className="min-h-screen bg-background bg-drafting-grid overflow-auto">
      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <JogenLogo className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">Jogen</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#experts" className="hover:text-foreground transition-colors">Experts</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "en" ? "am" : "en")} className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-accent transition-colors text-foreground">
              <Globe className="w-3.5 h-3.5" />{lang === "en" ? "አማርኛ" : "English"}
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border border-border hover:bg-accent transition-colors text-foreground">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={onGetStarted} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6 border border-primary/20">
              <Sparkles className="w-3 h-3" />
              {lang === "en" ? "Ethiopia's AI-Powered Legal Platform" : "የኢትዮጵያ AI ህጋዊ መድረክ"}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-[1.15] mb-6">
              {lang === "en" ? (
                <>Ethiopian Business Law,{" "}<span className="text-primary">Demystified.</span></>
              ) : (
                <>የኢትዮጵያ ዕቅድ ህግ፣{" "}<span className="text-primary">ቀላል ሆነ።</span></>
              )}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              {lang === "en"
                ? "Get instant AI-powered answers on startup regulations, tax compliance, and FX law — or connect with a verified Ethiopian legal expert, billed by the minute."
                : "ስለ ጀማሪ ስርዓቶች፣ ታክስ ተገዢነት፣ እና የFX ህግ ፈጣን AI-ሃይለ ኃይል ያግኙ።"}
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={onGetStarted} className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                {lang === "en" ? "Get Started Free" : "ነፃ ጀምር"}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onDemo} className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors">
                {lang === "en" ? "See Live Demo" : "ቀጥታ ዴሞ ይመልከቱ"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">No account required to explore · Free AI queries</p>
          </div>

          {/* Right: App Mockup */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl" />
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Jogen AI</p>
                  <p className="text-xs text-muted-foreground">Ethiopian Law RAG</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
              {/* Messages */}
              <div className="p-4 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
                    How do I register under Proclamation 1396/2025?
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] text-foreground">
                    Under <strong>Article 4</strong>, your tech startup must be incorporated, use innovation-based technology, and operate for fewer than 10 years…
                  </div>
                </div>
                <div className="ml-9 flex gap-1.5 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5" />Proc. 1396/2025, Art. 4
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5" />MInT Directive 2/2025
                  </span>
                </div>
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
                    What if I receive a penalty from ERCA?
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div className="border-2 border-destructive/30 bg-destructive/5 rounded-2xl rounded-tl-sm px-4 py-3 text-xs max-w-[85%]">
                    <p className="font-bold text-destructive mb-1">Mandatory Escalation</p>
                    <p className="text-muted-foreground">This involves active enforcement. A verified expert is required.</p>
                    <button className="mt-2 text-xs font-bold text-white bg-destructive px-3 py-1.5 rounded-lg">Find Expert →</button>
                  </div>
                </div>
              </div>
              {/* Input */}
              <div className="px-3 pb-3 flex gap-2">
                <div className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-xs text-muted-foreground">Ask a regulatory or tax question…</div>
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0"><Send className="w-3.5 h-3.5 text-primary-foreground" /></div>
              </div>
            </div>
            {/* Floating expert card */}
            <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl shadow-xl p-3 flex items-center gap-3 w-52">
              <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">NT</div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Nahom Teguade</p>
                <p className="text-xs text-muted-foreground">50 ETB/min · ★ 4.9</p>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 mt-0.5"><CheckCircle className="w-3 h-3" />Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold text-primary">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Platform Features</p>
          <h2 className="text-3xl font-bold text-foreground">Everything you need, nothing you don&apos;t</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Built specifically for the Ethiopian regulatory landscape — from Addis Ababa entrepreneurs to licensed legal consultants.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc, tags }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", bg)}>
                <Icon className={cn("w-6 h-6", color)} />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl font-bold text-foreground">How Jogen works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-border to-transparent -translate-x-1/2 z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <span className="text-sm font-black text-primary">{n}</span>
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border bg-primary/5">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-6">
            <JogenLogo className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to navigate Ethiopian business law?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Join hundreds of entrepreneurs and legal experts on Ethiopia&apos;s first micro-consulting platform.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={onGetStarted} className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center"><JogenLogo className="w-3.5 h-3.5 text-primary-foreground" /></div>
            <span className="font-bold text-foreground">Jogen</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © 2026 Jogen Technologies PLC · Addis Ababa, Ethiopia · TSP-2026-001
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

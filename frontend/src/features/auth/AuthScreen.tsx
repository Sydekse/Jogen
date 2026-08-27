// src/components/AuthScreen.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Globe, Sun, Moon, AlertCircle, ArrowLeft, Phone, Loader2 } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { cn } from "@/src/lib/utils";
import { JogenLogo } from "@/src/components/ui/jogenLogo";
import { sendOtpApi, verifyOtpApi } from "@/src/services/authServices";
import { getUserProfile, googleAuth } from "@/src/services/userService";
import { API_BASE_URL } from "@/src/config/api";
import { useModal } from "@/src/context/ModalContext";
import { useUser } from "@/src/context/UserContext";

type AuthFormData = {
  phoneNumber: string;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function GoogleSignInButton({
  googleLoading,
  setGoogleLoading,
  onLoginSuccess,
  showAlert,
  lang,
}: {
  googleLoading: boolean;
  setGoogleLoading: (v: boolean) => void;
  onLoginSuccess: () => void;
  showAlert: (msg: string) => Promise<void>;
  lang: string;
}) {
  const hasClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const res = await googleAuth({
          credential: tokenResponse.access_token,
        });

        if (res.access) {
          localStorage.setItem("access_token", res.access);
          if (res.refresh) {
            localStorage.setItem("refresh_token", res.refresh);
          }
          onLoginSuccess();
        }
      } catch (err: unknown) {
        console.error("Google Auth failed:", err);
        await showAlert(err instanceof Error ? err.message : "Google Authentication failed.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      showAlert("Google Authentication cancelled or failed.");
      setGoogleLoading(false);
    },
  });

  const handleGoogleClick = () => {
    if (!hasClientId) {
      showAlert("Google Client ID is missing. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID in your Vercel Environment Variables.");
      return;
    }
    setGoogleLoading(true);
    googleLogin();
  };

  return (
    <button
      type="button"
      disabled={googleLoading}
      onClick={handleGoogleClick}
      className="w-full py-3 px-4 rounded-xl border border-border bg-background hover:bg-accent transition-colors font-semibold text-sm text-foreground flex items-center justify-center gap-3 shadow-sm disabled:opacity-60"
    >
      {googleLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      )}
      <span>
        {googleLoading 
          ? (lang === "en" ? "Connecting to Google…" : "ከ Google ጋር እየተገናኘ ነው…")
          : (lang === "en" ? "Continue with Google" : "በ Google ቀጥል")}
      </span>
    </button>
  );
}

export function AuthScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { darkMode, setDarkMode, lang, setLang } = useUser();
  const [step, setStep] = useState<"primary" | "phone" | "otp" | "onboarding_name">("primary");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [fullName, setFullName] = useState("");
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { showAlert } = useModal();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthFormData>({
    mode: "onChange"
  });

  useEffect(() => {
    if (step !== "otp") return;
    const t = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const onPhoneSubmit = async (data: AuthFormData) => {
    const result = await sendOtpApi(data.phoneNumber);

    if (result.success) {
      setSubmittedPhone(data.phoneNumber);
      setStep("otp");
      setTimeLeft(300);
      setOtp(["", "", "", "", "", ""]);
    } else {
      await showAlert(result.message || "Failed to request verification code.");
    }
  };

  const handleResend = async () => {
    const result = await sendOtpApi(submittedPhone);
    if (result.success) {
      setTimeLeft(300);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } else {
      await showAlert(result.message || "Failed to resend verification code.");
    }
  };

  const handleOtpChange = async (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);

    if (val && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      const fullOtpCode = next.join("");
      const result = await verifyOtpApi(submittedPhone, fullOtpCode);

      if (result.success) {
        localStorage.setItem("access_token", result.data.access);
        if (result.data.refresh) {
          localStorage.setItem("refresh_token", result.data.refresh);
        }

        let needsName = Boolean(result.data.is_new_user);
        try {
          const profile = await getUserProfile();
          if (!profile.full_name || !profile.full_name.trim()) {
            needsName = true;
          }
        } catch (e) {
          console.error("Profile check failed:", e);
        }

        if (needsName) {
          setStep("onboarding_name");
        } else {
          onLoginSuccess();
        }
      } else {
        await showAlert(result.message || "Invalid verification code.");
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
    }
  };

  const onOnboardingNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSavingOnboarding(true);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("full_name", fullName.trim());

      const response = await fetch(`${API_BASE_URL}/auth/profile/update/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        onLoginSuccess();
      } else {
        await showAlert(lang === "en" ? "Failed to save name." : "ስም ማስቀመጥ አልተቻለም።");
      }
    } catch (err) {
      console.error("Failed to update name:", err);
      await showAlert(lang === "en" ? "Network error saving name." : "የኔትወርክ ስህተት አጋጥሟል።");
    } finally {
      setSavingOnboarding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <JogenLogo className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">Jogen</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "en" ? "am" : "en")} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-accent transition-colors text-foreground">
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border border-border hover:bg-accent transition-colors text-foreground">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <JogenLogo className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {step === "onboarding_name"
                ? (lang === "en" ? "What's your full name?" : "ሙሉ ስምዎን ያስገቡ")
                : (lang === "en" ? "Welcome to Jogen" : "እንኳን ወደ ጆገን መጡ")}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step === "onboarding_name"
                ? (lang === "en" ? "Please enter your name to complete registration." : "ምዝገባውን ለማጠናቀቅ እባክዎን ስምዎን ያስገቡ።")
                : (lang === "en" ? "Ethiopian business law & tax advisory, on demand." : "የኢትዮጵያ ዕቅድ ህግ እና ታክስ አማካሪ፣ ፍላጎት ሲኖር።")}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {step === "primary" ? (
              <div className="space-y-4">
                <GoogleSignInButton
                  googleLoading={googleLoading}
                  setGoogleLoading={setGoogleLoading}
                  onLoginSuccess={onLoginSuccess}
                  showAlert={showAlert}
                  lang={lang}
                />

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-border w-full" />
                  <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold absolute">
                    {lang === "en" ? "Or" : "ወይም"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  {lang === "en" ? "Sign in with Phone Number" : "በስልክ ቁጥር ግባ"}
                </button>
              </div>
            ) : step === "phone" ? (
              <form onSubmit={handleSubmit(onPhoneSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {lang === "en" ? "Phone Number" : "ስልክ ቁጥር"}
                  </label>
                  <Controller
                    name="phoneNumber"
                    control={control}
                    rules={{
                      required: lang === "en" ? "Phone number is required" : "ስልክ ቁጥር ያስፈልጋል",
                      validate: (value) => isValidPhoneNumber(value || "") || (lang === "en" ? "Invalid phone number" : "የተሳሳተ ስልክ ቁጥር")
                    }}
                    render={({ field }) => (
                      <PhoneInput
                        {...field}
                        defaultCountry="ET"
                        placeholder="91 234 5678"
                        className={cn(
                          "flex items-center border rounded-xl overflow-hidden transition-colors bg-transparent",
                          errors.phoneNumber ? "border-destructive" : "border-border focus-within:border-primary"
                        )}
                        numberInputProps={{
                          className: "flex-1 px-3 py-3 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none border-none focus:ring-0"
                        }}
                      />
                    )}
                  />
                  {errors.phoneNumber && (
                    <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {isSubmitting ? (lang === "en" ? "Sending…" : "እየላከ ነው…") : (lang === "en" ? "Send Verification Code" : "የማረጋገጫ ኮድ ላክ")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("primary")}
                  className="pt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {lang === "en" ? "Back to sign in options" : "ወደ መግቢያ አማራጮች ተመለስ"}
                </button>
              </form>
            ) : step === "otp" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-foreground">
                      {lang === "en" ? "Verification Code" : "የማረጋገጫ ኮድ"}
                    </label>
                    <span className="text-xs text-muted-foreground font-medium">{submittedPhone}</span>
                  </div>
                  <div className="flex gap-2 justify-between">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otp[i] && i > 0) {
                            otpRefs.current[i - 1]?.focus();
                          }
                        }}
                        className="w-11 h-12 text-center text-xl font-bold rounded-xl border border-border bg-muted focus:border-primary focus:outline-none transition-colors text-foreground shadow-sm"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mt-4">
                  <span className={cn("font-medium tabular-nums", timeLeft < 60 ? "text-destructive" : "text-muted-foreground")}>
                    {lang === "en" ? "Expires in" : "ጊዜው ያልቃል"} {formatTime(timeLeft)}
                  </span>
                  <button
                    disabled={timeLeft > 0}
                    onClick={handleResend}
                    className="text-primary disabled:text-muted-foreground disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {lang === "en" ? "Resend Code" : "ኮድ እንደገና ላክ"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="pt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {lang === "en" ? "Change number" : "ቁጥር ቀይር"}
                </button>
              </div>
            ) : (
              <form onSubmit={onOnboardingNameSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {lang === "en" ? "What's your full name?" : "ሙሉ ስምዎ ማን ነው?"}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={lang === "en" ? "e.g. Abebe Bikila" : "ምሳሌ፡ አበበ ቢቂላ"}
                    autoFocus
                    className="w-full px-4 py-3 bg-transparent border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:outline-none transition-colors shadow-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {lang === "en"
                      ? "This name will appear on your consultations and receipts."
                      : "ይህ ስም በአማካሪዎችዎ እና ደረሰኞችዎ ላይ ይታያል።"}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={savingOnboarding || !fullName.trim()}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {savingOnboarding
                    ? (lang === "en" ? "Saving…" : "እየቀመጠ ነው…")
                    : (lang === "en" ? "Continue" : "ቀጥል")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
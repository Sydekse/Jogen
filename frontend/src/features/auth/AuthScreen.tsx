// src/components/AuthScreen.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Globe, Sun, Moon, AlertCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { JogenLogo } from "@/src/components/ui/jogenLogo";
import { sendOtpApi, verifyOtpApi } from "@/src/services/authServices";
import { getUserProfile } from "@/src/services/userService";
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

// Named export with the onLoginSuccess prop
export function AuthScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [lang, setLang] = useState<"en" | "am">("en");
  const { darkMode, setDarkMode } = useUser();
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
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
    // setErrorMsg("");
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
        console.log("Authentication successful! Token received:", result.data.access);
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
          setStep("name");
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

  const onNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSavingName(true);
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
        await showAlert(lang === "en" ? "Failed to save name. Please try again." : "ስም ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።");
      }
    } catch (err) {
      console.error("Failed to update name:", err);
      await showAlert(lang === "en" ? "Network error saving name." : "ስም በሚቀመጥበት ጊዜ የኔትወርክ ስህተት አጋጥሟል።");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <JogenLogo className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {step === "name"
                ? (lang === "en" ? "What's your name?" : "ስምዎን ያስገቡ")
                : (lang === "en" ? "Welcome to Jogen" : "እንኳን ወደ ጆገን መጡ")}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step === "name"
                ? (lang === "en" ? "Please enter your name to complete registration." : "ምዝገባውን ለማጠናቀቅ እባክዎን ስምዎን ያስገቡ።")
                : (lang === "en" ? "Ethiopian business law & tax advisory, on demand." : "የኢትዮጵያ ዕቅድ ህግ እና ታክስ አማካሪ፣ ፍላጎት ሲኖር።")}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {step === "phone" ? (
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
                  onClick={() => setStep("phone")}
                  className="pt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {lang === "en" ? "Change number" : "ቁጥር ቀይር"}
                </button>
              </div>
            ) : (
              <form onSubmit={onNameSubmit} className="space-y-4">
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
                  disabled={savingName || !fullName.trim()}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {savingName
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
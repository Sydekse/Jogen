"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {  Globe, Sun, Moon, AlertCircle, ArrowLeft } from "lucide-react";
import { cn } from "../src/lib/utils";
import { JogenLogo } from "@/src/components/ui/jogenLogo";
import { sendOtpApi, verifyOtpApi } from "@/src/services/authServices";
// Types
type AuthFormData = {
  phoneNumber: string;
};

// Helper function to format seconds into MM:SS
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function AuthScreen() {
  // 1. General App State
  const [lang, setLang] = useState<"en" | "am">("en");
  const [darkMode, setDarkMode] = useState(false);

  // 2. Step & Phone State
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [submittedPhone, setSubmittedPhone] = useState("");

  // 3. OTP State
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);



  // 4. Form Controller for the phone input
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthFormData>({
    mode: "onChange"
  });

  const[errorMsg, setErrorMsg] = useState("")

  // 5. Timer Effect for OTP Screen
  useEffect(() => {
    if (step !== "otp") return;
    const t = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step]);

  // 6. Handle Phone Submission
  const onPhoneSubmit = async (data: AuthFormData) => {
    setErrorMsg(""); // Add an error state variable if you haven't yet

    // data.phoneNumber is already safely formatted in E.164 (e.g., +251912345678)
    const result = await sendOtpApi(data.phoneNumber);

    if (result.success) {
      setSubmittedPhone(data.phoneNumber);
      setStep("otp");
      setTimeLeft(300);
      setOtp(["", "", "", "", "", ""]);
    } else {
      // Display backend error (e.g., rate limit or invalid range)
      alert(result.message);
    }
  };

  // 7. Handle OTP Typing & Auto-Focus
  const handleOtpChange = async (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);

    if (val && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (next.every((d) => d !== "")) {
      const fullOtpCode = next.join("");
      const result = await verifyOtpApi(submittedPhone, fullOtpCode);

      if (result.success) {
        console.log("Authentication successful! Token received:", result.data.token);
        // TODO: Save token to cookies/localStorage and redirect to dashboard/AI screen
        alert("Successfully authenticated!");
      } else {
        alert(result.message);
        // Reset OTP grid on failure
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
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
              {lang === "en" ? "Welcome to Jogen" : "እንኳን ወደ ጆገን መጡ"}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {lang === "en" ? "Ethiopian business law & tax advisory, on demand." : "የኢትዮጵያ ዕቅድ ህግ እና ታክስ አማካሪ፣ ፍላጎት ሲኖር።"}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {step === "phone" ? (
              /* --- PHONE INPUT STEP --- */
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
                  {isSubmitting
                    ? (lang === "en" ? "Sending…" : "እየላከ ነው…")
                    : (lang === "en" ? "Send Verification Code" : "የማረጋገጫ ኮድ ላክ")
                  }
                </button>
              </form>
            ) : (
              /* --- OTP VERIFICATION STEP --- */
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-foreground">
                      {lang === "en" ? "Verification Code" : "የማረጋገጫ ኮድ"}
                    </label>
                    <span className="text-xs text-muted-foreground font-medium">{submittedPhone}</span>
                  </div>

                  {/* 6-Digit OTP Grid */}
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
                          // Handle Backspace to go to previous input
                          if (e.key === "Backspace" && !otp[i] && i > 0) {
                            otpRefs.current[i - 1]?.focus();
                          }
                        }}
                        className="w-11 h-12 text-center text-xl font-bold rounded-xl border border-border bg-muted focus:border-primary focus:outline-none transition-colors text-foreground shadow-sm"
                      />
                    ))}
                  </div>
                </div>

                {/* Timer and Resend */}
                <div className="flex items-center justify-between text-sm mt-4">
                  <span className={cn("font-medium tabular-nums", timeLeft < 60 ? "text-destructive" : "text-muted-foreground")}>
                    {lang === "en" ? "Expires in" : "ጊዜው ያልቃል"} {formatTime(timeLeft)}
                  </span>
                  <button
                    disabled={timeLeft > 0}
                    onClick={() => { setTimeLeft(300); setOtp(["", "", "", "", "", ""]); }}
                    className="text-primary disabled:text-muted-foreground disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {lang === "en" ? "Resend Code" : "ኮድ እንደገና ላክ"}
                  </button>
                </div>

                {/* Back Button */}
                <button
                  onClick={() => setStep("phone")}
                  className="pt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {lang === "en" ? "Change number" : "ቁጥር ቀይር"}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
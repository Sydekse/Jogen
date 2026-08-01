import React from "react";

export function JogenLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Rounded Container matching your design system */}
      <rect width="36" height="36" rx="10" className="fill-primary" />

      {/* Custom Stylized 'J' Vector */}
      <path
        d="M22 10V21C22 23.2091 20.2091 25 18 25V25C15.7909 25 14 23.2091 14 21V19"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="text-primary-foreground"
      />
      {/* Top Legal Accent Dot / Spark */}
      <circle
        cx="22"
        cy="10"
        r="2"
        className="fill-primary-foreground"
      />
    </svg>
  );
}
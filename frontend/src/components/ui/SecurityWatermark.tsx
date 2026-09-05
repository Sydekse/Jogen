import React from 'react';

export function SecurityWatermark({ className = "w-40 h-40 right-2 bottom-2 text-foreground/[0.035] dark:text-foreground/[0.05]" }: { className?: string }) {
  return (
    <div 
      className={`absolute pointer-events-none select-none z-0 overflow-hidden ${className}`} 
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" className="w-full h-full">
        {/* Outer Circular Guilloche Rings */}
        <circle cx="100" cy="100" r="94" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="88" strokeWidth="1" />
        <circle cx="100" cy="100" r="82" strokeWidth="0.75" strokeDasharray="6 2" />
        <circle cx="100" cy="100" r="60" strokeWidth="1" />
        <circle cx="100" cy="100" r="54" strokeWidth="0.75" strokeDasharray="2 2" />

        {/* Central Balance Scales Motif */}
        <path d="M100 35 V165" strokeWidth="2" strokeLinecap="round" />
        <path d="M70 165 H130" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M60 65 H140" strokeWidth="2" strokeLinecap="round" />
        
        {/* Left Pan */}
        <path d="M60 65 L45 105 H75 Z" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M45 105 Q60 120 75 105" strokeWidth="1.2" />

        {/* Right Pan */}
        <path d="M140 65 L125 105 H155 Z" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M125 105 Q140 120 155 105" strokeWidth="1.2" />

        {/* Decorative Stars */}
        <circle cx="100" cy="48" r="2.5" fill="currentColor" />
        <circle cx="65" cy="100" r="1.5" fill="currentColor" />
        <circle cx="135" cy="100" r="1.5" fill="currentColor" />

        {/* Curved Watermark Text Track */}
        <path id="watermarkTrack" d="M 30,100 A 70,70 0 1,1 170,100" fill="none" stroke="none" />
        <text fontSize="8.5" letterSpacing="0.25em" fill="currentColor" fontWeight="700">
          <textPath href="#watermarkTrack" startOffset="50%" textAnchor="middle">
            OFFICIAL CONSULTATION DOCKET
          </textPath>
        </text>
      </svg>
    </div>
  );
}

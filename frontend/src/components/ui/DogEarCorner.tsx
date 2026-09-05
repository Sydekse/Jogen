import React from 'react';

export function DogEarCorner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const borderSize = size === "lg" ? "border-t-[16px] border-l-[16px] border-b-[16px] border-r-[16px]" 
    : size === "sm" ? "border-t-[10px] border-l-[10px] border-b-[10px] border-r-[10px]" 
    : "border-t-[13px] border-l-[13px] border-b-[13px] border-r-[13px]";

  const dimensions = size === "lg" ? "w-4 h-4" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div 
      className={`absolute top-0 right-0 ${dimensions} pointer-events-none z-20`}
      aria-hidden="true"
    >
      <div className={`w-0 h-0 border-t-background border-l-transparent absolute top-0 right-0 ${borderSize}`} />
      <div className={`w-0 h-0 border-b-border/80 border-r-transparent absolute top-0 right-0 shadow-2xs ${borderSize}`} />
    </div>
  );
}

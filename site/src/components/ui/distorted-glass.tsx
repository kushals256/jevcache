"use client";

import { cn } from "@/lib/utils";

export const DistortedGlass = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "relative mx-auto h-[72px] w-full max-w-5xl overflow-hidden rounded-2xl md:h-[96px]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl border border-bone/10">
        <div className="glass-effect size-full" />
      </div>
      <svg className="absolute size-0" aria-hidden>
        <defs>
          <filter id="fractal-noise-glass">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.12 0.12"
              numOctaves="1"
              result="warp"
            />
            <feDisplacementMap
              xChannelSelector="R"
              yChannelSelector="G"
              scale="30"
              in="SourceGraphic"
              in2="warp"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

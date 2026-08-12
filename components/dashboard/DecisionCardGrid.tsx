"use client";

import { domAnimation, LazyMotion, m } from "framer-motion";
import type { ReactNode } from "react";

/** Staggered fade-in for the dashboard/history decision grid — purely
 * cosmetic, no effect on data or layout when JS is disabled (children
 * still render, just without the animation). Uses LazyMotion + the `m`
 * component instead of importing `motion` directly: `domAnimation` is
 * framer-motion's ~15kB feature subset (simple transforms/opacity, no
 * layout/drag animation), vs. ~34kB for the full `motion` bundle we don't
 * need for a fade-in. */
export function DecisionCardGrid({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(children)
          ? children.map((child, index) => (
              <m.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
              >
                {child}
              </m.div>
            ))
          : children}
      </div>
    </LazyMotion>
  );
}

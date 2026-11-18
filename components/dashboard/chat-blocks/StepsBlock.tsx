"use client";

import { memo } from "react";
import { m } from "framer-motion";
import { useMotionTier } from "@/hooks/useMotionTier";
import { fadeUp, staggerDelay, tierVariants } from "@/lib/motion";
import { InlineMarkdown } from "@/components/dashboard/chat-blocks/InlineMarkdown";
import type { StepsData } from "@/components/dashboard/chat-blocks/parse";

const TILE_CLASSES = ["tile-mint", "tile-sky", "tile-coral", "tile-gold"];

/**
 * A worked method, one row per step.
 *
 * Rows fade up in sequence as the block mounts, which is what makes a long
 * method read as though it is being written out line by line. The stagger is
 * disabled entirely outside the `full` motion tier.
 */
export const StepsBlock = memo(function StepsBlock({ data }: { data: StepsData }) {
  const { tier } = useMotionTier();
  const variants = tierVariants(tier, fadeUp);

  return (
    <ol className="block-card list-none p-0">
      {data.steps.map((step, index) => (
        <m.li
          key={`${step.number}-${index}`}
          className="block-row items-start"
          variants={variants}
          initial={variants ? "hidden" : undefined}
          animate={variants ? "visible" : undefined}
          transition={{ delay: staggerDelay(tier, index, 0.05, 11) }}
        >
          <span className={`tile ${TILE_CLASSES[index % TILE_CLASSES.length]}`} aria-hidden="true">
            {step.number}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-6 text-[color:var(--text-1)]">
              <span className="sr-only">Step {step.number}: </span>
              <InlineMarkdown content={step.title} />
            </p>

            {step.detail ? (
              <div className="mt-1 text-sm leading-7 text-[color:var(--text-2)]">
                <InlineMarkdown content={step.detail} />
              </div>
            ) : null}
          </div>
        </m.li>
      ))}
    </ol>
  );
});

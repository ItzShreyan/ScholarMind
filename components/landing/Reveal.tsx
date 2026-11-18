"use client";

import * as React from "react";

/**
 * Scroll-triggered entrance.
 *
 * One IntersectionObserver per element, disconnected after the first reveal —
 * this is an entrance, not a scroll effect, so it must never fire twice and
 * never cost anything after it has done its job.
 *
 * A -12% root margin means the element has to be meaningfully on screen before
 * it animates, which keeps content from animating in the corner of the viewport
 * where nobody sees it happen.
 *
 * When motion is reduced the content renders in its final state immediately:
 * there is no `opacity: 0` window at all, because a reveal that cannot animate
 * is just a blank element.
 */
type RevealTag = "div" | "section" | "li" | "article" | "figure" | "header" | "footer";

/**
 * All six wrapper tags take the same attributes and the same ref. Typing the
 * dynamic tag once here avoids six nearly-identical branches and keeps the JSX
 * below ref-safe without a cast at the call site.
 */
type RevealElementProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
};

type RevealProps = {
  children: React.ReactNode;
  /** Stagger offset in seconds. */
  delay?: number;
  /** Wrapper element, when the parent already expects a particular tag. */
  as?: RevealTag;
  className?: string;
  id?: string;
  /** Accessible label, when the wrapper is a landmark `section`. */
  ariaLabel?: string;
};

export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  id,
  ariaLabel
}: RevealProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [visible, setVisible] = React.useState(false);
  /** False until we know JS and observers are available, so SSR output is visible. */
  const [gated, setGated] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    setGated(true);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-12% 0px -12% 0px", threshold: 0.01 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const stateClass = !gated ? " reveal-static" : visible ? " is-visible" : "";

  const Component = Tag as React.ElementType<RevealElementProps>;

  return (
    <Component
      ref={ref}
      id={id}
      aria-label={ariaLabel}
      className={`reveal${stateClass} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Component>
  );
}

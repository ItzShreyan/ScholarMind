"use client";

import { AlertTriangle, Info, Lightbulb, OctagonAlert, Sparkles } from "lucide-react";

/** The five GitHub-style callout kinds, and how ScholarMind presents each. */
const CALLOUT_KINDS = {
  NOTE: {
    label: "Note",
    Icon: Info,
    tone: "info"
  },
  TIP: {
    label: "Tip",
    Icon: Lightbulb,
    tone: "mint"
  },
  IMPORTANT: {
    label: "Important",
    Icon: Sparkles,
    tone: "amber"
  },
  WARNING: {
    label: "Warning",
    Icon: AlertTriangle,
    tone: "amber"
  },
  CAUTION: {
    label: "Caution",
    Icon: OctagonAlert,
    tone: "danger"
  }
} as const;

export type CalloutKind = keyof typeof CALLOUT_KINDS;

/** `[!NOTE]` at the start of a blockquote, case-insensitive. */
export function readCalloutKind(text: string): CalloutKind | null {
  const match = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(text);
  if (!match) return null;
  return match[1].toUpperCase() as CalloutKind;
}

/**
 * A study callout.
 *
 * Deliberately restrained: one icon, one label, a tinted left edge. These
 * appear inside reading material, so they are annotated paragraphs rather than
 * boxes shouting at the student. Colour is never the only signal — the label
 * always names the kind.
 */
export function StudyCallout({
  kind,
  children
}: {
  kind: CalloutKind;
  children: React.ReactNode;
}) {
  const { label, Icon, tone } = CALLOUT_KINDS[kind];

  return (
    <aside className="study-callout" data-tone={tone}>
      <p className="study-callout-label">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <div className="study-callout-body">{children}</div>
    </aside>
  );
}

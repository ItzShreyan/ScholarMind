"use client";

import { BookOpen, Clock, Layers, ListChecks, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/**
 * The mobile companion.
 *
 * Drawn inside a phone frame at a realistic width, with the type sizes a phone
 * actually uses. Tiny fabricated text is the fastest way to make a device mockup
 * look fake, so every line here is a real sentence at a readable size — and the
 * frame is capped at 300px wide so nothing has to shrink below 9px.
 *
 * The four destinations match the bottom navigation of the real app: today's
 * session, the tutor, tools, and the review queue.
 */

const NAV = [
  { icon: BookOpen, label: "Session", active: true },
  { icon: Sparkles, label: "Tutor", active: false },
  { icon: ListChecks, label: "Tools", active: false },
  { icon: Layers, label: "Review", active: false }
];

const RECENT = [
  { title: "Forces & Motion", meta: "Physics · 4 sources", when: "Today" },
  { title: "Cell respiration", meta: "Biology · 6 sources", when: "Yesterday" },
  { title: "Differentiation", meta: "Maths · 3 sources", when: "3 days ago" }
];

export function MobileCompanionPreview() {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative rounded-[38px] border border-[rgba(243,240,233,0.14)] bg-[#0b1218] p-2.5 shadow-[0_40px_90px_rgba(0,0,0,0.55)]">
        {/* Speaker slot. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-2.5 h-1 w-14 -translate-x-1/2 rounded-full bg-[rgba(243,240,233,0.14)]"
        />

        <div className="overflow-hidden rounded-[30px] bg-[color:var(--surface-1)]">
          {/* Status strip */}
          <div className="flex items-center justify-between px-4 pb-1 pt-4 text-[9px] font-medium text-[color:var(--text-3)]">
            <span>9:41</span>
            <span aria-hidden="true" className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--text-3)]" />
              <span className="h-1.5 w-3 rounded-sm bg-[color:var(--text-3)]" />
            </span>
          </div>

          {/* Greeting */}
          <div className="px-4 pb-3 pt-2">
            <div className="flex items-center gap-2">
              <Logo size={22} />
              <span className="font-display text-[12px] font-semibold text-[color:var(--text-1)]">
                ScholarMind
              </span>
            </div>
            <p className="mt-2.5 font-display text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--text-1)]">
              Evening, and welcome back.
            </p>
            <p className="mt-1 text-[10.5px] leading-4 text-[color:var(--text-3)]">
              Your Physics session is 12 minutes from where you left it.
            </p>
          </div>

          {/* Continue */}
          <div className="mx-4 rounded-[14px] border border-[rgba(220,165,102,0.28)] bg-[rgba(220,165,102,0.08)] p-3">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-gold)]">
              Continue studying
            </p>
            <p className="mt-1 text-[11.5px] font-semibold text-[color:var(--text-1)]">
              Forces & Motion
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[9px] text-[color:var(--text-3)]">
                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                12 min left
              </span>
              <span className="rounded-pill bg-[linear-gradient(135deg,var(--accent-gold),var(--accent-coral))] px-2.5 py-1 text-[9.5px] font-semibold text-[#1a1208]">
                Resume
              </span>
            </div>
          </div>

          {/* Recent */}
          <div className="px-4 pb-3 pt-4">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-3)]">
              Recent studies
            </p>
            <ul className="mt-2 space-y-1.5">
              {RECENT.map((item) => (
                <li key={item.title} className="rounded-[10px] bg-[rgba(243,240,233,0.04)] px-2.5 py-2">
                  <p className="text-[10.5px] font-medium text-[color:var(--text-1)]">{item.title}</p>
                  <p className="mt-0.5 flex items-center justify-between gap-2 text-[8.5px] text-[color:var(--text-3)]">
                    <span className="truncate">{item.meta}</span>
                    <span className="shrink-0">{item.when}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick actions */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-1.5">
              <span className="rounded-[10px] border border-[color:var(--surface-border)] py-1.5 text-center text-[9.5px] font-medium text-[color:var(--text-2)]">
                New quiz
              </span>
              <span className="rounded-[10px] border border-[color:var(--surface-border)] py-1.5 text-center text-[9.5px] font-medium text-[color:var(--text-2)]">
                Ask the tutor
              </span>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="flex items-center justify-around border-t border-[color:var(--surface-border)] px-2 py-2">
            {NAV.map((item) => (
              <span
                key={item.label}
                className={`flex flex-col items-center gap-0.5 text-[8px] font-medium ${
                  item.active ? "text-[color:var(--accent-gold)]" : "text-[color:var(--text-3)]"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-[34ch] text-center text-[11px] leading-5 text-[color:var(--text-3)]">
        An illustration of the mobile companion. The same account, the same sources, in your hand.
      </p>
    </div>
  );
}

"use client";

/**
 * The knowledge constellation.
 *
 * A topic map drawn as a graph: concepts as nodes, relationships as edges. The
 * layout is hand-placed rather than force-directed, because a generated layout
 * looks like a physics demo and a composed one looks like a diagram a good
 * teacher drew on the board.
 *
 * It makes no claim about a student's mastery. Nothing here is coloured by
 * "strength" or scored — the solid edges are direct relationships and the dashed
 * ones are indirect, and the caption says outright that this is a metaphor. That
 * distinction matters: a landing page must not imply it has analysed anybody.
 */

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Radius in viewBox units. The hub topics are larger. */
  r: number;
  accent?: "amber" | "blue" | "mint";
};

const NODES: readonly Node[] = [
  { id: "forces", label: "Forces", x: 268, y: 172, r: 34, accent: "amber" },
  { id: "newton", label: "Newton's laws", x: 452, y: 112, r: 27, accent: "amber" },
  { id: "friction", label: "Friction", x: 132, y: 118, r: 25, accent: "blue" },
  { id: "incline", label: "Inclined planes", x: 118, y: 240, r: 24, accent: "blue" },
  { id: "weight", label: "Weight & mass", x: 396, y: 254, r: 23, accent: "mint" },
  { id: "momentum", label: "Momentum", x: 556, y: 214, r: 24, accent: "mint" },
  { id: "energy", label: "Energy", x: 300, y: 330, r: 22, accent: "mint" },
  { id: "circular", label: "Circular motion", x: 552, y: 322, r: 20 },
  { id: "vectors", label: "Vectors", x: 214, y: 66, r: 19 }
];

type Edge = {
  from: string;
  to: string;
  dashed?: boolean;
};

const EDGES: readonly Edge[] = [
  { from: "forces", to: "newton" },
  { from: "forces", to: "friction" },
  { from: "forces", to: "incline" },
  { from: "forces", to: "weight" },
  { from: "forces", to: "energy" },
  { from: "forces", to: "vectors" },
  { from: "newton", to: "momentum" },
  { from: "newton", to: "circular" },
  { from: "friction", to: "incline" },
  { from: "incline", to: "energy", dashed: true },
  { from: "weight", to: "momentum" },
  { from: "weight", to: "energy" },
  { from: "momentum", to: "energy", dashed: true },
  { from: "momentum", to: "circular" },
  { from: "vectors", to: "incline", dashed: true },
  { from: "newton", to: "weight", dashed: true }
];

const ACCENT_FILL: Record<NonNullable<Node["accent"]>, string> = {
  amber: "rgba(156,108,52,0.16)",
  blue: "rgba(47,111,143,0.13)",
  mint: "rgba(63,122,99,0.13)"
};

const ACCENT_STROKE: Record<NonNullable<Node["accent"]>, string> = {
  amber: "rgba(156,108,52,0.55)",
  blue: "rgba(47,111,143,0.45)",
  mint: "rgba(63,122,99,0.45)"
};

const NODE_INDEX = new Map(NODES.map((node) => [node.id, node]));

export function ConstellationPreview({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 640 380"
        role="img"
        aria-label="A topic map of Mechanics: Forces at the centre, connected to Newton's laws, friction, inclined planes, weight and mass, momentum, energy, circular motion and vectors."
        className="h-auto w-full"
      >
        <defs>
          <radialGradient id="constellation-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(156,108,52,0.16)" />
            <stop offset="100%" stopColor="rgba(156,108,52,0)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="640" height="380" fill="url(#constellation-glow)" />

        {/* Edges first, so nodes sit on top of them. */}
        {EDGES.map((edge) => {
          const from = NODE_INDEX.get(edge.from);
          const to = NODE_INDEX.get(edge.to);
          if (!from || !to) return null;

          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(24,33,42,0.22)"
              strokeWidth={edge.dashed ? 1 : 1.4}
              strokeDasharray={edge.dashed ? "3 5" : undefined}
              strokeLinecap="round"
            />
          );
        })}

        {NODES.map((node) => {
          const accent = node.accent;
          const fill = accent ? ACCENT_FILL[accent] : "rgba(24,33,42,0.05)";
          const stroke = accent ? ACCENT_STROKE[accent] : "rgba(24,33,42,0.24)";
          const isHub = node.id === "forces";

          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill={fill}
                stroke={stroke}
                strokeWidth={isHub ? 1.6 : 1}
              />
              {isHub ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r + 7}
                  fill="none"
                  stroke="rgba(156,108,52,0.24)"
                  strokeWidth={1}
                />
              ) : null}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isHub ? 12 : 10.5}
                fontWeight={isHub ? 650 : 550}
                fill="var(--editorial-fg)"
                style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
              >
                {node.label.split(" ").length > 1 ? (
                  <>
                    <tspan x={node.x} dy={node.label.length > 12 ? -5 : 0}>
                      {node.label.split(" ").slice(0, 2).join(" ")}
                    </tspan>
                    {node.label.split(" ").length > 2 ? (
                      <tspan x={node.x} dy={11}>
                        {node.label.split(" ").slice(2).join(" ")}
                      </tspan>
                    ) : null}
                  </>
                ) : (
                  node.label
                )}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[10px] text-[color:var(--editorial-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-px w-5 bg-[rgba(24,33,42,0.34)]" />
          Direct relationship
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-px w-5 bg-[repeating-linear-gradient(90deg,rgba(24,33,42,0.34)_0_3px,transparent_3px_6px)]"
          />
          Indirect relationship
        </span>
      </div>
    </div>
  );
}

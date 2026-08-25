// app/components/ui/StoryGraph.tsx
// Renders an author's publication map as an SVG node graph.
//
// Server component on purpose. Positions arrive pre-computed from
// lib/storyGraph.ts, hover styling is pure CSS, and navigation is plain anchors
// — so this needs no client JavaScript at all. That makes it fast, indexable,
// and functional before hydration.
//
// Labels are always visible rather than hover-only: the point of the map is to
// see everything you have written at once, and a graph of unlabelled dots
// communicates nothing.

import Link from 'next/link';
import type { StoryGraph as StoryGraphData, GraphNode } from '@/lib/storyGraph';

const FILL = {
  author:   { circle: '#ef4444', text: '#fecaca' },
  category: { circle: '#a1a1aa', text: '#d4d4d8' },
  story:    { circle: '#71717a', text: '#a1a1aa' },
} as const;

function NodeLabel({ node }: { node: GraphNode }) {
  const fill = FILL[node.kind].text;
  // Long titles are truncated rather than wrapped: SVG has no text wrapping, and
  // an over-long label collides with its neighbours.
  const label = node.label.length > 34 ? node.label.slice(0, 32) + '…' : node.label;

  return (
    <text
      x={node.x}
      y={node.y + node.r + 14}
      textAnchor="middle"
      fill={fill}
      fontSize={node.kind === 'author' ? 15 : node.kind === 'category' ? 13 : 11}
      fontWeight={node.kind === 'story' ? 400 : 600}
      className="pointer-events-none select-none"
    >
      {label}
    </text>
  );
}

function Node({ node }: { node: GraphNode }) {
  const colors = FILL[node.kind];

  const body = (
    <g className="group">
      {/* Invisible larger hit area — an 5px circle is a poor click target,
          especially on touch. */}
      <circle cx={node.x} cy={node.y} r={Math.max(node.r + 10, 18)} fill="transparent" />
      <circle
        cx={node.x}
        cy={node.y}
        r={node.r}
        fill={colors.circle}
        className="transition-all group-hover:fill-white"
      />
      <NodeLabel node={node} />
      {node.meta && (
        <text
          x={node.x}
          y={node.y + node.r + 28}
          textAnchor="middle"
          fill="#52525b"
          fontSize={10}
          className="pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {node.meta}
        </text>
      )}
    </g>
  );

  if (!node.href) return body;

  return (
    <Link href={node.href} aria-label={`${node.label}${node.meta ? ` — ${node.meta}` : ''}`}>
      {body}
    </Link>
  );
}

export default function StoryGraph({ data }: { data: StoryGraphData }) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));

  if (data.totals.published === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
        <p className="text-sm text-gray-400 mb-2">Nothing published yet.</p>
        <p className="text-xs text-gray-600">
          The map fills in as stories go live — one node per story, grouped by category.
        </p>
      </div>
    );
  }

  return (
    // Horizontal scroll on small screens rather than shrinking the graph into
    // illegibility. The page itself never scrolls sideways.
    <div className="rounded-2xl border border-gray-800 bg-gray-950 overflow-x-auto">
      <svg
        viewBox={data.viewBox}
        className="w-full h-[520px] sm:h-[640px] min-w-[560px]"
        role="img"
        aria-label={`Publication map for @${data.username}: ${data.totals.published} stories across ${data.totals.categories} categories`}
      >
        {/* Edges first so nodes paint over them */}
        <g stroke="#3f3f46" strokeWidth={1}>
          {data.edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>

        {data.nodes.map((n) => (
          <Node key={n.id} node={n} />
        ))}
      </svg>
    </div>
  );
}

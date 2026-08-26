'use client';
// app/components/ui/StoryPlannerPanel.tsx
// Drag-and-drop outline planner for authors. Nodes are saved as JSON via
// POST /api/stories/[id]/planner and auto-saved on every change.

import { useEffect, useState, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanNode {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface Props {
  storyId: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoryPlannerPanel({ storyId }: Props) {
  const [nodes, setNodes] = useState<PlanNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOver = useRef<number | null>(null);

  // ── Fetch existing planner data ─────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/stories/${storyId}/planner`)
      .then((r) => r.json())
      .then((d) => {
        try {
          setNodes(JSON.parse(d.content) ?? []);
        } catch {
          setNodes([]);
        }
      })
      .finally(() => setLoading(false));
  }, [storyId]);

  // ── Auto-save on change (debounced 1.2 s) ────────────────────────────────
  const save = useCallback(
    (updated: PlanNode[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await fetch(`/api/stories/${storyId}/planner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: JSON.stringify(updated) }),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 1200);
    },
    [storyId]
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addNode = () => {
    const updated = [...nodes, { id: uid(), title: '', content: '', order: nodes.length }];
    setNodes(updated);
    save(updated);
  };

  const updateNode = (id: string, field: 'title' | 'content', value: string) => {
    const updated = nodes.map((n) => (n.id === id ? { ...n, [field]: value } : n));
    setNodes(updated);
    save(updated);
  };

  const removeNode = (id: string) => {
    const updated = nodes.filter((n) => n.id !== id).map((n, i) => ({ ...n, order: i }));
    setNodes(updated);
    save(updated);
  };

  // ── Drag-to-reorder ───────────────────────────────────────────────────────

  const onDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOver.current = index;
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;
    const reordered = [...nodes];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const updated = reordered.map((n, i) => ({ ...n, order: i }));
    setNodes(updated);
    save(updated);
    dragOver.current = null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mt-8 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">Story Planner</span>
          {nodes.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
              {nodes.length} {nodes.length === 1 ? 'scene' : 'scenes'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-500">Saving…</span>}
          {saved && <span className="text-xs text-green-500">Saved ✓</span>}
          <span className="text-gray-500 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="bg-gray-900 p-5 space-y-3">
          {loading ? (
            <p className="text-gray-600 text-sm text-center py-4">Loading planner…</p>
          ) : (
            <>
              {nodes.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4 italic">
                  No scenes yet. Add one to start outlining your story.
                </p>
              )}

              {nodes.map((node, index) => (
                <div
                  key={node.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={(e) => onDrop(e, index)}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start gap-3">
                    {/* Drag handle + scene number */}
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <span className="text-gray-600 text-xs select-none">⠿</span>
                      <span className="text-gray-700 text-xs font-mono">{index + 1}</span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={node.title}
                        onChange={(e) => updateNode(node.id, 'title', e.target.value)}
                        placeholder="Scene title…"
                        className="w-full bg-transparent text-white text-sm font-semibold placeholder-gray-600 border-none outline-none"
                      />
                      <textarea
                        value={node.content}
                        onChange={(e) => updateNode(node.id, 'content', e.target.value)}
                        placeholder="What happens in this scene?"
                        rows={2}
                        className="w-full bg-transparent text-gray-400 text-sm placeholder-gray-700 border-none outline-none resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeNode(node.id)}
                      className="text-gray-700 hover:text-red-500 transition-colors shrink-0 mt-1"
                      aria-label="Remove scene"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addNode}
                className="w-full py-3 border border-dashed border-gray-700 hover:border-gray-500 text-gray-600 hover:text-gray-400 text-sm rounded-xl transition-colors"
              >
                + Add scene
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

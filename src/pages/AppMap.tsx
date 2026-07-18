import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
} from "@xyflow/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogIn, Layers, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RunBanner } from "../components/RunBanner";
import { ScreenNode, type ScreenNodeData } from "../components/ScreenNode";
import { JourneyStatusBadge } from "../components/StatusBadge";
import { useAnalysis } from "../context/AnalysisContext";
import { useAnalysisData } from "../context/AnalysisDataContext";
import { useActiveRun, useLiveRunSync } from "../lib/runs";
import { isSupabaseConfigured } from "../lib/supabase";

const nodeTypes = { screen: ScreenNode };

const edgeColor: Record<string, string> = {
  normal: "#94a3b8",
  warning: "#d97706",
  broken: "#dc2626",
};

export function AppMap() {
  const navigate = useNavigate();
  const { analysisId } = useAnalysis();
  const { screens, screenEdges, journeys, getJourney, getScreen } = useAnalysisData();
  const activeRunQuery = useActiveRun(analysisId);
  const activeRun = isSupabaseConfigured ? activeRunQuery.data : null;
  useLiveRunSync(analysisId, Boolean(activeRun && (activeRun.status === "queued" || activeRun.status === "running")));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [journeyFilter, setJourneyFilter] = useState<string>("all");

  const journeyScreenIds = useMemo(() => {
    if (journeyFilter === "all") return null;
    const j = getJourney(journeyFilter);
    return j ? new Set(j.steps.map((s) => s.screenId)) : null;
  }, [journeyFilter, getJourney]);

  const journeyEdgeKeys = useMemo(() => {
    if (journeyFilter === "all") return null;
    const j = getJourney(journeyFilter);
    if (!j) return null;
    const keys = new Set<string>();
    for (let i = 0; i < j.steps.length - 1; i++) {
      keys.add(`${j.steps[i].screenId}->${j.steps[i + 1].screenId}`);
    }
    return keys;
  }, [journeyFilter, getJourney]);

  const nodes: Node[] = useMemo(
    () =>
      screens.map((s) => {
        const inJourney = journeyScreenIds ? journeyScreenIds.has(s.id) : true;
        const data: ScreenNodeData = {
          screenId: s.id,
          name: s.name,
          type: s.type,
          status: s.status,
          isEntryPoint: s.isEntryPoint,
          elementCount: s.elements.length,
          issueCount: s.issueIds.length,
          dimmed: !inJourney,
          highlighted: journeyScreenIds ? inJourney : false,
        };
        return {
          id: s.id,
          type: "screen",
          position: s.position,
          data: data as unknown as Record<string, unknown>,
          selected: selectedId === s.id,
        };
      }),
    [journeyScreenIds, selectedId],
  );

  const edges: Edge[] = useMemo(
    () =>
      screenEdges.map((e) => {
        const key = `${e.source}->${e.target}`;
        const inJourney = journeyEdgeKeys ? journeyEdgeKeys.has(key) : true;
        const color = edgeColor[e.status];
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: e.status === "broken" || (journeyEdgeKeys ? inJourney : false),
          labelStyle: { fontSize: 11, fill: "#475569", fontWeight: 500 },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          style: {
            stroke: color,
            strokeWidth: inJourney ? 2.5 : 1.5,
            opacity: journeyEdgeKeys && !inJourney ? 0.15 : 1,
            strokeDasharray: e.status === "broken" ? "6 4" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 16,
            height: 16,
          },
        };
      }),
    [journeyEdgeKeys],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedId(node.id);
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      navigate(`/screens/${node.id}`);
    },
    [navigate],
  );

  const selectedScreen = selectedId ? getScreen(selectedId) : null;

  return (
    <div>
      <PageHeader
        title="Application Map"
        subtitle="The living map of ShopFlow. Click a screen to preview it, or double-click to open full details. Highlight a journey to trace its path."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Highlight journey</label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={journeyFilter}
              onChange={(e) => setJourneyFilter(e.target.value)}
            >
              <option value="all">All screens</option>
              {journeys.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {activeRun && <RunBanner run={activeRun} showConsole />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="relative lg:col-span-3">
          <div className="card h-[68vh] overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => {
                  const status = (n.data as ScreenNodeData).status;
                  return status === "broken"
                    ? "#dc2626"
                    : status === "warning"
                      ? "#d97706"
                      : "#16a34a";
                }}
                nodeStrokeWidth={2}
                maskColor="rgba(241,245,249,0.7)"
              />
            </ReactFlow>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <LegendDot color="#16a34a" label="Healthy" />
            <LegendDot color="#d97706" label="Warning" />
            <LegendDot color="#dc2626" label="Broken" />
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-6 bg-status-fail" style={{ backgroundImage: "none" }} />
              <span>Broken navigation</span>
            </span>
            <span className="flex items-center gap-1.5">
              <LogIn size={13} className="text-brand-600" /> Entry point
            </span>
          </div>
        </div>

        <aside className="lg:col-span-1">
          {selectedScreen ? (
            <div className="card sticky top-0 p-5">
              <div className="mb-3 flex items-start justify-between">
                <span className="section-title">Screen preview</span>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{selectedScreen.name}</h3>
              <div className="mt-2">
                <JourneyStatusBadge status={selectedScreen.status} />
              </div>
              <p className="mt-3 text-sm text-slate-600">{selectedScreen.description}</p>

              <dl className="mt-4 space-y-2 text-sm">
                <PreviewRow label="Interactive elements" value={selectedScreen.elements.length} />
                <PreviewRow label="Navigation options" value={selectedScreen.navigation.length} />
                <PreviewRow label="Generated tests" value={selectedScreen.testCaseIds.length} />
                <PreviewRow
                  label="Related issues"
                  value={selectedScreen.issueIds.length}
                  emphasize={selectedScreen.issueIds.length > 0}
                />
              </dl>

              <button
                className="btn-primary mt-5 w-full"
                onClick={() => navigate(`/screens/${selectedScreen.id}`)}
              >
                Open full details <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="card grid place-items-center p-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
                <Layers size={22} />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">Select a screen</h3>
              <p className="mt-1 text-sm text-slate-500">
                Click any node on the map to preview what the AI learned about it.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function PreviewRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-semibold ${emphasize ? "text-status-fail" : "text-slate-800"}`}>
        {value}
      </dd>
    </div>
  );
}

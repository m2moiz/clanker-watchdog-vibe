import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "./supabase";
import { DEFAULT_ANALYSIS_ID } from "./constants";

export type RunKind = "full" | "single-test";
export type RunStatus = "queued" | "running" | "finished" | "failed" | "cancelled";

export interface RunRow {
  id: string;
  analysis_id: string;
  kind: RunKind;
  test_id: string | null;
  effort: string | null;
  target_url: string | null;
  status: RunStatus;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
}

export interface RunEventRow {
  run_id: string;
  seq: number;
  ts: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface StartRunInput {
  analysisId?: string;
  kind: RunKind;
  testId?: string;
  targetUrl?: string;
  effort?: string;
}

export async function startRun(input: StartRunInput): Promise<string> {
  const client = requireSupabase();
  const id = crypto.randomUUID();
  const analysisId = input.analysisId ?? DEFAULT_ANALYSIS_ID;
  const { error } = await client.from("runs").insert({
    id,
    analysis_id: analysisId,
    kind: input.kind,
    test_id: input.testId ?? null,
    target_url: input.targetUrl ?? null,
    effort: input.effort ?? null,
    status: "queued",
  });
  if (error) throw error;
  return id;
}

export async function fetchActiveRun(analysisId: string): Promise<RunRow | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("runs")
    .select("*")
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as RunRow | null;
}

export async function fetchRunEvents(runId: string): Promise<RunEventRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("run_events")
    .select("*")
    .eq("run_id", runId)
    .order("seq", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RunEventRow[];
}

export function useActiveRun(analysisId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["active-run", analysisId],
    queryFn: () => fetchActiveRun(analysisId),
    refetchInterval: (q) => (q.state.data?.status === "queued" ? 2000 : false),
  });

  useEffect(() => {
    const client = requireSupabase();
    const channel = client
      .channel(`runs-active-${analysisId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "runs", filter: `analysis_id=eq.${analysisId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["active-run", analysisId] });
          void queryClient.invalidateQueries({ queryKey: ["analysis-bundle", analysisId] });
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [analysisId, queryClient]);

  return query;
}

export function useRunEvents(runId: string | undefined) {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<RunEventRow[]>([]);

  const query = useQuery({
    queryKey: ["run-events", runId],
    queryFn: () => fetchRunEvents(runId!),
    enabled: Boolean(runId),
  });

  useEffect(() => {
    if (query.data) setEvents(query.data);
  }, [query.data]);

  useEffect(() => {
    if (!runId) return;
    const client = requireSupabase();
    const channel = client
      .channel(`run-events-${runId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "run_events", filter: `run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as RunEventRow;
          setEvents((prev) => (prev.some((e) => e.seq === row.seq) ? prev : [...prev, row]));
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [runId, queryClient]);

  return { events, isLoading: query.isLoading };
}

/** Realtime invalidation for screens, edges, and tests during a live run. */
export function useLiveRunSync(analysisId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const client = requireSupabase();
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["analysis-bundle", analysisId] });
    };
    const channel = client
      .channel(`live-sync-${analysisId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "screens", filter: `analysis_id=eq.${analysisId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "screen_edges", filter: `analysis_id=eq.${analysisId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "tests", filter: `analysis_id=eq.${analysisId}` }, invalidate)
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [analysisId, enabled, queryClient]);
}

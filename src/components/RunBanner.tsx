import { Loader2, Terminal } from "lucide-react";
import { RunConsole } from "./RunConsole";
import type { RunRow } from "../lib/runs";

export function RunBanner({ run, showConsole }: { run: RunRow; showConsole?: boolean }) {
  const isActive = run.status === "queued" || run.status === "running";
  const statusColor =
    run.status === "running"
      ? "text-cyan-700 bg-cyan-50 border-cyan-200"
      : run.status === "queued"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : run.status === "finished"
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 ${statusColor}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {isActive && <Loader2 className="h-4 w-4 animate-spin" />}
        <span>
          Run {run.kind === "single-test" ? `(test ${run.test_id})` : "(full analysis)"} — {run.status}
        </span>
      </div>
      {run.status === "queued" && (
        <p className="mt-1 text-xs opacity-80">
          Waiting for daemon. Start it with: <code className="font-mono">npx @bonyadnouri/autoend serve</code>
        </p>
      )}
      {run.error && <p className="mt-1 text-xs">{run.error}</p>}
      {showConsole && isActive && (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-1 text-xs opacity-70">
            <Terminal className="h-3 w-3" /> Live log
          </div>
          <RunConsole runId={run.id} />
        </div>
      )}
    </div>
  );
}

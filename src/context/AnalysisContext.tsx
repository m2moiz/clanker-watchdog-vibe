import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_ANALYSIS_ID } from "../lib/constants";

interface AnalysisContextValue {
  analysisId: string;
  setAnalysisId: (id: string) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisId, setAnalysisId] = useState(DEFAULT_ANALYSIS_ID);
  const value = useMemo(() => ({ analysisId, setAnalysisId }), [analysisId]);
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}

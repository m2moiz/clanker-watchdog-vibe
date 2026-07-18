import { Link, useParams } from "react-router-dom";
import {
  MousePointerClick,
  Type,
  Link2,
  FormInput,
  Image as ImageIcon,
  ChevronDown,
  CheckSquare,
  ArrowRight,
  Target,
  ListChecks,
  ShieldAlert,
  CornerDownRight,
} from "lucide-react";
import type { ElementType } from "../types";
import { PageHeader } from "../components/PageHeader";
import { JourneyStatusBadge, TestStatusBadge } from "../components/StatusBadge";
import { SeverityBadge } from "../components/SeverityBadge";
import { ScreenshotPlaceholder } from "../components/ScreenshotPlaceholder";
import { NotFound } from "./NotFound";
import { useAnalysisData } from "../context/AnalysisDataContext";

const elementIcon: Record<ElementType, typeof Type> = {
  button: MousePointerClick,
  link: Link2,
  input: FormInput,
  form: FormInput,
  image: ImageIcon,
  dropdown: ChevronDown,
  checkbox: CheckSquare,
  text: Type,
};

export function ScreenDetails() {
  const { id } = useParams();
  const { getScreen, getIssue, getTest } = useAnalysisData();
  const screen = id ? getScreen(id) : undefined;
  if (!screen) return <NotFound />;

  const tests = screen.testCaseIds.map(getTest).filter((t) => t);
  const relatedIssues = screen.issueIds.map(getIssue).filter((i) => i);

  return (
    <div>
      <PageHeader
        title={screen.name}
        subtitle={screen.description}
        backTo="/"
        breadcrumb={
          <span>
            <Link to="/" className="hover:text-slate-700">
              Application Map
            </Link>{" "}
            / {screen.name}
          </span>
        }
        actions={<JourneyStatusBadge status={screen.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <SectionTitle icon={MousePointerClick} title="Interactive elements" count={screen.elements.length} />
            <div className="mt-3 divide-y divide-slate-100">
              {screen.elements.map((el) => {
                const Icon = elementIcon[el.type];
                return (
                  <div key={el.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon size={16} />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{el.label}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                          {el.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{el.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <SectionTitle icon={Target} title="Expected actions" count={screen.expectedActions.length} />
            <ul className="mt-3 space-y-2">
              {screen.expectedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CornerDownRight size={16} className="mt-0.5 shrink-0 text-brand-500" />
                  {action}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <SectionTitle icon={ListChecks} title="Generated test cases" count={tests.length} />
            {tests.length === 0 ? (
              <EmptyRow text="No test cases generated for this screen yet." />
            ) : (
              <div className="mt-3 space-y-2">
                {tests.map((t) => (
                  <Link
                    key={t!.id}
                    to={`/tests/${t!.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{t!.name}</div>
                      <div className="text-xs text-slate-500">{t!.id}</div>
                    </div>
                    <TestStatusBadge status={t!.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <span className="section-title">Screenshot</span>
            <div className="mt-3">
              <ScreenshotPlaceholder name={screen.name} accent={screen.accent} />
            </div>
          </section>

          <section className="card p-5">
            <SectionTitle icon={Link2} title="Navigation options" count={screen.navigation.length} />
            <div className="mt-3 space-y-2">
              {screen.navigation.map((nav, i) => {
                const target = getScreen(nav.targetScreenId);
                return (
                  <Link
                    key={i}
                    to={`/screens/${nav.targetScreenId}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2.5 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {target?.name ?? nav.targetScreenId}
                      </div>
                      <div className="truncate text-xs text-slate-400">{nav.trigger}</div>
                    </div>
                    <ArrowRight size={15} className="shrink-0 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <SectionTitle icon={ShieldAlert} title="Related issues" count={relatedIssues.length} />
            {relatedIssues.length === 0 ? (
              <EmptyRow text="No issues detected on this screen." />
            ) : (
              <div className="mt-3 space-y-2">
                {relatedIssues.map((issue) => (
                  <Link
                    key={issue!.id}
                    to={`/issues/${issue!.id}`}
                    className="block rounded-lg border border-slate-100 px-3 py-3 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-400">{issue!.id}</span>
                      <SeverityBadge severity={issue!.severity} />
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">{issue!.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Type;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={17} className="text-slate-400" />
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">{text}</p>;
}

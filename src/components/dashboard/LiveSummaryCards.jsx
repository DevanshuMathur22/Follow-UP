import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const toneClasses = {
  indigo: "bg-indigo-50 text-indigo-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  cyan: "bg-cyan-50 text-cyan-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

function SummarySkeleton() {
  return (
    <article className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-3 w-28 rounded bg-slate-100" />
          <div className="mt-3 h-8 w-16 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-36 rounded bg-slate-100" />
        </div>
        <div className="size-11 rounded-xl bg-slate-100" />
      </div>
    </article>
  );
}

export default function LiveSummaryCards({ metrics = [], loading = false }) {
  if (loading) {
    return (
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <SummarySkeleton key={index} />)}
      </section>
    );
  }

  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const content = (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{metric.title}</p>
                <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-800">{metric.value}</p>
                <p className="mt-2 text-xs text-slate-400">{metric.detail}</p>
              </div>
              <span className={`shrink-0 rounded-xl p-3 ${toneClasses[metric.tone] || toneClasses.indigo}`}>
                <Icon size={20} />
              </span>
            </div>
            {metric.href && (
              <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
                Open <ArrowUpRight size={14} />
              </span>
            )}
          </>
        );

        const classes = "group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md hover:shadow-slate-100";
        return metric.href ? (
          <Link key={metric.title} href={metric.href} className={classes}>
            {content}
          </Link>
        ) : (
          <article key={metric.title} className={classes}>{content}</article>
        );
      })}
    </section>
  );
}

import { DollarSign, CalendarDays, TrendingUp, Receipt, Info } from "lucide-react";
import { adminDb } from "@/lib/admin/auth";
import { getUsageReport, getDemandBreakdown } from "@/lib/admin/queries";
import { formatUsd, PRICING } from "@/lib/usage/pricing";
import { compactNumber, percent } from "@/lib/admin/format";
import {
  PageHeader,
  Panel,
  StatCard,
  NoData,
} from "@/components/admin/primitives";
import { AreaChart, BarList } from "@/components/admin/Charts";

export const metadata = { title: "Usage & costs — CitizenAI admin" };

export default async function AdminUsagePage() {
  const db = await adminDb();
  const [usage, demand] = await Promise.all([
    getUsageReport(db, 30),
    getDemandBreakdown(db),
  ]);

  const aiProvider = usage.providers.find((p) => p.provider === "gemini");
  const hasData = usage.totalCalls > 0;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
      <PageHeader
        title="Usage & costs"
        subtitle="What every itinerary costs to produce, broken down by provider. Month to date, UTC."
      />

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Spend today"
          value={formatUsd(usage.costToday)}
          tone="brand"
        />
        <StatCard
          icon={CalendarDays}
          label="Spend this month"
          value={formatUsd(usage.costThisMonth)}
          hint={`${compactNumber(usage.totalCalls)} API calls`}
          tone="accent"
        />
        <StatCard
          icon={TrendingUp}
          label="Projected month"
          value={formatUsd(usage.costProjectedMonth)}
          hint="Straight-line from month to date"
          tone="blue"
        />
        <StatCard
          icon={Receipt}
          label="Average per itinerary"
          value={formatUsd(usage.avgCostPerTrip, { precise: true })}
          hint={`Across ${usage.pricedGenerations} priced generations`}
          tone="green"
        />
      </div>

      {/* ── Daily spend ─────────────────────────────────────── */}
      <Panel title="Daily spend" meta="Last 30 days" className="mt-6">
        {hasData ? (
          <AreaChart
            id="daily-cost"
            data={usage.dailyCost}
            color="#e8722c"
            formatValue={(n) => (n === 0 ? "$0" : `$${n.toFixed(2)}`)}
          />
        ) : (
          <NoData>
            No API calls recorded yet. This populates as itineraries are
            generated.
          </NoData>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ── Provider breakdown ────────────────────────────── */}
        <Panel
          title="Cost by provider"
          meta="Month to date"
          className="lg:col-span-2"
          bodyClassName="px-0 py-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs text-faint">
                  <th className="px-5 py-2.5 font-medium">Service</th>
                  <th className="px-3 py-2.5 text-right font-medium">Calls</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Billable units
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Avg latency
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Failed</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                  <th className="px-5 py-2.5 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {usage.providers.map((p) => (
                  <tr
                    key={p.provider}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: p.tint }}
                        />
                        <span className="font-medium">{p.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {compactNumber(p.calls)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">
                      {compactNumber(p.units)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">
                      {p.avgLatencyMs != null ? `${p.avgLatencyMs}ms` : "—"}
                    </td>
                    <td
                      className={`px-3 py-3 text-right tabular-nums ${
                        p.failures ? "text-rose-600" : "text-muted"
                      }`}
                    >
                      {p.failures}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {formatUsd(p.cost)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted">
                      {percent(p.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <td className="px-5 py-3 font-semibold">Total</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {compactNumber(usage.totalCalls)}
                  </td>
                  <td colSpan={3} />
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {formatUsd(usage.costThisMonth)}
                  </td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* ── AI token detail ───────────────────────────────── */}
        <Panel title="AI tokens" meta="Month to date">
          {aiProvider && aiProvider.calls > 0 ? (
            <>
              <dl className="space-y-3.5 text-sm">
                {[
                  ["AI calls", compactNumber(aiProvider.calls)],
                  ["Input tokens", compactNumber(aiProvider.tokensIn)],
                  ["Output tokens", compactNumber(aiProvider.tokensOut)],
                  [
                    "Total tokens",
                    compactNumber(aiProvider.tokensIn + aiProvider.tokensOut),
                  ],
                  [
                    "Tokens per call",
                    compactNumber(
                      Math.round(
                        (aiProvider.tokensIn + aiProvider.tokensOut) /
                          aiProvider.calls
                      )
                    ),
                  ],
                  ["AI spend", formatUsd(aiProvider.cost)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 border-t border-line pt-4 text-xs text-faint">
                Priced at {formatUsd(PRICING.geminiInputPerMTok)} per 1M input
                and {formatUsd(PRICING.geminiOutputPerMTok)} per 1M output
                tokens. Reasoning tokens count as output.
              </p>
            </>
          ) : (
            <NoData>No AI calls recorded this month.</NoData>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ── Demand ────────────────────────────────────────── */}
        <Panel
          title="Top cities"
          meta={`${compactNumber(demand.sampleSize)} generations`}
        >
          {demand.topCities.length ? (
            <BarList items={demand.topCities} showRank />
          ) : (
            <NoData>No city data yet.</NoData>
          )}
        </Panel>

        <Panel title="Top interests" meta="Share of itineraries">
          {demand.topInterests.length ? (
            <BarList items={demand.topInterests} valueMode="share" color="#e8722c" />
          ) : (
            <NoData>No interest data yet.</NoData>
          )}
        </Panel>

        <Panel title="Transport mode" meta="How people plan to get around">
          {demand.transports.length ? (
            <BarList
              items={demand.transports}
              valueMode="share"
              color="#12a594"
            />
          ) : (
            <NoData>No transport data yet.</NoData>
          )}
        </Panel>
      </div>

      {/* ── Methodology ─────────────────────────────────────── */}
      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div className="text-muted">
          <p className="font-medium text-ink">How these numbers are built</p>
          <p className="mt-1.5 leading-relaxed">
            Every outbound call is recorded as it happens, with its real token
            counts or billable unit count, and priced against published list
            rates. Two things to keep in mind when comparing to an actual
            invoice: <strong className="font-medium text-ink-soft">free-tier
            credits are not deducted</strong>, so real bills come in lower at
            low volume; and rates are configuration, not measurements — update
            the <span className="font-mono text-xs">PRICE_*</span> environment
            variables when a vendor changes pricing.
          </p>
          <p className="mt-2 leading-relaxed">
            Average cost per itinerary is computed only over generations that
            carry recorded costs, so trips predating this tracking don&apos;t
            drag the average down.
          </p>
        </div>
      </div>
    </div>
  );
}

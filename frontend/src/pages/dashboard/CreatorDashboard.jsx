import React from "react";

export default function DashboardHome() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Overview dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          High-level overview of your YouTube channels, campaigns and
          network performance. Use the panels below to drill down into
          creator, business or admin metrics.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 flex gap-6">
        <aside className="w-60 shrink-0 rounded-2xl bg-slate-900 text-slate-100 shadow-lg flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="mt-1 font-semibold">Creator Dashboard</p>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1 text-sm">
            <SidebarItem label="Overview" active />
            <div className="mt-4 border-t border-slate-800 pt-3" />
            <SidebarItem label="Network Graph" to ="/dashborad/network" />
            <SidebarItem label="Centrality Metrics" to ="/dashborad/network" />
            <SidebarItem label="Predictive Analysis " to ="/dashborad/network"/>
          </nav>

          <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800 text-xs text-slate-400">
            <p className="font-medium text-slate-200">Tip</p>
            <p className="mt-1">
              Use filters on each card to focus on a specific niche or region.
            </p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total subscribers"
              value="128,930"
              change="+4.2%"
              changeLabel="last 30 days"
            />
            <StatCard
              label="View count"
              value="Top 3%"
              change="↑"
              changeLabel="within selected niche"
            />
            <StatCard
              label="Total likes"
              value="18"
              change="+6"
              changeLabel="vs previous month"
            />
            <StatCard
              label="Total comments"
              value="2.3M h"
              change="+12.4%"
              changeLabel="organic traffic"
            />
          </section>

    
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Latest Video">
              </Panel>
              <Panel title="Predictive View Count">
                <ChartPlaceholder variant="line" />
              </Panel>
            </div>


            <div className="space-y-4">
              <Panel title="latest video">
                <ul className="divide-y divide-slate-100 text-sm">
                  <CreatorRow
                    name="TechLab Studio"
                    metric="+12,430 subs"
                    badge="Gaming / Tech"
                  />
                  <CreatorRow
                    name="Daily Fitness"
                    metric="+9,210 subs"
                    badge="Health"
                  />
                  <CreatorRow
                    name="StudyWithMe CN"
                    metric="+7,540 subs"
                    badge="Education"
                  />
                  <CreatorRow
                    name="Street Food Asia"
                    metric="+6,980 subs"
                    badge="Food & Travel"
                  />
                </ul>
              </Panel>

              <Panel title="latest Comments">
                <ul className="space-y-2 text-xs">
                  <DealRow
                    brand="Acme Headphones"
                    budget="$12,000"
                    status="In negotiation"
                  />
                  <DealRow
                    brand="Nova Energy Drink"
                    budget="$7,500"
                    status="Waiting creator reply"
                  />
                  <DealRow
                    brand="Orbit VPN"
                    budget="$18,300"
                    status="Proposal sent"
                  />
                </ul>
              </Panel>
            </div>
          </section>

          
        </main>
      </div>
    </div>
  );
}


function SidebarItem({ label, active = false }) {
  return (
    <button
      className={`w-full flex items-center rounded-xl px-3 py-2 text-left transition ${
        active
          ? "bg-slate-100 text-slate-900 font-semibold"
          : "text-slate-200 hover:bg-slate-800/70 hover:text-white"
      }`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
          active ? "bg-emerald-500" : "bg-slate-500"
        }`}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

function StatCard({ label, value, change, changeLabel }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm border border-slate-100 flex flex-col justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      </div>
      <p className="mt-2 text-xs text-emerald-600">
        {change}{" "}
        <span className="text-slate-400 font-normal"> {changeLabel}</span>
      </p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <button className="text-xs text-slate-400 hover:text-slate-600">
          View details
        </button>
      </div>
      {children}
    </div>
  );
}

function ChartPlaceholder({ variant = "area" }) {
  const gradient =
    variant === "area"
      ? "bg-gradient-to-t from-sky-100 via-sky-50 to-transparent"
      : "bg-gradient-to-r from-violet-100 via-sky-50 to-emerald-100";

  return (
    <div className="h-48 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-end overflow-hidden relative">
      <div className={`w-full h-4/5 ${gradient}`} />
      <p className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wide text-slate-400">
        Chart placeholder · hook to real data later
      </p>
    </div>
  );
}

function CreatorRow({ name, metric, badge }) {
  return (
    <li className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-400">{badge}</p>
      </div>
      <p className="text-xs font-semibold text-emerald-600">{metric}</p>
    </li>
  );
}

function DealRow({ brand, budget, status }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <div>
        <p className="font-medium text-slate-800 text-xs">{brand}</p>
        <p className="text-[11px] text-slate-400">{status}</p>
      </div>
      <p className="text-xs font-semibold text-slate-900">{budget}</p>
    </li>
  );
}

function CommunityBadge({ name, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-800">{name}</p>
      <p className="mt-1 text-[11px] text-slate-500">{value}</p>
    </div>
  );
}

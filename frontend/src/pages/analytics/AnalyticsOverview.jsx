// src/pages/analytics/AnalyticsOverview.jsx
import { Link } from "react-router-dom";

export default function AnalyticsOverview() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Analytics Overview for Creators
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-3xl">
          Monitor your channel performance, community interactions, and growth trends. Click on any card below to dive into detailed analytics and insights tailored to your content.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* 1. Channel interaction graph */}
        <AnalyticsCard
          label="graph #1"
          title="Network Graph"
          badge="Channel-level view"
          description={
            <>
              Explore which videos behave similarly based on views, likes, and comments. Identify clusters of videos with similar performance patterns and discover which content types your audience responds to the most.
            </>
          }
          highlights={[
            "Nodes = individual videos",
            "Edges = similarity based on engagement correlations",
            "Node size = number of views",
            "Node colour = engagement rate",
            "Click a node to open the video on YouTube",
          ]}
          link="/dashboard/network"
        />

        {/* 2. Brand–creator campaign graph */}
        <AnalyticsCard
          label="graph #2"
          title="Centrality Metrics"
          badge="Collaboration insights"
          description={
            <>
              Understand your position within your creator network. See which creators you share audiences with and discover <span className="font-semibold">new collaboration paths</span> to grow your reach.
            </>
          }
          highlights={[
            "Bipartite graph: your channel vs other creators",
            "Edge weight = engagement strength / shared audience",
            "Filter by niche, language, or region",
          ]}
          link="/dashboard/centrality"
        />

        {/* 3. Community / cluster overview */}
        <AnalyticsCard
          label="graph #3"
          title="Predictive Analysis"
          badge="Community growth"
          description={
            <>
              Get a high-level view of your audience communities. See how clusters of viewers behave, helping you plan content strategy, engagement, and cross-channel growth.
            </>
          }
          highlights={[
            "Each node = a community / cluster of viewers",
            "Position & distance reflect similarity between clusters",
            "Colours show growth rate, engagement, or audience type",
          ]}
          link="/dashboard/predictive"
        />
      </div>
    </div>
  );
}

// ------------------------- Helper -------------------------

function AnalyticsCard({ label, title, badge, description, highlights, link }) {
  return (
    <Link
      to={link}
      className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 flex flex-col lg:flex-row gap-4 hover:shadow-lg transition"
    >
      <div className="flex-1 min-w-[220px]">
        <p className="text-[11px] font-medium uppercase tracking-wide text-sky-500">
          {label}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100">
            {badge}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {description}
        </p>

        <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
          {highlights?.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full lg:w-80 xl:w-96">
        <ChartPlaceholder />
      </div>
    </Link>
  );
}

function ChartPlaceholder() {
  return (
    <div className="h-52 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-x-6 bottom-8 h-20 bg-gradient-to-t from-sky-100 via-sky-50 to-transparent rounded-t-3xl" />
      <div className="absolute inset-x-14 bottom-10 h-16 bg-gradient-to-t from-violet-100 via-violet-50 to-transparent rounded-t-3xl opacity-70" />
      <div className="absolute inset-x-24 bottom-12 h-12 bg-gradient-to-t from-emerald-100 via-emerald-50 to-transparent rounded-t-3xl opacity-60" />

      <p className="relative text-[11px] text-slate-400 text-center px-4">
        Network graph placeholder
        <br />
        （ network graph，ECharts / D3 / Cytoscape）
      </p>
    </div>
  );
}

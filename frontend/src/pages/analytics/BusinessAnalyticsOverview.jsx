import { Link } from "react-router-dom";
import React from "react";

export default function BusinessAnalyticsOverview() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Analytics Overview for Business Users
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-3xl">
          Gain a high-level understanding of your industry, brand presence, and creator ecosystem. Use these analytics panels to evaluate influencers, assess brand centrality, forecast campaign reach, and compare engagement trends across your selected niches or linked channels.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* 1. Channel interaction graph */}
        <AnalyticsCard
          label="graph #1"
          title="Industry Network Graph"
          badge="Macro-level view"
          description={
            <>
          Visualize how creators in your selected <span className="font-semibold">industry or niche</span> connect through audience overlap, collaborations, and engagement clusters. Identify top influencers and detect where your brand can position itself effectively.            </>
          }
          highlights={[
          "Nodes = creators within your industry", 
          "Edges = shared audience, interactions, collaborations", 
          "Colour by niche/category, size by influence score",
          ]}
          link="/dashboard/network"
        />

        {/* 2. Brand–creator campaign graph */}
        <AnalyticsCard
          label="graph #2"
          title="Brand Centrality Metrics"
          badge="Influence positioning"
          description={
            <>
              Understand how your brand or linked channels rank within the broader creator ecosystem. View <span className="font-semibold">influence scores, audience overlap metrics,</span> and relationship strength compared to other creators in your niche.
            </>
          }
          highlights={[
            "Brand proximity to major influencers",
            "Audience overlap strength",
            "Influence, betweenness & eigenvector centrality scores",
          ]}
          link="/dashboard/centrality"
        />

        {/* 3. Community / cluster overview */}
        <AnalyticsCard
          label="graph #3"
          title="Campaign Reach Forecasting"
          badge="Community growth"
          description={
            <>
            Estimate potential marketing reach using creator performance metrics and historical engagement patterns. Discover which creators or segments can deliver the <span className="font-semibold"> highest projected ROI</span> for your campaigns.            </>
          }
          highlights={[
            "Predicted impressions for selected creator sets",
            "Optimal creator mix for maximum ROI",
            "Forecast based on historical engagement + trend analysis",
          ]}
          link="/dashboard/predictive"
        />



      <AnalyticsCard 
        label="multi_channel" 
        title="Multi-Channel Performance Overview" 
        badge="Brand-wide analytics" 
        description={ <> View combined analytics from all linked YouTube channels under your brand. Track overall growth, detect performance anomalies, and compare how each channel contributes to your broader strategy. </> } 
        highlights={[ "Compare views, engagement & audience growth across channels", "Identify high-performing content in your brand ecosystem", "Unify insights into one centralized dashboard", ]} link="/dashboard/channels" />
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
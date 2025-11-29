// src/pages/analytics/AnalyticsOverview.jsx

export default function AnalyticsOverview() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Analytics overview
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-3xl">
          Track subscriber growth, interaction patterns and community structure
          across your YouTube network. Below are three key network graph views
          that the system will generate for you.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* 1. Channel interaction graph */}
        <AnalyticsCard
          label="Network graph #1"
          title="Creator–creator interaction network"
          badge="Channel-level graph"
          description={
            <>
              Visualise how creators in your portfolio interact with each other
              through mentions, collabs and shared audiences. Useful for
              identifying{" "}
              <span className="font-semibold">high-influence hubs</span> and
              potential collaboration paths.
            </>
          }
          highlights={[
            "Nodes = individual creator channels",
            "Edges = comments, mentions, collab videos, shared audience",
            "Colour by niche / language, size by centrality score",
          ]}
        />

        {/* 2. Brand–creator campaign graph */}
        <AnalyticsCard
          label="Network graph #2"
          title="Brand–creator campaign network"
          badge="Campaign view"
          description={
            <>
              Map the relationships between{" "}
              <span className="font-semibold">brands and creators</span> across
              all active and historical campaigns. Helps business users see
              which creators are already associated with competing brands.
            </>
          }
          highlights={[
            "Bipartite graph: brands on one side, creators on the other",
            "Edge weight = campaign budget / impressions",
            "Filter by time range, region or industry",
          ]}
        />

        {/* 3. Community / cluster overview */}
        <AnalyticsCard
          label="Network graph #3"
          title="Community cluster overview"
          badge="Community view"
          description={
            <>
              High-level view of{" "}
              <span className="font-semibold">communities / clusters</span> in
              your network based on viewer behaviour. Good for strategic
              planning and cross-vertical expansion.
            </>
          }
          highlights={[
            "Each node = a community / cluster of channels",
            "Position & distance reflect similarity between clusters",
            "Colours can represent growth rate, risk level, or language",
          ]}
        />
      </div>
    </div>
  );
}


function AnalyticsCard({ label, title, badge, description, highlights }) {
  return (
    <section className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 flex flex-col lg:flex-row gap-4">
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
    </section>
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

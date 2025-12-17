import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Zap,
  Link2,
  Award,
  Sparkles,
  Info,
  Gauge,
  Shield,
} from "lucide-react";
import { useAuth } from "../../core/context/AuthContext";

export default function CentralityMetrics() {
  const [data, setData] = useState(null);
  const [videos, setVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const channelUrl = user.youtube_channel;
        if (!channelUrl) {
          throw new Error("No channel connected. Link your channel to view insights.");
        }

        const encodedUrl = encodeURIComponent(channelUrl);

        const [centralityRes, networkRes] = await Promise.all([
          fetch(
            `http://localhost:5000/api/youtube/videos.centralityMetrics?url=${encodedUrl}`
          ),
          fetch(
            `http://localhost:5000/api/youtube/videos.correlationNetwork?url=${encodedUrl}&maxVideos=50`
          ),
        ]);

        if (!centralityRes.ok) throw new Error("Failed to fetch centrality data");
        if (!networkRes.ok) throw new Error("Failed to fetch video details");

        const centralityData = await centralityRes.json();
        const networkData = await networkRes.json();
        setData(centralityData);

        const videoMap = {};
        (networkData.rawMetrics || []).forEach((v) => {
          videoMap[v.id || v.videoId] = {
            title: v.title || "Untitled",
            views: Number(v.views) || 0,
            likes: Number(v.likes) || 0,
            comments: Number(v.comments) || 0,
          };
        });
        setVideos(videoMap);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const centrality = data?.centrality || {};
  const normalized = data?.normalized_scores || {};
  const roles = data?.roles || {};
  const summary = data?.network_summary || {
    total_videos: nodes.length,
    total_connections: edges.length,
    density_score: 0,
    consistency_label: "Weak",
  };
  const insights = data?.insights || [];

  const videoInsights = useMemo(() => {
    return nodes.map((id) => ({
      id,
      title: videos[id]?.title || id,
      views: videos[id]?.views || 0,
      degree: normalized.degree?.[id] ?? (centrality.degree?.[id] || 0) * 100,
      betweenness: normalized.betweenness?.[id] ?? (centrality.betweenness?.[id] || 0) * 100,
      closeness: normalized.closeness?.[id] ?? (centrality.closeness?.[id] || 0) * 100,
      role: roles[id]?.primary_role,
      raw: {
        degree: centrality.degree?.[id] ?? 0,
        betweenness: centrality.betweenness?.[id] ?? 0,
        closeness: centrality.closeness?.[id] ?? 0,
      },
    }));
  }, [nodes, videos, normalized, centrality, roles]);

  const roleBuckets = useMemo(() => {
    const bucket = {
      "Pillar Content": [],
      "Bridge Content": [],
      "Core Content": [],
    };

    videoInsights.forEach((v) => {
      if (v.role && bucket[v.role]) {
        bucket[v.role].push(v);
      }
    });

    Object.keys(bucket).forEach((key) => {
      bucket[key].sort((a, b) => b.degree - a.degree);
    });

    return bucket;
  }, [videoInsights]);

  const topPillar = roleBuckets["Pillar Content"]?.[0];
  const topBridge = roleBuckets["Bridge Content"]?.[0];
  const topCore = roleBuckets["Core Content"]?.[0];

  if (loading) {
    return (
      <Shell title="Content Strategy Insights">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Analyzing your content patterns...</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell title="Content Strategy Insights">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium">Unable to analyze content</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </Shell>
    );
  }

  if (nodes.length === 0) {
    return (
      <Shell title="Content Strategy Insights">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800 font-medium mb-2">Not enough data to analyze</p>
          <p className="text-yellow-700 text-sm">
            We need at least two videos with comparable performance to map how your content connects.
          </p>
        </div>
      </Shell>
    );
  }

  const consistencyCopy = {
    Strong: "Your catalog feels cohesive. Lean on your signature formats to nurture loyal viewers.",
    Moderate: "You balance variety with familiarity. Promote the most connected videos to guide new viewers.",
    Weak: "Your topics are spread out. Use playlists or series to connect related themes.",
  };

  return (
    <Shell title="Content Strategy Insights">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-600 max-w-2xl">
          Spot your anchor videos, bridges, and best entry points—without needing to know any math.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showTechnical}
            onChange={() => setShowTechnical((v) => !v)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Advanced / Technical view
        </label>
      </div>

      {/* Decision-first actions */}
      <SectionCard title="What you should do next" icon={<Sparkles className="w-5 h-5 text-amber-500" />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ActionCard
            label="Most important"
            title={topPillar?.title || "Your most connected video"}
            description="Make 2–3 follow-ups in this style to keep your audience on familiar ground."
            badge="Pillar"
          />
          <ActionCard
            label="Recommended"
            title={topBridge?.title || "Your best discovery video"}
            description="Feature this in playlists and end screens to move viewers across topics."
            badge="Discovery"
          />
          <ActionCard
            label="Recommended"
            title={topCore?.title || "Your best entry video"}
            description="Use this as a channel trailer or first playlist item for new viewers."
            badge="Core"
          />
        </div>
      </SectionCard>

      {/* Plain-language summary */}
      <SectionCard title="What this means for your channel" icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}>
        <p className="text-sm text-slate-700">{consistencyCopy[summary.consistency_label]}</p>
        <p className="text-xs text-slate-500 mt-2">
          These picks are based on how your videos relate to each other—not on views alone.
        </p>
      </SectionCard>

      {/* Role highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <RolePanel
          title="Highly connected videos"
          subtitle="These represent what your channel is about."
          helper="Good for reinforcing your core theme."
          icon={<Award className="w-5 h-5" />}
          color="from-purple-500/20 to-purple-500/5"
          accent="text-purple-600"
          videos={roleBuckets["Pillar Content"]}
          showTechnical={showTechnical}
          technicalLabels={{ key: "Degree", friendly: "Highly connected" }}
        />
        <RolePanel
          title="Discovery videos"
          subtitle="These help viewers jump between topics."
          helper="Great for playlists and end screens."
          icon={<Link2 className="w-5 h-5" />}
          color="from-sky-500/20 to-sky-500/5"
          accent="text-sky-600"
          videos={roleBuckets["Bridge Content"]}
          showTechnical={showTechnical}
          technicalLabels={{ key: "Betweenness", friendly: "Discovery" }}
        />
        <RolePanel
          title="Best entry videos"
          subtitle="Easy starting points for new viewers."
          helper="Use as channel trailer or pinned content."
          icon={<TrendingUp className="w-5 h-5" />}
          color="from-emerald-500/20 to-emerald-500/5"
          accent="text-emerald-600"
          videos={roleBuckets["Core Content"]}
          showTechnical={showTechnical}
          technicalLabels={{ key: "Closeness", friendly: "Core reach" }}
        />
      </div>

      {/* Optional creator-friendly tips */}
      <SectionCard
        title="Quick tips for creators"
        icon={<Zap className="w-5 h-5 text-amber-500" />}
        actionLabel={showInsights ? "Hide" : "Show more"}
        onAction={() => setShowInsights((v) => !v)}
      >
        {!showInsights && (
          <p className="text-sm text-slate-600">Tap “Show more” for plain-language takeaways.</p>
        )}
        {showInsights && (
          <div className="space-y-3">
            {insights.length === 0 && (
              <p className="text-sm text-slate-500">Insights will appear once we have enough data.</p>
            )}
            {insights.map((tip, idx) => (
              <InsightItem key={idx} text={tip} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Advanced / technical view */}
      {showTechnical && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryStat
              label="Videos analyzed"
              value={summary.total_videos}
              icon={<Sparkles className="w-4 h-4" />}
            />
            <SummaryStat
              label="Content connections"
              value={summary.total_connections}
              icon={<Link2 className="w-4 h-4" />}
            />
            <SummaryStat
              label="Consistency score"
              value={`${Math.round(summary.density_score)} / 100`}
              icon={<Gauge className="w-4 h-4" />}
            />
            <SummaryStat
              label="Network health"
              value={summary.consistency_label}
              icon={<Shield className="w-4 h-4" />}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Technical breakdown</h3>
            </div>
            <CentralityTable videos={videoInsights} showTechnical={showTechnical} />
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, title }) {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">{title}</h1>
        <p className="text-sm text-slate-600">
          Channel-friendly guidance powered by your existing video network.
        </p>
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, icon, children, actionLabel, onAction }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg">{icon}</div>
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
          </div>
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryStat({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
      <div className="bg-slate-900 text-white p-2 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function RolePanel({ title, subtitle, helper, icon, color, accent, videos, showTechnical, technicalLabels }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-gradient-to-br ${color} p-5`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={`${accent.replace("text-", "bg-")} text-white p-2 rounded-lg`}>{icon}</div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">{subtitle}</p>
          <p className="text-[11px] text-slate-500 mt-1">{helper}</p>
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="text-sm text-slate-500">No videos in this role yet.</p>
      ) : (
        <div className="space-y-3">
          {videos.slice(0, 3).map((video, idx) => (
            <div key={video.id} className="bg-white border border-slate-100 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 mt-0.5">#{idx + 1}</span>
                  {idx === 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                      Most important
                    </span>
                  )}
                  {idx > 0 && (
                    <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                      Supporting
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{video.title}</p>
                  <p className="text-xs text-slate-500">{video.views.toLocaleString()} views</p>
                </div>
              </div>
              {showTechnical && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <TechPill label="Degree" value={video.raw.degree} />
                  <TechPill label="Betweenness" value={video.raw.betweenness} />
                  <TechPill label="Closeness" value={video.raw.closeness} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({ label, title, description, badge }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
          {label}
        </span>
        <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">
          {badge}
        </span>
      </div>
      <p className="font-semibold text-slate-900 line-clamp-2">{title}</p>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

function InsightItem({ text }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        ✓
      </div>
      <p className="text-sm text-slate-700">{text}</p>
    </div>
  );
}

function CentralityTable({ videos, showTechnical }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-12 bg-slate-50 text-xs font-semibold text-slate-600 px-4 py-2">
        <div className="col-span-6">Video</div>
        <div className="col-span-2 text-center">{showTechnical ? "Degree" : "Highly connected"}</div>
        <div className="col-span-2 text-center">{showTechnical ? "Betweenness" : "Discovery"}</div>
        <div className="col-span-2 text-center">{showTechnical ? "Closeness" : "Core reach"}</div>
      </div>
      <div className="divide-y divide-slate-100">
        {videos.slice(0, 8).map((v) => (
          <div key={v.id} className="grid grid-cols-12 px-4 py-3 text-sm items-center">
            <div className="col-span-6">
              <p className="font-medium text-slate-900 truncate">{v.title}</p>
              {showTechnical && (
                <p className="text-[11px] text-slate-500 truncate">ID: {v.id}</p>
              )}
            </div>
            <div className="col-span-2 text-center">
              <ScorePill value={Math.round(v.degree)} label={showTechnical ? "Degree" : "Connections"} />
            </div>
            <div className="col-span-2 text-center">
              <ScorePill value={Math.round(v.betweenness)} label={showTechnical ? "Betweenness" : "Bridges"} />
            </div>
            <div className="col-span-2 text-center">
              <ScorePill value={Math.round(v.closeness)} label={showTechnical ? "Closeness" : "Core reach"} />
            </div>
          </div>
        ))}
        {videos.length === 0 && (
          <div className="px-4 py-3 text-sm text-slate-500">No videos available.</div>
        )}
      </div>
    </div>
  );
}

function ScorePill({ value, label }) {
  return (
    <div className="inline-flex flex-col items-center justify-center gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-900 text-xs font-semibold">
        {value}/100
      </span>
    </div>
  );
}

function TechPill({ label, value }) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
      <span>{label}</span>
      <span className="font-semibold">{Number(value).toFixed(2)}</span>
    </div>
  );
}
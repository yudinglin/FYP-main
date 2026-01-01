// frontend/src/pages/Business/CentralityMetrics.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  PlayCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useAuth } from "../../core/context/AuthContext";

const API_BASE = "http://localhost:5000";

/**
 * Business Centrality Metrics
 * - Single channel: show centrality insights for that channel
 * - All channels: show a section per channel (avoid ID collisions)
 */
export default function CentralityMetrics() {
  const { user } = useAuth();

  // ---------- channel selector (same logic as BusinessDashboard) ----------
  const channels = Array.isArray(user?.youtube_channels) ? user.youtube_channels : [];

  const options = useMemo(() => {
    const base = [{ key: "ALL", label: "All channels (sum)", urls: channels.map((c) => c.url).filter(Boolean) }];
    const singles = channels
      .map((c, idx) => ({
        key: `CH_${idx}`,
        label: c?.name ? c.name : `Channel ${idx + 1}`,
        urls: c?.url ? [c.url] : [],
      }))
      .filter((o) => o.urls.length > 0);
    return [...base, ...singles];
  }, [channels]);

  const [selectedKey, setSelectedKey] = useState("ALL");

  const selectedOption = options.find((o) => o.key === selectedKey) || options[0];
  const selectedUrls = selectedOption?.urls || [];

  // ---------- data states ----------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // when ALL: results[]; when single: results has 1 item
  const [results, setResults] = useState([]); 
  // each item: { label, url, data, videosMap }

  useEffect(() => {
    async function fetchOne(url, label) {
      const encodedUrl = encodeURIComponent(url);

      const [centralityRes, networkRes] = await Promise.all([
        fetch(`${API_BASE}/api/youtube/videos.centralityMetrics?url=${encodedUrl}`),
        fetch(`${API_BASE}/api/youtube/videos.correlationNetwork?url=${encodedUrl}&maxVideos=50`),
      ]);

      if (!centralityRes.ok) {
        const t = await centralityRes.text();
        throw new Error(t || `Failed to fetch content insights for ${label}`);
      }
      if (!networkRes.ok) {
        const t = await networkRes.text();
        throw new Error(t || `Failed to fetch video details for ${label}`);
      }

      const centralityData = await centralityRes.json();
      const networkData = await networkRes.json();

      const videoMap = {};
      (networkData.rawMetrics || []).forEach((v) => {
        const vid = v.id || v.videoId || v.videoID;
        if (!vid) return;
        videoMap[vid] = {
          title: v.title || "Untitled",
          views: Number(v.views) || 0,
          likes: Number(v.likes) || 0,
          comments: Number(v.comments) || 0,
        };
      });

      return { label, url, data: centralityData, videosMap: videoMap };
    }

    async function fetchAll() {
      setLoading(true);
      setError(null);
      setResults([]);

      try {
        if (!selectedUrls || selectedUrls.length === 0) {
          throw new Error("No channel connected. Please add channels in Business Profile → Link Channel.");
        }

        // build labels from user.youtube_channels
        const urlToLabel = new Map();
        channels.forEach((c, idx) => {
          if (c?.url) urlToLabel.set(c.url, c?.name || `Channel ${idx + 1}`);
        });

        const tasks = selectedUrls.map((url) => fetchOne(url, urlToLabel.get(url) || "Channel"));
        const res = await Promise.all(tasks);

        setResults(res);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to load centrality metrics");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [selectedKey, user]); // user changes when login/profile update

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-slate-600">Loading centrality insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Brand & Creator Centrality</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Switch channels to view different centrality insights. “All channels” shows one section per channel.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* Selector */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Selected</p>
            <p className="text-xs text-slate-500 mt-1">{selectedOption?.label || "All channels (sum)"}</p>
          </div>

          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </section>

        {/* Content */}
        {results.map((item) => (
          <CentralityPanel key={item.url} title={item.label} data={item.data} videosMap={item.videosMap} />
        ))}
      </div>
    </div>
  );
}

function CentralityPanel({ title, data, videosMap }) {
  const nodes = data?.nodes || [];
  const scores = data?.scores || {};
  const roles = data?.roles || {};
  const summary = data?.summary || {
    total_videos: nodes.length,
    total_connections: 0,
    content_cohesion: 0,
    cohesion_label: "Building",
    cohesion_explanation: "Your content is growing!",
  };
  const insights = data?.insights || [];

  const videoInsights = useMemo(() => {
    return nodes.map((id) => ({
      id,
      title: videosMap?.[id]?.title || id,
      views: videosMap?.[id]?.views || 0,
      content_influence: scores.content_influence?.[id] || 0,
      role: roles[id]?.primary_role || null,
      roleData: roles[id] || {},
    }));
  }, [nodes, videosMap, scores, roles]);

  const topPositive = [...videoInsights]
    .sort((a, b) => b.content_influence - a.content_influence)
    .slice(0, 5);

  const topNegative = [...videoInsights]
    .sort((a, b) => a.content_influence - b.content_influence)
    .slice(0, 5);

  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-500">Videos analyzed: {summary.total_videos ?? nodes.length}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniCard
          icon={<TrendingUp className="w-4 h-4" />}
          title="Content cohesion"
          value={summary.cohesion_label}
          subtitle={summary.cohesion_explanation}
        />
        <MiniCard
          icon={<CheckCircle className="w-4 h-4" />}
          title="Total connections"
          value={summary.total_connections ?? 0}
          subtitle="How interconnected your videos are"
        />
        <MiniCard
          icon={<PlayCircle className="w-4 h-4" />}
          title="Cohesion score"
          value={Number(summary.content_cohesion ?? 0).toFixed(2)}
          subtitle="0 ~ 1 (higher is more connected)"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListPanel title="Top positive influence" icon={<ThumbsUp className="w-4 h-4" />} items={topPositive} positive />
        <ListPanel title="Top negative influence" icon={<ThumbsDown className="w-4 h-4" />} items={topNegative} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-900">
          <Lightbulb className="w-4 h-4" />
          <p className="text-sm font-semibold">Insights</p>
        </div>
        {insights.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No insights available.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {insights.map((ins, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-slate-400" />
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MiniCard({ icon, title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value ?? "--"}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function ListPanel({ title, icon, items, positive = false }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-900">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No data</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((v) => (
            <li key={v.id} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-900 line-clamp-1">{v.title}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                <span>Views: {Number(v.views || 0).toLocaleString()}</span>
                <span className={`font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
                  {Number(v.content_influence || 0).toFixed(3)}
                </span>
              </div>
              {v.role ? (
                <p className="mt-2 text-xs text-slate-500">
                  Role: <span className="text-slate-700 font-medium">{v.role}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

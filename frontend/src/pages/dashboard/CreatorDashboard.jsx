// frontend/src/pages/dashboard/CreatorDashboard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * CreatorDashboard — uses the existing backend route
 * /api/youtube/videos.correlationNetwork?url=...
 * which returns { nodes, edges, rawMetrics: [...] }
 *
 * This file computes engagement client-side from rawMetrics:
 * engagement = (likes + comments) / views
 */

export default function CreatorDashboard() {
  const [subscribers, setSubscribers] = useState(null);
  const [viewCount, setViewCount] = useState(null);
  const [totalLikes, setTotalLikes] = useState(null);
  const [totalComments, setTotalComments] = useState(null);

  const [topVideos, setTopVideos] = useState([]);
  const [latestComments, setLatestComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStatsAndVideos() {
      setLoading(true);
      setError(null);

      try {
        const channelUrl = localStorage.getItem("channelUrl");
        if (!channelUrl) {
          throw new Error("No channelUrl found in localStorage");
        }
        const q = encodeURIComponent(channelUrl);

        // 1) channels.list
        const r1 = await fetch(`http://localhost:5000/api/youtube/channels.list?url=${q}`);
        if (!r1.ok) throw new Error("channels.list request failed");
        const d1 = await r1.json();
        setSubscribers(d1.subscriberCount ?? 0);
        setViewCount(d1.viewCount ?? 0);

        // 2) videos.list (totals)
        const r2 = await fetch(`http://localhost:5000/api/youtube/videos.list?url=${q}`);
        if (!r2.ok) throw new Error("videos.list request failed");
        const d2 = await r2.json();
        setTotalLikes(d2.totalLikes ?? 0);
        setTotalComments(d2.totalComments ?? 0);

        // 3) videos.correlationNetwork -> contains rawMetrics
        const r3 = await fetch(
          `http://localhost:5000/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`
        );
        if (!r3.ok) {
          const txt = await r3.text();
          throw new Error(`videos.correlationNetwork failed: ${r3.status} ${txt}`);
        }
        const d3 = await r3.json();

        const raw = d3.rawMetrics ?? d3.nodes ?? [];

        // Compute engagement and sort descending
        const withEngagement = raw.map((v) => {
          const views = Number(v.views) || 0;
          const likes = Number(v.likes) || 0;
          const comments = Number(v.comments) || 0;
          const engagement = views > 0 ? (likes + comments) / views : 0;
          return {
            videoId: v.id || v.videoId || v.videoID || "",
            title: v.title || "Untitled",
            views,
            likeCount: likes,
            commentCount: comments,
            publishedAt: v.publishedAt || "",
            engagementScore: engagement,
          };
        });

        const sorted = withEngagement
          .sort((a, b) => b.engagementScore - a.engagementScore)
          .slice(0, 4);

        setTopVideos(sorted);

        // 4) Fetch latest comments
        const r4 = await fetch(
          `http://localhost:5000/api/youtube/videos.latestComments?url=${q}&maxResults=5`
        );
        if (!r4.ok) {
          console.warn("Failed to fetch comments");
          setLatestComments([]);
        } else {
          const d4 = await r4.json();
          setLatestComments(d4.comments || []);
        }

      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError(err.message || "Failed to load dashboard data");
        setTopVideos([]);
        setLatestComments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStatsAndVideos();
  }, []);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back Creator</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          High-level overview of your YouTube channels, campaigns and network performance.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 flex gap-6">
        <aside className="w-60 shrink-0 rounded-2xl bg-slate-900 text-slate-100 shadow-lg flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="mt-1 font-semibold">Creator Dashboard</p>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1 text-sm">
            <SidebarItem label="Overview" to="/dashboard" active />
            <div className="mt-4 border-t border-slate-800 pt-3" />
            <SidebarItem label="Network Graph" to="/dashboard/network" />
            <SidebarItem label="Centrality Metrics" to="/dashboard/centrality" />
            <SidebarItem label="Predictive Analysis" to="/dashboard/predictive" />
          </nav>

          <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800 text-xs text-slate-400">
            <p className="font-medium text-slate-200">Tip</p>
            <p className="mt-1">Use engagement to spot high-performing content.</p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total subscribers"
              value={formatValue(subscribers, loading, error)}
            />
            <StatCard label="View count" value={formatValue(viewCount, loading, error)} />
            <StatCard label="Total likes" value={formatValue(totalLikes, loading, error)} />
            <StatCard label="Total comments" value={formatValue(totalComments, loading, error)} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Latest Video" />
              <Panel title="Predictive View Count">
                <ChartPlaceholder variant="line" />
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel title="Top Videos by Engagement">
                <ul className="divide-y divide-slate-100 text-sm">
                  {loading && <p className="text-xs text-slate-400 py-3">Loading...</p>}

                  {!loading && topVideos.length === 0 && (
                    <p className="text-xs text-slate-400 py-3">No engagement data available</p>
                  )}

                  {topVideos.map((v) => (
                    <VideoRow
                      key={v.videoId || v.title}
                      title={v.title}
                      metric={`${v.likeCount.toLocaleString()} likes`}
                      badge={`${(v.engagementScore * 100).toFixed(2)}% engagement • ${v.views.toLocaleString()} views`}
                    />
                  ))}
                </ul>
              </Panel>

              <Panel title="Latest Comments">
                {loading && <p className="text-xs text-slate-400 py-3">Loading comments...</p>}
                
                {!loading && latestComments.length === 0 && (
                  <p className="text-xs text-slate-400 py-3">No recent comments</p>
                )}

                {!loading && latestComments.length > 0 && (
                  <ul className="space-y-3 text-xs">
                    {latestComments.map((comment, idx) => (
                      <CommentRow
                        key={`${comment.videoId}-${idx}`}
                        author={comment.author}
                        text={comment.text}
                        publishedAt={comment.publishedAt}
                        likeCount={comment.likeCount}
                      />
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ------------------- Helper components ------------------- */

function formatValue(value, loading, error) {
  if (loading) return "Loading...";
  if (error) return "--";
  return value?.toLocaleString() ?? "--";
}

function VideoRow({ title, metric, badge }) {
  return (
    <li className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-400">{badge}</p>
      </div>
      <p className="text-xs font-semibold text-emerald-600">{metric}</p>
    </li>
  );
}

function CommentRow({ author, text, publishedAt, likeCount }) {
  // Format date to relative time
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Truncate text to ~100 characters
  const truncatedText = text.length > 100 ? text.substring(0, 100) + "..." : text;

  return (
    <li className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between mb-1">
        <p className="font-medium text-slate-800 text-xs">{author}</p>
        <span className="text-[10px] text-slate-400">{formatDate(publishedAt)}</span>
      </div>
      <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5">{truncatedText}</p>
      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <span>👍</span>
        <span>{likeCount}</span>
      </div>
    </li>
  );
}

function SidebarItem({ label, active = false, to }) {
  return (
    <Link
      to={to}
      className={`w-full flex items-center rounded-xl px-3 py-2 text-left transition ${
        active ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-200 hover:bg-slate-800/70 hover:text-white"
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${active ? "bg-emerald-500" : "bg-slate-500"}`} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm border border-slate-100 flex flex-col justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ChartPlaceholder({ variant = "area" }) {
  const gradient = variant === "area" ? "bg-gradient-to-t from-sky-100 via-sky-50 to-transparent" : "bg-gradient-to-r from-violet-100 via-sky-50 to-emerald-100";
  return (
    <div className="h-48 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-end overflow-hidden relative">
      <div className={`w-full h-4/5 ${gradient}`} />
      <p className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wide text-slate-400">Chart placeholder · hook to real data later</p>
    </div>
  );
}
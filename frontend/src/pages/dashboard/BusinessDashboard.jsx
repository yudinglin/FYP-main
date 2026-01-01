import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";

export default function BusinessDashboard() {
  const { user } = useAuth();

  // Get the channel list from user.youtube_channels returned by the backend profile.
  const channels = useMemo(() => {
    const list = Array.isArray(user?.youtube_channels) ? user.youtube_channels : [];
    return list
      .map((c) => ({
        url: (c?.url || "").trim(),
        name: (c?.name || "").trim(),
        is_primary: Boolean(c?.is_primary),
      }))
      .filter((c) => c.url);
  }, [user]);

  // Dropdown: All channels + Single channel
  const options = useMemo(() => {
    const all = { key: "__ALL__", label: "All channels (sum)", url: "" };
    const singles = channels.map((c, idx) => ({
      key: c.url || String(idx),
      label: c.name ? `${c.name}${c.is_primary ? " (Primary)" : ""}` : `${c.url}${c.is_primary ? " (Primary)" : ""}`,
      url: c.url,
    }));
    return [all, ...singles];
  }, [channels]);

  const [selectedKey, setSelectedKey] = useState("__ALL__");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [subscriberCount, setSubscriberCount] = useState(null);
  const [viewCount, setViewCount] = useState(null);
  const [totalLikes, setTotalLikes] = useState(null);
  const [totalComments, setTotalComments] = useState(null);

  const [topVideos, setTopVideos] = useState([]);
  const [latestComments, setLatestComments] = useState([]);

  const navigate = useNavigate();

  // Determine the channelUrls to run based on selectedKey.
  const selectedUrls = useMemo(() => {
    if (selectedKey === "__ALL__") return channels.map((c) => c.url);
    const one = options.find((o) => o.key === selectedKey);
    return one?.url ? [one.url] : [];
  }, [selectedKey, channels, options]);

  useEffect(() => {
    async function fetchAll() {
      setError("");

      if (!selectedUrls.length) {
        setSubscriberCount(null);
        setViewCount(null);
        setTotalLikes(null);
        setTotalComments(null);
        setTopVideos([]);
        setLatestComments([]);
        return;
      }

      setLoading(true);

      try {
        // Drag stats from each channel, then sum them.
        let sumSubs = 0;
        let sumViews = 0;
        let sumLikes = 0;
        let sumComments = 0;

        const allVideosForRanking = [];
        let commentsCollected = [];

        for (const url of selectedUrls) {
          const q = encodeURIComponent(url);

          // channel stats
          const r1 = await fetch(`http://localhost:5000/api/youtube/channels.list?url=${q}`);
          if (!r1.ok) throw new Error(`channels.list failed for ${url}`);
          const d1 = await r1.json();
          sumSubs += Number(d1.subscriberCount || 0);
          sumViews += Number(d1.viewCount || 0);

          // total likes/comments
          const r2 = await fetch(`http://localhost:5000/api/youtube/videos.list?url=${q}`);
          if (!r2.ok) throw new Error(`videos.list failed for ${url}`);
          const d2 = await r2.json();
          sumLikes += Number(d2.totalLikes || 0);
          sumComments += Number(d2.totalComments || 0);

          // top videos ranking (use correlationNetwork of rawMetrics)
          const r3 = await fetch(
            `http://localhost:5000/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`
          );
          if (r3.ok) {
            const d3 = await r3.json();
            const raw = d3.rawMetrics ?? d3.nodes ?? [];
            raw.forEach((v) => {
              const views = Number(v.views) || 0;
              const likes = Number(v.likes) || 0;
              const comments = Number(v.comments) || 0;
              const engagement = views > 0 ? (likes + comments) / views : 0;
              allVideosForRanking.push({
                videoId: v.id || v.videoId || "",
                title: v.title || "Untitled",
                views,
                likes,
                comments,
                engagementScore: engagement,
              });
            });
          }

          // Latest comments: 5 comments are pulled from each channel, and the latest 5 comments are merged at the end.
          const r4 = await fetch(
            `http://localhost:5000/api/youtube/videos.latestComments?url=${q}&maxResults=5`
          );
          if (r4.ok) {
            const d4 = await r4.json();
            const arr = Array.isArray(d4.comments) ? d4.comments : [];
            commentsCollected = commentsCollected.concat(arr);
          }
        }

        setSubscriberCount(sumSubs);
        setViewCount(sumViews);
        setTotalLikes(sumLikes);
        setTotalComments(sumComments);

        // Top videos: Sorted by engagement after full merge, the top 4 are selected.
        const top = allVideosForRanking
          .filter((v) => v.videoId)
          .sort((a, b) => b.engagementScore - a.engagementScore)
          .slice(0, 4);
        setTopVideos(top);

        // Latest comments: Sort by time field (if applicable), otherwise take the top 5.
        const latest = commentsCollected.slice(0, 5);
        setLatestComments(latest);
      } catch (e) {
        setError(e?.message || "Failed to load business dashboard");
        setSubscriberCount(null);
        setViewCount(null);
        setTotalLikes(null);
        setTotalComments(null);
        setTopVideos([]);
        setLatestComments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [selectedUrls]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back Business User</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Default view is <b>All channels (sum)</b>. You can switch to a single channel below.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 flex gap-6">
        <aside className="w-60 shrink-0 rounded-2xl bg-slate-900 text-slate-100 shadow-lg flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="mt-1 font-semibold">Business Dashboard</p>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1 text-sm">
              <SidebarItem label="Overview" active onClick={() => navigate("/dashboard/business")} />

              <div className="mt-4 border-t border-slate-800 pt-3" />

              <SidebarItem
                label="Industry Network Graph"
                onClick={() => navigate("/dashboard/business/network")}
              />
              <SidebarItem
                label="Brand & Creator Centrality"
                onClick={() => navigate("/dashboard/business/centrality")}
              />
              <SidebarItem
                label="Campaign Forecasting"
                onClick={() => navigate("/dashboard/business/forecasting")}
              />
          </nav>

          <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800 text-xs text-slate-400">
            <p className="font-medium text-slate-200">Tip</p>
            <p className="mt-1">Add channels in Business Profile → Link Channel.</p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          {/* Selector */}
          <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Selected</p>
              <p className="text-xs text-slate-500 mt-1">
                {options.find((o) => o.key === selectedKey)?.label || "—"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {options.length <= 1 ? (
                <Link to="/business/profile" className="text-sm font-semibold text-blue-600 hover:underline">
                  Go link channels
                </Link>
              ) : (
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                >
                  {options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* KPI */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total subscribers" value={loading ? "Loading..." : formatNum(subscriberCount)} />
            <StatCard label="View count" value={loading ? "Loading..." : formatNum(viewCount)} />
            <StatCard label="Total likes" value={loading ? "Loading..." : formatNum(totalLikes)} />
            <StatCard label="Total comments" value={loading ? "Loading..." : formatNum(totalComments)} />
          </section>

          {/* Right side blocks */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Top Videos by Engagement">
                {topVideos.length === 0 ? (
                  <p className="text-sm text-slate-500">No engagement data available</p>
                ) : (
                  <ul className="space-y-2">
                    {topVideos.map((v) => (
                      <li key={v.videoId} className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{v.title}</p>
                            <p className="text-xs text-slate-500">
                              Views: {formatNum(v.views)} · Likes: {formatNum(v.likes)} · Comments: {formatNum(v.comments)}
                            </p>
                          </div>
                          <p className="text-xs font-semibold text-emerald-700">
                            {(v.engagementScore * 100).toFixed(2)}%
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel title="Latest Comments">
                {latestComments.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent comments</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {latestComments.map((c, idx) => (
                      <li key={idx} className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-slate-900">{c.text || c.comment || "—"}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {c.author ? `By ${c.author}` : ""} {c.publishedAt ? `· ${c.publishedAt}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Quick Actions">
                <div className="space-y-2">
                  <Link
                    to="/business/profile"
                    className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    Manage linked channels
                  </Link>
                </div>
              </Panel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}   
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


function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm border border-slate-100 flex flex-col justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value ?? "--"}</p>
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

function formatNum(n) {
  if (n === null || n === undefined) return "--";
  const x = Number(n);
  if (Number.isNaN(x)) return "--";
  return x.toLocaleString();
}

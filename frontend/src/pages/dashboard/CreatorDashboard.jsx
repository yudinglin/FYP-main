// frontend/src/pages/dashboard/CreatorDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../core/context/AuthContext";
import ReviewBubble from "../../pages/misc/ReviewBubble.jsx";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const [channelName, setChannelName] = useState("");
  const { user } = useAuth();

  const [topVideos, setTopVideos] = useState([]);
  const [latestComments, setLatestComments] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [latestVideo, setLatestVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
  if (!user?.youtube_channel) return;

  async function fetchStatsAndVideos() {
    setLoading(true);
    setError(null);

    try {
      const channelUrl = user.youtube_channel;
      const q = encodeURIComponent(channelUrl);

      const r1 = await fetch(`${API_BASE}/api/youtube/channels.list?url=${q}`);
      if (!r1.ok) throw new Error("channels.list request failed");
      const d1 = await r1.json();
      setSubscribers(d1.subscriberCount ?? 0);
      setViewCount(d1.viewCount ?? 0);
      setChannelName(d1.channelName || "");

      const r2 = await fetch(`${API_BASE}/api/youtube/videos.list?url=${q}`);
      if (!r2.ok) throw new Error("videos.list request failed");
      const d2 = await r2.json();
      setTotalLikes(d2.totalLikes ?? 0);
      setTotalComments(d2.totalComments ?? 0);

      const r3 = await fetch(
        `(${API_BASE}/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`
      );
      if (!r3.ok) {
        const txt = await r3.text();
        throw new Error(`videos.correlationNetwork failed: ${r3.status} ${txt}`);
      }
      const d3 = await r3.json();

      const raw = d3.rawMetrics ?? d3.nodes ?? [];
      const withEngagement = raw.map((v) => {
        const views = Number(v.views) || 0;
        const likes = Number(v.likes) || 0;
        const comments = Number(v.comments) || 0;
        const engagement = views > 0 ? (likes + comments) / views : 0;
        return {
          videoId: v.id || v.videoId || v.videoID || "",
          title: v.title || "Untitled",
          thumbnail: v.thumbnail || "",
          views,
          likeCount: likes,
          commentCount: comments,
          publishedAt: v.publishedAt || "",
          engagementScore: engagement,
        };
      });

      setAllVideos(withEngagement);
      setTopVideos(withEngagement.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 4));
      
      // Find latest video by publishedAt
      const sortedByDate = [...withEngagement]
        .filter(v => v.publishedAt)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      setLatestVideo(sortedByDate.length > 0 ? sortedByDate[0] : null);

      const r4 = await fetch(
        `(${API_BASE}/api/youtube/videos.latestComments?url=${q}&maxResults=5`
      );
      if (!r4.ok) setLatestComments([]);
      else {
        const d4 = await r4.json();
        setLatestComments(d4.comments || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
      setTopVideos([]);
      setLatestComments([]);
    } finally {
      setLoading(false);
    }
  }

  fetchStatsAndVideos();
}, [user?.youtube_channel]);

  // Calculate additional metrics
  const additionalMetrics = useMemo(() => {
    if (allVideos.length === 0) {
      return {
        avgEngagementRate: 0,
        avgViewsPerVideo: 0,
        subscriberGrowthRate: 0,
        
      };
    }

    // Average engagement rate
    const totalEngagement = allVideos.reduce((sum, v) => sum + v.engagementScore, 0);
    const avgEngagementRate = (totalEngagement / allVideos.length) * 100;

    // Average views per video
    const totalViews = allVideos.reduce((sum, v) => sum + v.views, 0);
    const avgViewsPerVideo = totalViews / allVideos.length;

    // Subscriber growth rate (estimate based on video performance)
    // This is a simplified calculation - in reality you'd need historical subscriber data
    const recentVideos = allVideos
      .filter(v => v.publishedAt)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 10);
    
    const recentAvgViews = recentVideos.length > 0
      ? recentVideos.reduce((sum, v) => sum + v.views, 0) / recentVideos.length
      : 0;
    
    const olderVideos = allVideos
      .filter(v => v.publishedAt)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(10, 20);
    
    const olderAvgViews = olderVideos.length > 0
      ? olderVideos.reduce((sum, v) => sum + v.views, 0) / olderVideos.length
      : recentAvgViews;
    
    const subscriberGrowthRate = olderAvgViews > 0
      ? ((recentAvgViews - olderAvgViews) / olderAvgViews) * 100
      : 0;

    return {
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
      avgViewsPerVideo: Math.round(avgViewsPerVideo),
      subscriberGrowthRate: parseFloat(subscriberGrowthRate.toFixed(1)),
    };
  }, [allVideos]);

  // Prepare time-series data for chart
  const chartData = useMemo(() => {
    if (allVideos.length === 0) return [];

    const videosWithDates = allVideos
      .filter(v => v.publishedAt)
      .map(v => ({
        ...v,
        date: new Date(v.publishedAt),
      }))
      .sort((a, b) => a.date - b.date);

    // Group by month and sum views
    const monthlyData = {};
    videosWithDates.forEach(video => {
      const monthKey = `${video.date.getFullYear()}-${String(video.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          views: 0,
          videos: 0,
        };
      }
      monthlyData[monthKey].views += video.views;
      monthlyData[monthKey].videos += 1;
    });

    return Object.values(monthlyData)
      .map(item => ({
        ...item,
        monthLabel: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [allVideos]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back  {user?.first_name || "Creator"}</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          {channelName ? `Viewing channel: ${channelName}` : "High-level overview of your YouTube channels, campaigns and network performance."}
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
            {/* <SidebarItem label="Centrality Metrics" to="/dashboard/centrality" /> */}
            <SidebarItem label="Predictive Analysis" to="/dashboard/predictive" />
            <SidebarItem label="Analyse Comments" to="/dashboard/sentiment" />
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

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              label="Avg Engagement Rate"
              value={loading ? "Loading..." : error ? "--" : `${additionalMetrics.avgEngagementRate}%`}
            />
            <StatCard
              label="Avg Views per Video"
              value={loading ? "Loading..." : error ? "--" : formatValue(additionalMetrics.avgViewsPerVideo, false, false)}
            />
            <StatCard
              label="Growth Rate (Est.)"
              value={loading ? "Loading..." : error ? "--" : `${additionalMetrics.subscriberGrowthRate >= 0 ? '+' : ''}${additionalMetrics.subscriberGrowthRate}%`}
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Latest Video">
                {loading && <p className="text-xs text-slate-400 py-3">Loading latest video...</p>}
                {!loading && !latestVideo && (
                  <p className="text-xs text-slate-400 py-3">No video data available</p>
                )}
                {!loading && latestVideo && <LatestVideoCard video={latestVideo} />}
              </Panel>
              <Panel title="Views Over Time">
                {loading && (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-xs text-slate-400">Loading chart data...</p>
                  </div>
                )}
                {!loading && chartData.length === 0 && (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-xs text-slate-400">No chart data available</p>
                  </div>
                )}
                {!loading && chartData.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                        <XAxis
                          dataKey="monthLabel"
                          stroke="#64748b"
                          style={{ fontSize: "10px" }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          stroke="#64748b"
                          style={{ fontSize: "10px" }}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                            return value.toString();
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value) => [value.toLocaleString(), 'Views']}
                        />
                        <Area
                          type="monotone"
                          dataKey="views"
                          stroke="#8b5cf6"
                          fillOpacity={1}
                          fill="url(#colorViews)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
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
      <ReviewBubble />
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

function LatestVideoCard({ video }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown date";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const engagementRate = video.views > 0
    ? ((video.likeCount + video.commentCount) / video.views * 100).toFixed(2)
    : "0.00";

  const videoUrl = video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : "#";

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {/* Thumbnail placeholder */}
        <div className="w-32 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-200">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl">🎬</span>
            </div>
          )}
        </div>

        
        <div className="flex-1 min-w-0">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-2 mb-1">
              {video.title}
            </h3>
          </a>
          <p className="text-xs text-slate-500 mb-2">{formatDate(video.publishedAt)}</p>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-slate-400">Views</p>
              <p className="font-semibold text-slate-900">{video.views.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400">Likes</p>
              <p className="font-semibold text-emerald-600">{video.likeCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400">Engagement</p>
              <p className="font-semibold text-purple-600">{engagementRate}%</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span>{video.commentCount.toLocaleString()} comments</span>
        <span>•</span>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          Watch on YouTube →
        </a>
      </div>
    </div>
  );
}
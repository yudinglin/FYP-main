import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, FileChartLine, FileText, SlidersHorizontal, X, TrendingUp, ExternalLink } from "lucide-react";
import ReviewBubble from "../../pages/misc/ReviewBubble.jsx";
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

  // Find primary channel
  const primaryChannel = useMemo(() => {
    return channels.find(c => c.is_primary) || channels[0] || null;
  }, [channels]);

  // Options: Only single channels (no "All channels" option)
  const options = useMemo(() => {
    return channels.map((c, idx) => ({
      key: c.url || String(idx),
      label: c.name ? `${c.name}${c.is_primary ? " (Primary)" : ""}` : `${c.url}${c.is_primary ? " (Primary)" : ""}`,
      url: c.url,
      is_primary: c.is_primary
    }));
  }, [channels]);

  // Default to primary channel if available, otherwise first channel
  const [selectedKey, setSelectedKey] = useState(() => {
    if (primaryChannel) return primaryChannel.url;
    if (channels.length > 0) return channels[0].url;
    return "";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [subscriberCount, setSubscriberCount] = useState(null);
  const [viewCount, setViewCount] = useState(null);
  const [totalLikes, setTotalLikes] = useState(null);
  const [totalComments, setTotalComments] = useState(null);

  const [topVideos, setTopVideos] = useState([]);
  const [latestComments, setLatestComments] = useState([]);

  const [reportRange, setReportRange] = useState("weekly");
  const [includeSections, setIncludeSections] = useState({
    kpis: true,
    topVideos: true,
    comments: false,
  });
  const [reportNotes, setReportNotes] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const navigate = useNavigate();

  // Determine the channelUrls to run based on selectedKey.
  const selectedUrls = useMemo(() => {
    if (!selectedKey) return [];
    return [selectedKey];
  }, [selectedKey]);

  // Update selectedKey when primary channel changes (e.g., on first load)
  useEffect(() => {
    if (primaryChannel && !selectedKey) {
      setSelectedKey(primaryChannel.url);
    }
  }, [primaryChannel, selectedKey]);

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
        const url = selectedUrls[0];
        const q = encodeURIComponent(url);

        // channel stats
        const r1 = await fetch(`http://localhost:5000/api/youtube/channels.list?url=${q}`);
        if (!r1.ok) throw new Error(`channels.list failed for ${url}`);
        const d1 = await r1.json();
        setSubscriberCount(Number(d1.subscriberCount || 0));
        setViewCount(Number(d1.viewCount || 0));

        // total likes/comments
        const r2 = await fetch(`http://localhost:5000/api/youtube/videos.list?url=${q}`);
        if (!r2.ok) throw new Error(`videos.list failed for ${url}`);
        const d2 = await r2.json();
        setTotalLikes(Number(d2.totalLikes || 0));
        setTotalComments(Number(d2.totalComments || 0));

        // top videos ranking (use correlationNetwork of rawMetrics)
        const r3 = await fetch(
          `http://localhost:5000/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`
        );
        if (r3.ok) {
          const d3 = await r3.json();
          const raw = d3.rawMetrics ?? d3.nodes ?? [];
          const allVideosForRanking = raw.map((v) => {
            const views = Number(v.views) || 0;
            const likes = Number(v.likes) || 0;
            const comments = Number(v.comments) || 0;
            const engagement = views > 0 ? (likes + comments) / views : 0;
            return {
              videoId: v.id || v.videoId || "",
              title: v.title || "Untitled",
              thumbnail: v.thumbnail || "",
              views,
              likes,
              comments,
              engagementScore: engagement,
            };
          });

          // Top videos: Sorted by engagement, the top 4 are selected.
          const top = allVideosForRanking
            .filter((v) => v.videoId)
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 4);
          setTopVideos(top);
        } else {
          setTopVideos([]);
        }

        // Latest comments: 5 comments from the channel
        const r4 = await fetch(
          `http://localhost:5000/api/youtube/videos.latestComments?url=${q}&maxResults=5`
        );
        if (r4.ok) {
          const d4 = await r4.json();
          const arr = Array.isArray(d4.comments) ? d4.comments : [];
          setLatestComments(arr.slice(0, 5));
        } else {
          setLatestComments([]);
        }
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

  const reportSummary = useMemo(() => {
    const engagementRate =
      viewCount && viewCount > 0 ? ((Number(totalLikes || 0) + Number(totalComments || 0)) / Number(viewCount)) * 100 : 0;

    return {
      timeRangeLabel: reportRange === "monthly" ? "Last 30 days" : "Last 7 days",
      subscriberCount: formatNum(subscriberCount),
      viewCount: formatNum(viewCount),
      totalLikes: formatNum(totalLikes),
      totalComments: formatNum(totalComments),
      engagementRate: `${engagementRate.toFixed(2)}%`,
      topVideos: topVideos.slice(0, 4),
      notes: reportNotes.trim(),
      template: "Standard",
      generatedAt: new Date().toLocaleString(),
    };
  }, [reportRange, subscriberCount, viewCount, totalLikes, totalComments, topVideos, reportNotes]);

  useEffect(() => {
    if (!exportMessage) return undefined;
    const t = setTimeout(() => setExportMessage(""), 3200);
    return () => clearTimeout(t);
  }, [exportMessage]);

  const handleToggleSection = (key) => {
    setIncludeSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportPDF = () => {
    if (!selectedUrls.length) {
      setExportMessage("Link a channel before exporting a report.");
      return;
    }

    const html = buildPrintableReport(reportSummary, includeSections);
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
      setExportMessage("Popup blocked. Please allow popups to export.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    setExportMessage("Print dialog opened. Save as PDF to download.");
  };

  const handleExportExcel = () => {
    if (!selectedUrls.length) {
      setExportMessage("Link a channel before exporting a report.");
      return;
    }

    const rows = [];
    rows.push(["Report Template", reportSummary.template]);
    rows.push(["Time Range", reportSummary.timeRangeLabel]);
    rows.push(["Generated At", reportSummary.generatedAt]);
    rows.push([]);
    rows.push(["KPIs"]);
    rows.push(["Subscribers", reportSummary.subscriberCount]);
    rows.push(["Views", reportSummary.viewCount]);
    rows.push(["Likes", reportSummary.totalLikes]);
    rows.push(["Comments", reportSummary.totalComments]);
    rows.push(["Engagement Rate", reportSummary.engagementRate]);
    rows.push([]);

    if (includeSections.topVideos) {
      rows.push(["Top Videos"]);
      rows.push(["Title", "Views", "Likes", "Comments", "Engagement %"]);
      reportSummary.topVideos.forEach((v) => {
        rows.push([
          v.title || "Untitled",
          formatNum(v.views),
          formatNum(v.likes),
          formatNum(v.comments),
          `${(v.engagementScore * 100).toFixed(2)}%`,
        ]);
      });
      rows.push([]);
    }

    if (includeSections.comments) {
      rows.push(["Latest Comments"]);
      rows.push(["Author", "Text", "Published At"]);
      latestComments.forEach((c) => {
        rows.push([c.author || "Unknown", (c.text || c.comment || "").replace(/"/g, '""'), c.publishedAt || ""]);
      });
      rows.push([]);
    }

    if (reportSummary.notes) {
      rows.push(["Notes", reportSummary.notes.replace(/"/g, '""')]);
    }

    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-report-${reportRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMessage("Report downloaded as CSV (openable in Excel).");
  };

  // Calculate engagement rate for display
  const engagementRate = useMemo(() => {
    if (!viewCount || viewCount === 0) return 0;
    return ((Number(totalLikes || 0) + Number(totalComments || 0)) / Number(viewCount)) * 100;
  }, [viewCount, totalLikes, totalComments]);

  // Get engagement rate description
  const getEngagementDescription = (rate) => {
    if (rate >= 10) {
      return {
        label: "Exceptional",
        description: "Your audience is highly engaged! Keep up the great work.",
        color: "text-emerald-600",
        icon: "🌟"
      };
    } else if (rate >= 5) {
      return {
        label: "Excellent",
        description: "Strong engagement! Your content resonates well with viewers.",
        color: "text-green-600",
        icon: "🎯"
      };
    } else if (rate >= 3) {
      return {
        label: "Very Good",
        description: "Good engagement rate. Your audience is interested in your content.",
        color: "text-blue-600",
        icon: "👍"
      };
    } else if (rate >= 1) {
      return {
        label: "Good",
        description: "Decent engagement. Consider experimenting with different content styles.",
        color: "text-indigo-600",
        icon: "📊"
      };
    } else if (rate >= 0.1) {
      return {
        label: "Moderate",
        description: "There's room for improvement. Focus on creating compelling calls-to-action.",
        color: "text-orange-600",
        icon: "💡"
      };
    } else {
      return {
        label: "Needs Improvement",
        description: "Low engagement detected. Try creating more interactive content to boost viewer participation.",
        color: "text-red-600",
        icon: ""
      };
    }
  };

  const engagementInfo = useMemo(() => getEngagementDescription(engagementRate), [engagementRate]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <style>{`
        .video-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .video-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
        }
        
        .video-card:hover .thumbnail-overlay {
          opacity: 1;
        }
        
        .thumbnail-overlay {
          opacity: 0;
          transition: opacity 0.3s ease;
        }
      `}</style>
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user?.first_name || "Business"}</h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              {primaryChannel ? `Currently viewing: ${primaryChannel.name || primaryChannel.url} (Primary channel)` : "No channels linked"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <FileChartLine size={18} />
            Generate report
          </button>
        </div>
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
                label="Brand Content Performance"
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
              <p className="text-sm font-semibold text-slate-900">Selected Channel</p>
              <p className="text-xs text-slate-500 mt-1">
                {options.find((o) => o.key === selectedKey)?.label || "No channel selected"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {options.length === 0 ? (
                <Link
                to="/businessprofile"
                state={{ section: "linkChannel" }}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
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

          {/* Engagement Rate Card */}
          {!loading && viewCount > 0 && (
            <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-medium text-slate-500">Overall Engagement</p>
                    <span className="text-lg">{engagementInfo.icon}</span>
                  </div>
                  <p className={`text-2xl font-semibold ${engagementInfo.color}`}>
                    {engagementInfo.label}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {engagementInfo.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                   Based on channels likes + comments vs total views
                  </p>
                </div>
                <div className={`flex items-center gap-2 ${engagementInfo.color}`}>
                  <TrendingUp size={24} />
                </div>
              </div>
            </section>
          )}

          {/* Right side blocks */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Top Videos by Engagement">
                {topVideos.length === 0 ? (
                  <p className="text-sm text-slate-500">No engagement data available</p>
                ) : (
                  <ul className="space-y-3">
                    {topVideos.map((v, idx) => (
                      <VideoCard key={v.videoId} video={v} rank={idx + 1} />
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
                      <CommentCard key={idx} comment={c} />
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Quick Actions">
                <div className="space-y-2">
                  <Link
                    to="/businessprofile"
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

      {/* Report Generation Modal */}
      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportRange={reportRange}
          setReportRange={setReportRange}
          includeSections={includeSections}
          handleToggleSection={handleToggleSection}
          reportNotes={reportNotes}
          setReportNotes={setReportNotes}
          reportSummary={reportSummary}
          latestComments={latestComments}
          handleExportPDF={handleExportPDF}
          handleExportExcel={handleExportExcel}
          exportMessage={exportMessage}
        />
      )}

      <ReviewBubble />
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

function VideoCard({ video, rank }) {
  const handleClick = () => {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank');
  };

  // Get engagement description for individual videos
  const getVideoEngagementLabel = (score) => {
    const percentage = score * 100;
    if (percentage >= 10) return { label: "Exceptional", color: "text-emerald-700", bg: "bg-emerald-50" };
    if (percentage >= 5) return { label: "Excellent", color: "text-green-700", bg: "bg-green-50" };
    if (percentage >= 3) return { label: "Very Good", color: "text-blue-700", bg: "bg-blue-50" };
    if (percentage >= 1) return { label: "Good", color: "text-indigo-700", bg: "bg-indigo-50" };
    if (percentage >= 0.1) return { label: "Moderate", color: "text-orange-700", bg: "bg-orange-50" };
    return { label: "Low", color: "text-slate-700", bg: "bg-slate-50" };
  };

  const engagementLabel = getVideoEngagementLabel(video.engagementScore);

  return (
    <li 
      onClick={handleClick}
      className="video-card rounded-lg bg-slate-50 overflow-hidden cursor-pointer"
    >
      <div className="flex gap-3 p-3">
        {video.thumbnail && (
          <div className="relative flex-shrink-0">
            <div className="w-28 h-16 rounded-md overflow-hidden bg-slate-200">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="thumbnail-overlay absolute inset-0 bg-black/40 rounded-md flex items-center justify-center">
              <ExternalLink size={18} className="text-white" />
            </div>
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {rank}
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 line-clamp-2">{video.title}</p>
          <p className="text-xs text-slate-500 mt-1">
            {formatNum(video.views)} views · {formatNum(video.likes)} likes · {formatNum(video.comments)} comments
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${engagementLabel.bg} ${engagementLabel.color}`}>
              {engagementLabel.label}
            </span>
            <span className="text-xs text-slate-400">engagement</span>
          </div>
        </div>
      </div>
    </li>
  );
}

function CommentCard({ comment }) {
  return (
    <li className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-slate-900">{comment.text || comment.comment || "—"}</p>
      <p className="text-xs text-slate-500 mt-1">
        {comment.author ? `By ${comment.author}` : ""} {comment.publishedAt ? `· ${comment.publishedAt}` : ""}
      </p>
    </li>
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

function TogglePill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-900 font-semibold">{value}</span>
    </div>
  );
}

function buildPrintableReport(summary, includeSections) {
  const safe = (v) => String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const kpiRows = includeSections.kpis
    ? `
      <h3 style="margin:16px 0 8px;font-size:14px;">KPIs (${safe(summary.timeRangeLabel)})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr><td style="padding:6px;border:1px solid #e5e7eb;">Subscribers</td><td style="padding:6px;border:1px solid #e5e7eb;">${safe(summary.subscriberCount)}</td></tr>
        <tr><td style="padding:6px;border:1px solid #e5e7eb;">Views</td><td style="padding:6px;border:1px solid #e5e7eb;">${safe(summary.viewCount)}</td></tr>
        <tr><td style="padding:6px;border:1px solid #e5e7eb;">Likes</td><td style="padding:6px;border:1px solid #e5e7eb;">${safe(summary.totalLikes)}</td></tr>
        <tr><td style="padding:6px;border:1px solid #e5e7eb;">Comments</td><td style="padding:6px;border:1px solid #e5e7eb;">${safe(summary.totalComments)}</td></tr>
        <tr><td style="padding:6px;border:1px solid #e5e7eb;">Engagement rate</td><td style="padding:6px;border:1px solid #e5e7eb;">${safe(summary.engagementRate)}</td></tr>
      </table>
    `
    : "";

  const topVideos = includeSections.topVideos
    ? `
      <h3 style="margin:16px 0 8px;font-size:14px;">Top videos</h3>
      ${
        (summary.topVideos || []).length === 0
          ? '<p style="color:#6b7280;font-size:12px;">No engagement data available</p>'
          : `<table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr>
                <th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Title</th>
                <th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Views</th>
                <th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Engagement %</th>
              </tr>
              ${summary.topVideos
                .map(
                  (v) =>
                    `<tr>
                      <td style="padding:6px;border:1px solid #e5e7eb;">${safe(v.title)}</td>
                      <td style="padding:6px;border:1px solid #e5e7eb;">${safe(formatNum(v.views))}</td>
                      <td style="padding:6px;border:1px solid #e5e7eb;">${safe((v.engagementScore * 100).toFixed(2))}%</td>
                    </tr>`
                )
                .join("")}
            </table>`
      }
    `
    : "";

  const notes = summary.notes
    ? `<h3 style="margin:16px 0 8px;font-size:14px;">Notes</h3><p style="font-size:12px;line-height:1.5;">${safe(summary.notes)}</p>`
    : "";

  return `
    <html>
      <head>
        <title>Business Report</title>
      </head>
      <body style="font-family:Inter,Arial,sans-serif;padding:32px;color:#0f172a;">
        <h1 style="margin:0 0 4px;font-size:20px;">Business analytics report</h1>
        <p style="margin:0 0 16px;color:#475569;font-size:12px;">Template: ${safe(
          summary.template
        )} · ${safe(summary.timeRangeLabel)} · Generated at ${safe(summary.generatedAt)}</p>
        <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
          ${kpiRows}
          ${topVideos}
          ${notes}
        </div>
      </body>
    </html>
  `;
}

function ReportModal({
  isOpen,
  onClose,
  reportRange,
  setReportRange,
  includeSections,
  handleToggleSection,
  reportNotes,
  setReportNotes,
  reportSummary,
  latestComments,
  handleExportPDF,
  handleExportExcel,
  exportMessage,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-slate-700" />
              <p className="text-sm font-semibold text-slate-900">Report generation & export</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Generate PDF/Excel reports with weekly/monthly filters and reusable templates.
            </p>
            {exportMessage && (
              <p className="mt-1 text-xs text-emerald-600 font-medium">{exportMessage}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <SlidersHorizontal size={14} />
                  Filters
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={reportRange}
                    onChange={(e) => setReportRange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="weekly">Weekly report</option>
                    <option value="monthly">Monthly report</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Include sections</p>
                <div className="flex flex-wrap gap-2">
                  <TogglePill
                    label="KPIs"
                    active={includeSections.kpis}
                    onClick={() => handleToggleSection("kpis")}
                  />
                  <TogglePill
                    label="Top videos"
                    active={includeSections.topVideos}
                    onClick={() => handleToggleSection("topVideos")}
                  />
                  <TogglePill
                    label="Recent comments"
                    active={includeSections.comments}
                    onClick={() => handleToggleSection("comments")}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">Custom notes / template tweaks</p>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Add recommendations, campaign highlights, or template instructions."
                />
              </div>
            </div>

            <div className="lg:col-span-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700 mb-2">Preview</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {includeSections.kpis && (
                  <div className="rounded-lg bg-white border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">KPIs ({reportSummary.timeRangeLabel})</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-900">
                      <PreviewRow label="Subscribers" value={reportSummary.subscriberCount} />
                      <PreviewRow label="Views" value={reportSummary.viewCount} />
                      <PreviewRow label="Likes" value={reportSummary.totalLikes} />
                      <PreviewRow label="Comments" value={reportSummary.totalComments} />
                      <PreviewRow label="Engagement rate" value={reportSummary.engagementRate} />
                    </div>
                  </div>
                )}

                {includeSections.topVideos && (
                  <div className="rounded-lg bg-white border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Top videos</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-900">
                      {reportSummary.topVideos.length === 0 ? (
                        <li className="text-slate-500 text-xs">No engagement data available</li>
                      ) : (
                        reportSummary.topVideos.map((v) => (
                          <li key={v.videoId} className="flex justify-between gap-2">
                            <span className="truncate">{v.title}</span>
                            <span className="text-xs text-slate-500">
                              {(v.engagementScore * 100).toFixed(1)}%
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}

                {includeSections.comments && (
                  <div className="rounded-lg bg-white border border-slate-100 p-3 md:col-span-2">
                    <p className="text-xs text-slate-500">Recent comments</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-900">
                      {latestComments.length === 0 ? (
                        <li className="text-slate-500 text-xs">No recent comments</li>
                      ) : (
                        latestComments.slice(0, 3).map((c, idx) => (
                          <li key={idx} className="flex justify-between gap-2">
                            <span className="truncate">{c.text || c.comment || "—"}</span>
                            <span className="text-xs text-slate-500">{c.author || ""}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg border border-slate-200 hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition"
          >
            <FileText size={16} />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}
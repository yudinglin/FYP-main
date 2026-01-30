import React, { useState, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";
import { Lightbulb, TrendingUp, MessageSquare, BarChart3, Network, AlertCircle } from "lucide-react";

const API_BASE = "http://127.0.0.1:5000";

export default function NetworkGraph() {
  // In "focus" mode, maxVideos = number of similar nodes (excluding the center video)
  const [maxVideos, setMaxVideos] = useState(25);
  const [graphData, setGraphData] = useState({ nodes: [], links: [], rawMetrics: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fgRef = useRef();
  const { user } = useAuth();
  const containerRef = useRef();
  const [barMetric, setBarMetric] = useState("views");
  const [activeView, setActiveView] = useState("summary");
  const [videoInput, setVideoInput] = useState("25");
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // --- Focus mode (pick 1 video as center) ---
  // Video catalog for search/select center node
  const [videoCatalog, setVideoCatalog] = useState([]); // [{id,title,thumbnail,publishedAt}]
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  // user input (title or id) + resolved id
  const [centerInput, setCenterInput] = useState("");
  const [centerVideoId, setCenterVideoId] = useState("");

  const handleFetchGraph = async () => {
    setLoading(true);
    setError("");

    try {
      const channelUrl = user?.youtube_channel;
      if (!channelUrl) {
        setError("No channel URL found. Please add your YouTube channel in settings.");
        setLoading(false);
        return;
      }

      if (!centerVideoId) {
        setError("Please select a center video first.");
        setLoading(false);
        return;
      }

      const q = encodeURIComponent(channelUrl);
      const vid = encodeURIComponent(centerVideoId);
      const res = await fetch(
        `${API_BASE}/api/youtube/videos.similarityNetwork?url=${q}&videoId=${vid}&topK=${maxVideos}&poolMax=2000`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Network request failed");
      }

      const data = await res.json();

      const nodes = (data.nodes || []).map((n) => ({
        ...n,
        name: n.title || n.id,
        engagementRate:
          n.views > 0 ? ((n.likes || 0) + (n.comments || 0)) / n.views : 0,
        // Mark center node (backend provides isCenter)
        isCenter: Boolean(n.isCenter),
      }));

      const links = (data.edges || []).map((e) => ({ ...e }));

      setGraphData({
        nodes,
        links,
        rawMetrics: data.rawMetrics || nodes.map(n => ({
          views: n.views || 0,
          likes: n.likes || 0,
          comments: n.comments || 0,
          thumbnail: n.thumbnail,
          title: n.title || n.id,
          id: n.id,
        }))
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError("");

    try {
      const channelUrl = user?.youtube_channel;
      if (!channelUrl) {
        setCatalogError("No channel URL found. Please add your YouTube channel in settings.");
        return;
      }

      const q = encodeURIComponent(channelUrl);
      const res = await fetch(`${API_BASE}/api/youtube/videos.catalog?url=${q}&maxResults=2000`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch video catalog");
      }
      const data = await res.json();
      const vids = Array.isArray(data.videos) ? data.videos : [];
      setVideoCatalog(vids);

      // If user hasn't selected a center yet, preselect the newest video
      if (!centerVideoId && vids.length > 0) {
        setCenterVideoId(vids[0].id);
        setCenterInput(`${vids[0].title} — ${vids[0].id}`);
      }
    } catch (e) {
      console.error(e);
      setCatalogError(e.message || "Failed to fetch video catalog");
    } finally {
      setCatalogLoading(false);
    }
  };

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fetch catalog when opening the Network view (so the dropdown is ready)
  useEffect(() => {
    if (activeView !== "network") return;
    if (videoCatalog.length > 0 || catalogLoading) return;
    fetchVideoCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Auto-run analysis when entering Insights view
  useEffect(() => {
    if (activeView !== "summary") return;

    // already have insights data
    if (graphData.rawMetrics && graphData.rawMetrics.length > 0) return;

    let cancelled = false;

    const run = async () => {
      try {
        // if no center video yet, fetch catalog (it auto-selects first)
        if (!centerVideoId) {
          await fetchVideoCatalog();
          // give React one tick to apply setCenterVideoId
          await new Promise((r) => setTimeout(r, 0));
        }

        if (cancelled) return;

        await handleFetchGraph();
      } catch (e) {
        // handleFetchGraph already sets error
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, centerVideoId]);


  // Enhanced Force layout tuning for better spacing
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;

    // Stronger repulsion between nodes
    fg.d3Force("charge").strength(-1200);
    
    // Longer links based on weight
    fg.d3Force("link").distance((link) => {
      const baseDistance = 450;
      const weight = link.weight || 0;
      // Higher correlation = shorter distance, but still keep them apart
      return baseDistance - (weight * 80);
    });

    // Collision detection to prevent overlap
    const collideForce = fg.d3Force("collide");
    if (collideForce) {
      collideForce
        .radius((node) => {
          const baseRadius = 8;
          const viewRadius = Math.sqrt(node.views || 0) / 3000;
          return baseRadius + viewRadius;
        })
        .strength(0.7);
    }

    // Add centering force to keep graph centered
    fg.d3Force("center")
      .x(containerSize.width / 2)
      .y(containerSize.height / 2);

    // Warm up the simulation
    if (graphData.nodes.length > 0) {
      // Fix the center node to the middle of the canvas
      const center = graphData.nodes.find((n) => n.isCenter);
      if (center) {
        center.fx = containerSize.width / 2;
        center.fy = containerSize.height / 2;
      }
      fg.d3ReheatSimulation();
    }
  }, [graphData, containerSize]);

  const getNodeColor = (engagement) => {
    if (engagement > 0.05) return "#4f46e5";
    if (engagement > 0.02) return "#10b981";
    return "#f59e0b";
  };

  const getNodeSize = (views) => {
    if (!views) return 3;
    // Slightly larger base size for better visibility
    return 4 + Math.log10(views + 1) * 0.7;
  };

  const nodeTooltip = (node) => {
    return `
      Title: ${node.title || "Untitled Video"}
      Views: ${node.views?.toLocaleString() ?? 0}
      Likes: ${node.likes?.toLocaleString() ?? 0}
      Comments: ${node.comments?.toLocaleString() ?? 0}
      Engagement Rate: ${(node.engagementRate * 100).toFixed(2)}%
    `.trim();
  };

  const handleNodeClick = (node) => {
    if (!node.id) return;
    window.open(`https://www.youtube.com/watch?v=${node.id}`, "_blank");
  };

  const truncate = (str, n = 30) => str?.length > n ? str.substr(0, n) + "..." : str;

  const resolveCenterVideoId = (value) => {
    if (!value) return "";
    // If user typed something like "title — VIDEO_ID", take the last token
    const m = String(value).match(/([A-Za-z0-9_-]{11})\s*$/);
    return m ? m[1] : "";
  };

  const MenuItem = ({ icon: Icon, label, view, badge }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        activeView === view
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={20} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  const MetricCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );

  const SummaryPanel = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-slate-200">
          <div className="text-center">
            <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
            <div className="text-slate-600 mb-2">No data available yet</div>
            <div className="text-sm text-slate-500">Click "Analyze Videos" to get started</div>
          </div>
        </div>
      );
    }

    const sortedByViews = [...data].sort((a, b) => (b.views || 0) - (a.views || 0));
    const sortedByComments = [...data].sort((a, b) => (b.comments || 0) - (a.comments || 0));

    const topVideos = sortedByViews.slice(0, 3);
    const lowVideos = sortedByViews.slice(-3).reverse();

    const avgViews = data.reduce((sum, v) => sum + (v.views || 0), 0) / data.length;
    const avgLikes = data.reduce((sum, v) => sum + (v.likes || 0), 0) / data.length;
    const avgComments = data.reduce((sum, v) => sum + (v.comments || 0), 0) / data.length;
    const avgEngagement = data.reduce((sum, v) => {
      const views = v.views || 0;
      return sum + (views > 0 ? ((v.likes || 0) + (v.comments || 0)) / views : 0);
    }, 0) / data.length;

    const overallPerformance = avgEngagement > 0.05 ? "excellent" : avgEngagement > 0.02 ? "good" : "needs improvement";
    const engagementDrivers = sortedByComments.slice(0, 3);

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Average Views"
            value={Math.round(avgViews).toLocaleString()}
            subtitle="Across analyzed videos"
            icon={TrendingUp}
            color="bg-indigo-600"
          />
          <MetricCard
            title="Engagement Rate"
            value={`${(avgEngagement * 100).toFixed(1)}%`}
            subtitle={`Performance is ${overallPerformance}`}
            icon={MessageSquare}
            color="bg-green-600"
          />
          <MetricCard
            title="Videos Analyzed"
            value={data.length}
            subtitle={`of ${maxVideos} requested`}
            icon={BarChart3}
            color="bg-amber-600"
          />
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Your Best Performers</h3>
              <p className="text-sm text-slate-500">Videos resonating most with viewers</p>
            </div>
          </div>

          <div className="space-y-3">
            {topVideos.map((video, idx) => (
              <div
                key={video.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-transparent border border-green-100 hover:border-green-200 transition-colors cursor-pointer group"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}
              >
                <div className="text-2xl font-bold text-green-600 w-8">#{idx + 1}</div>
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-24 h-18 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {truncate(video.title, 50)}
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-slate-600">
                    <span>{video.views.toLocaleString()} views</span>
                    <span>•</span>
                    <span>{video.likes.toLocaleString()} likes</span>
                    <span>•</span>
                    <span>{video.comments.toLocaleString()} comments</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex gap-3">
              <Lightbulb className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <div className="font-medium text-blue-900 text-sm mb-1">Pro Tip</div>
                <div className="text-sm text-blue-700">
                  These videos have high engagement rates. Consider creating similar content 
                  or making follow-up videos on these topics to maintain momentum.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Needing Improvement */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle className="text-orange-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Videos That Could Use Some Work</h3>
              <p className="text-sm text-slate-500">These videos aren't getting as much attention</p>
            </div>
          </div>

          <div className="space-y-3">
            {lowVideos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-transparent border border-orange-100 hover:border-orange-200 transition-colors cursor-pointer group"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}
              >
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-24 h-18 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {truncate(video.title, 50)}
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-slate-600">
                    <span>{video.views.toLocaleString()} views</span>
                    <span>•</span>
                    <span>{video.likes.toLocaleString()} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex gap-3">
              <Lightbulb className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <div className="font-medium text-amber-900 text-sm mb-1">Suggestion</div>
                <div className="text-sm text-amber-700">
                  Try improving titles, thumbnails, or descriptions for these videos to attract more viewers.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Drivers */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Videos Driving the Most Engagement</h3>
              <p className="text-sm text-slate-500">These videos are sparking the most conversations</p>
            </div>
          </div>

          <div className="space-y-3">
            {engagementDrivers.map((video, idx) => (
              <div
                key={video.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-transparent border border-blue-100 hover:border-blue-200 transition-colors cursor-pointer group"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}
              >
                <div className="text-2xl font-bold text-blue-600 w-8">#{idx + 1}</div>
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-24 h-18 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {truncate(video.title, 50)}
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-slate-600">
                    <span>{video.comments.toLocaleString()} comments</span>
                    <span>•</span>
                    <span>{video.views.toLocaleString()} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="flex gap-3">
              <Lightbulb className="text-indigo-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <div className="font-medium text-indigo-900 text-sm mb-1">Community Building</div>
                <div className="text-sm text-indigo-700">
                  Encourage viewers to leave comments on your videos to build community and boost engagement.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Suggestions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recommended Actions</h3>
          <div className="space-y-3">
            {[
              { action: "Create more content like your top 3 videos", impact: "High" },
              { action: "Improve thumbnails for underperforming videos", impact: "Medium" },
              { action: "Engage with comments on high-engagement videos", impact: "Medium" },
              { action: "Post consistently to keep viewers coming back", impact: "High" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                <span className="text-slate-700">{item.action}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  item.impact === "High" 
                    ? "bg-red-100 text-red-700" 
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {item.impact} Impact
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Video Performance Analysis
          </h1>
          <p className="text-slate-600">
            Understand which videos resonate with your audience and discover patterns in your content
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-700 px-4 py-2 mb-2">
                Views
              </h2>
              <div className="space-y-1">
                <MenuItem icon={Lightbulb} label="Insights" view="summary" badge="Start Here" />
                <MenuItem icon={Network} label="Network Graph" view="network" />
                <MenuItem icon={BarChart3} label="Charts" view="charts" />
              </div>
            </div>

            {/* Analysis Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Analysis Settings
              </h3>
              
              <div className="space-y-4">
                {/* Center Video Selection */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">
                    Center Video
                  </label>

                  <input
                    type="text"
                    list="creator-video-catalog"
                    value={centerInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCenterInput(val);
                      const vid = resolveCenterVideoId(val);
                      if (vid) setCenterVideoId(vid);
                    }}
                    onBlur={() => {
                      const vid = resolveCenterVideoId(centerInput);
                      if (vid) setCenterVideoId(vid);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={catalogLoading ? "Loading videos..." : "Search by title..."}
                    disabled={catalogLoading}
                  />

                  <datalist id="creator-video-catalog">
                    {videoCatalog.map((v) => (
                      <option key={v.id} value={`${v.title} — ${v.id}`} />
                    ))}
                  </datalist>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-500">
                      Pick one video; it will be the center node.
                    </p>
                    <button
                      type="button"
                      onClick={fetchVideoCatalog}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                      disabled={catalogLoading}
                    >
                      {catalogLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  {catalogError && (
                    <p className="text-xs text-red-600 mt-1">{catalogError}</p>
                  )}
                </div>

                {/* Similar Node Count Input */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">
                    Number of Similar Videos to Show
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={videoInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setVideoInput(value);
                      const num = parseInt(value);
                      if (!isNaN(num) && num >= 1 && num <= 500) {
                        setMaxVideos(num);
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(videoInput);
                      if (isNaN(num) || num < 1) {
                        setVideoInput("1");
                        setMaxVideos(1);
                      } else if (num > 500) {
                        setVideoInput("500");
                        setMaxVideos(500);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter 1-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Shows this many similar videos around the center node (1-500)
                  </p>
                </div>

                <button
                  onClick={handleFetchGraph}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Analyzing..." : "Analyze Videos"}
                </button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {graphData.rawMetrics.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-sm p-4 text-white">
                <div className="text-sm font-medium mb-3">Channel Overview</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Avg. Views</span>
                    <span className="font-semibold">
                      {Math.round(graphData.rawMetrics.reduce((s, v) => s + (v.views || 0), 0) / graphData.rawMetrics.length).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Total Videos</span>
                    <span className="font-semibold">{graphData.rawMetrics.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeView === "summary" && <SummaryPanel data={graphData.rawMetrics} />}

            {activeView === "network" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Video Network Graph</h2>
                  <p className="text-sm text-slate-500 mb-4">
                    This graph is centered on the video you selected. Other nodes are the most similar videos
                    based on views, likes, and comments. Node size = views, color = engagement rate. Click a node to open the video.
                    {graphData.nodes.length > 50 && " Drag to pan, scroll to zoom."}
                  </p>

                  <div ref={containerRef} className="h-[600px] relative">{/* Increased height */}
                    {graphData.nodes.length === 0 && !loading ? (
                      <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        <div className="text-center">
                          <Network className="mx-auto text-slate-300 mb-4" size={64} />
                          <div className="text-slate-600 mb-2">No network data yet</div>
                          <div className="text-sm text-slate-500">Click "Analyze Videos" to generate the network</div>
                        </div>
                      </div>
                    ) : graphData.nodes.length > 0 && graphData.links.length === 0 ? (
                      <div className="h-full flex items-center justify-center bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-center max-w-md p-6">
                          <AlertCircle className="mx-auto text-amber-600 mb-4" size={48} />
                          <h3 className="font-semibold text-lg mb-2 text-slate-900">No Strong Connections Found</h3>
                          <p className="text-slate-600 text-sm mb-4">
                            Your videos have unique performance patterns. This means each video appeals to different audiences, 
                            which can be a good sign of content diversity!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Engagement Rate Legend */}
                        <div className="absolute top-4 right-4 bg-white p-3 rounded shadow border text-sm max-w-xs z-10">
                          <div className="font-semibold mb-1">Engagement Rate Legend</div>
                          <p className="text-xs text-slate-500 mb-2">
                            Shows how strongly viewers interact with a video through likes and comments.
                          </p>
                          <div className="w-full h-4 rounded bg-gradient-to-r from-[#f59e0b] via-[#10b981] to-[#4f46e5] mb-2"></div>
                          <div className="flex justify-between text-xs text-slate-700">
                            <span>Low &lt; 2%</span>
                            <span>Med 2-5%</span>
                            <span>High ≥ 5%</span>
                          </div>
                        </div>

                        {/* Graph Controls */}
                        <div className="absolute top-4 left-4 bg-white p-3 rounded shadow border text-sm z-10">
                          <div className="font-semibold mb-2">Controls</div>
                          <div className="space-y-1 text-xs text-slate-600">
                            <div>• Click node → Open video</div>
                            <div>• Drag node → Move it</div>
                            <div>• Scroll → Zoom in/out</div>
                            <div>• Drag background → Pan</div>
                          </div>
                        </div>

                        <ForceGraph2D
                          ref={fgRef}
                          graphData={graphData}
                          width={containerSize.width}
                          height={containerSize.height}
                          nodeLabel={nodeTooltip}
                          onNodeClick={handleNodeClick}
                          nodeCanvasObjectMode={() => "before"}
                          nodeCanvasObject={(node, ctx, globalScale) => {
                            const size = getNodeSize(node.views);
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                            ctx.fillStyle = getNodeColor(node.engagementRate);
                            ctx.fill();
                            // Emphasize the selected center video
                            ctx.strokeStyle = node.isCenter ? "#0f172a" : "#fff";
                            ctx.lineWidth = node.isCenter ? 3 : 1.5;
                            ctx.stroke();

                            // Only show labels when zoomed in enough or for large nodes
                            if (globalScale > 1.2 || size > 10) {
                              const fontSize = Math.max(9, 11 / globalScale);
                              ctx.font = `${fontSize}px Sans-Serif`;
                              ctx.fillStyle = "#1e293b";
                              ctx.textAlign = "center";
                              ctx.textBaseline = "bottom";
                              
                              const maxChars = Math.floor(30 / globalScale) + 10;
                              ctx.fillText(truncate(node.title || node.id, maxChars), node.x, node.y - size - 3);
                            }
                          }}
                          linkColor={() => "rgba(99, 102, 241, 0.25)"}
                          linkWidth={(link) => Math.max(1, (link.weight || 0) * 2)}
                          linkDirectionalParticles={1}
                          linkDirectionalParticleWidth={2}
                          cooldownTicks={100}
                          onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
                          enableNodeDrag={true}
                          enableZoomInteraction={true}
                          enablePanInteraction={true}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeView === "charts" && (
              <div className="space-y-6">
                {graphData.rawMetrics.length === 0 ? (
                  <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-slate-200">
                    <div className="text-center">
                      <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
                      <div className="text-slate-600 mb-2">No chart data available</div>
                      <div className="text-sm text-slate-500">Click "Analyze Videos" to view charts</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Scatter Plot */}
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                      <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Views vs Likes Scatter Plot
                      </h2>
                      <p className="text-sm text-slate-500 mb-4">
                        Each point represents a video. Higher points indicate videos with more likes.
                      </p>

                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[700px] h-[420px]">
                          <ScatterChart
                            width={containerSize.width - 50}
                            height={400}
                            margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
                          >
                            <CartesianGrid />
                            <XAxis type="number" dataKey="views" name="Views" label={{ value: "Views", position: "bottom", offset: 0 }} />
                            <YAxis type="number" dataKey="likes" name="Likes" label={{ value: "Likes", angle: -90, position: "insideLeft" }} />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const vid = payload[0].payload;
                                return (
                                  <div className="bg-white p-2 border rounded shadow text-sm flex gap-2 items-center">
                                    {vid.thumbnail && <img src={vid.thumbnail} alt={vid.title} className="w-16 h-16 object-cover rounded" />}
                                    <div className="flex flex-col">
                                      <div className="font-semibold">{vid.title}</div>
                                      <div>Views: {vid.views?.toLocaleString() ?? 0}</div>
                                      <div>Likes: {vid.likes?.toLocaleString() ?? 0}</div>
                                      <div>Comments: {vid.comments?.toLocaleString() ?? 0}</div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                            <Scatter name="Videos" data={graphData.rawMetrics} fill="rgba(79,70,229,0.7)" />
                          </ScatterChart>
                        </div>
                      </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="rounded-xl bg-white p-6 shadow-md border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-semibold text-slate-900">
                          Top 10 Videos by {barMetric.charAt(0).toUpperCase() + barMetric.slice(1)}
                        </h2>
                        <div className="flex gap-2">
                          {["views", "likes", "comments"].map((metric) => (
                            <button
                              key={metric}
                              onClick={() => setBarMetric(metric)}
                              className={`px-3 py-1 rounded text-sm font-medium border transition-colors duration-200 ${
                                barMetric === metric
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                              }`}
                            >
                              {metric.charAt(0).toUpperCase() + metric.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 mb-4">
                        Shows which videos are performing the best in terms of {barMetric}.
                      </p>

                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[700px] h-[420px]">
                          <ResponsiveContainer width="100%" height={420}>
                            <BarChart
                              layout="vertical"
                              data={graphData.rawMetrics
                                .slice()
                                .sort((a, b) => (b[barMetric] || 0) - (a[barMetric] || 0))
                                .slice(0, 10)
                              }
                              margin={{ top: 20, right: 30, bottom: 20, left: 150 }}
                              barCategoryGap={20}
                            >
                              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                              <XAxis
                                type="number"
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ stroke: "#cbd5e1" }}
                              />
                              <YAxis
                                type="category"
                                dataKey="title"
                                tick={{ fontSize: 12 }}
                                width={150}
                                tickFormatter={(val) => (val.length > 30 ? val.slice(0, 27) + "..." : val)}
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const vid = payload[0].payload;
                                    return (
                                      <div className="bg-white p-2 border rounded shadow text-sm flex gap-2 items-center">
                                        {vid.thumbnail && (
                                          <img
                                            src={vid.thumbnail}
                                            alt={vid.title}
                                            className="w-16 h-16 object-cover rounded"
                                          />
                                        )}
                                        <div className="flex flex-col">
                                          <div className="font-semibold">{vid.title}</div>
                                          <div>Views: {vid.views?.toLocaleString()}</div>
                                          <div>Likes: {vid.likes?.toLocaleString()}</div>
                                          <div>Comments: {vid.comments?.toLocaleString()}</div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar
                                dataKey={barMetric}
                                radius={[6, 6, 6, 6]}
                                barSize={20}
                                isAnimationActive={true}
                                animationDuration={1000}
                                animationEasing="ease-out"
                              >
                                {graphData.rawMetrics
                                  .slice()
                                  .sort((a, b) => (b[barMetric] || 0) - (a[barMetric] || 0))
                                  .slice(0, 10)
                                  .map((entry, index) => {
                                    const gradientId = `grad-${barMetric}-${index}`;
                                    return (
                                      <React.Fragment key={index}>
                                        <defs>
                                          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                                            <stop
                                              offset="0%"
                                              stopColor={
                                                barMetric === "views"
                                                  ? "#6C5DD3"
                                                  : barMetric === "likes"
                                                  ? "#00C49F"
                                                  : "#FF8042"
                                              }
                                              stopOpacity={0.8}
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor={
                                                barMetric === "views"
                                                  ? "#4f46e5"
                                                  : barMetric === "likes"
                                                  ? "#10b981"
                                                  : "#f97316"
                                              }
                                              stopOpacity={1}
                                            />
                                          </linearGradient>
                                        </defs>
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={`url(#${gradientId})`}
                                          style={{ cursor: "pointer", transition: "transform 0.2s" }}
                                          onMouseEnter={(e) => (e.target.style.transform = "scaleX(1.05)")}
                                          onMouseLeave={(e) => (e.target.style.transform = "scaleX(1)")}
                                          onClick={() =>
                                            entry.id &&
                                            window.open(`https://www.youtube.com/watch?v=${entry.id}`, "_blank")
                                          }
                                        />
                                      </React.Fragment>
                                    );
                                  })}
                                <LabelList
                                  dataKey={barMetric}
                                  position="right"
                                  formatter={(value) => value.toLocaleString()}
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

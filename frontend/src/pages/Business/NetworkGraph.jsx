// frontend/src/pages/Business/NetworkGraph.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";
import { BarChart3, Network, AlertCircle, Lightbulb, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";

const API_BASE = "http://127.0.0.1:5000";

export default function NetworkGraphBusiness() {
  const { user } = useAuth();

  // --------- channel list from business profile ---------
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

  const options = useMemo(() => {
    const all = { key: "__ALL__", label: "All channels (sum)", url: "" };
    const singles = channels.map((c, idx) => ({
      key: c.url || String(idx),
      label: c.name
        ? `${c.name}${c.is_primary ? " (Primary)" : ""}`
        : `${c.url}${c.is_primary ? " (Primary)" : ""}`,
      url: c.url,
    }));
    return [all, ...singles];
  }, [channels]);

  const [selectedKey, setSelectedKey] = useState("__ALL__");

  const selectedUrls = useMemo(() => {
    if (selectedKey === "__ALL__") return channels.map((c) => c.url);
    const one = options.find((o) => o.key === selectedKey);
    return one?.url ? [one.url] : [];
  }, [selectedKey, channels, options]);

  // --------- states (same style as creator) ---------
  const [maxVideos, setMaxVideos] = useState(25);
  const [videoInput, setVideoInput] = useState("25");

  const [graphData, setGraphData] = useState({ nodes: [], links: [], rawMetrics: [] });

  // per-channel graph for Summary (ALL mode)
  const [perChannelGraphs, setPerChannelGraphs] = useState([]);
  // item: { label, url, nodes, links, rawMetrics }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [barMetric, setBarMetric] = useState("views");
  const [activeView, setActiveView] = useState("summary");

  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState("");

  const fgRef = useRef();
  const containerRef = useRef();
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // --------- resize graph container ---------
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // --------- fetch performance comparison data ---------
  const handleFetchPerformanceComparison = async (urls, maxVideosCount) => {
    setPerformanceLoading(true);
    setPerformanceError("");

    try {
      const urlsToUse = urls || selectedUrls;
      if (!urlsToUse.length) {
        setPerformanceError("No channels selected");
        return;
      }

      const urlsParam = urlsToUse.join(",");
      const parsed = Math.max(5, Math.min(80, Number(maxVideosCount) || maxVideos || 25));

      const res = await fetch(
        `${API_BASE}/api/youtube/videos.performanceComparison?urls=${encodeURIComponent(urlsParam)}&maxVideos=${parsed}`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch performance comparison");
      }

      const data = await res.json();
      setPerformanceData(data);
    } catch (err) {
      console.error(err);
      setPerformanceError(err?.message || "Failed to fetch performance comparison");
    } finally {
      setPerformanceLoading(false);
    }
  };

  // --------- fetch graph (supports 1~3 channels) ---------
  const handleFetchGraph = async () => {
    setLoading(true);
    setError("");

    try {
      const parsed = Math.max(5, Math.min(80, Number(videoInput) || 25));
      setMaxVideos(parsed);

      if (!selectedUrls.length) {
        setError("No channel selected. Please add channels in Business Profile → Link Channel.");
        setGraphData({ nodes: [], links: [], rawMetrics: [] });
        setPerChannelGraphs([]);
        return;
      }

      const threshold = 0.7;

      const results = await Promise.all(
        selectedUrls.map(async (url, idx) => {
          const q = encodeURIComponent(url);
          const res = await fetch(
            `${API_BASE}/api/youtube/videos.correlationNetwork?url=${q}&threshold=${threshold.toFixed(
              2
            )}&maxVideos=${parsed}`
          );

          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Network request failed for channel ${idx + 1}`);
          }

          const data = await res.json();

          // Add channel prefix to avoid videoId clash across channels
          const nodes = (data.nodes || []).map((n) => ({
            ...n,
            id: `${idx}:${n.id}`,
            _rawId: n.id,
            _channelUrl: url,
            name: n.title || n.id,
            engagementRate: n.views > 0 ? ((n.likes || 0) + (n.comments || 0)) / n.views : 0,
          }));

          const links = (data.edges || []).map((e) => ({
            ...e,
            source: `${idx}:${e.source}`,
            target: `${idx}:${e.target}`,
            _channelUrl: url,
          }));

          const rawMetrics = (
            data.rawMetrics ||
            nodes.map((n) => ({
              id: `${idx}:${n._rawId || n.id}`,
              _rawId: n._rawId || n.id,
              _channelUrl: url,
              title: n.title || n.name || n.id,
              thumbnail: n.thumbnail,
              views: n.views || 0,
              likes: n.likes || 0,
              comments: n.comments || 0,
            }))
          ).map((m) => ({
            ...m,
            id: `${idx}:${m.id}`,
            _rawId: m._rawId ?? m.id,
            _channelUrl: url,
          }));

          return { nodes, links, rawMetrics, url };
        })
      );

      // Build per-channel graphs for Summary (ALL mode)
      const urlToLabel = new Map();
      channels.forEach((c, i) => {
        if (c?.url) urlToLabel.set(c.url, c?.name || `Channel ${i + 1}`);
      });

      const per = results.map((r, i) => ({
        label: urlToLabel.get(r.url) || `Channel ${i + 1}`,
        url: r.url,
        nodes: r.nodes,
        links: r.links,
        rawMetrics: r.rawMetrics,
      }));

      setPerChannelGraphs(selectedKey === "__ALL__" ? per : per.slice(0, 1));

      // Merge all channels into one dataset for Graph/Charts tabs
      const merged = results.reduce(
        (acc, cur) => {
          acc.nodes.push(...cur.nodes);
          acc.links.push(...cur.links);
          acc.rawMetrics.push(...cur.rawMetrics);
          return acc;
        },
        { nodes: [], links: [], rawMetrics: [] }
      );

      setGraphData(merged);

      // fit view
      setTimeout(() => {
        fgRef.current?.zoomToFit?.(400, 50);
      }, 200);

      // Auto-fetch performance comparison data
      handleFetchPerformanceComparison(selectedUrls, parsed).catch((err) => {
        console.error("Error fetching performance comparison:", err);
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch network graph");
    } finally {
      setLoading(false);
    }
  };

  // --------- force layout tuning (Graph tab only) ---------
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;

    fg.d3Force("charge").strength(-550);

    fg.d3Force("link").distance((link) => {
      const baseDistance = 250;
      const weight = link.weight || 0;
      return baseDistance - weight * 80;
    });

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

    fg.d3Force("center").x(containerSize.width / 2).y(containerSize.height / 2);

    if (graphData.nodes.length > 0) fg.d3ReheatSimulation();
  }, [graphData, containerSize]);

  // --------- helpers ---------
  const truncate = (str, len = 45) => {
    if (!str) return "";
    return str.length <= len ? str : str.slice(0, len - 1) + "…";
  };

  const formatNum = (n) => (Number(n) || 0).toLocaleString();

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

  const getNodeColor = (engagement) => {
    if (engagement > 0.05) return "#4f46e5";
    if (engagement > 0.02) return "#10b981";
    return "#f59e0b";
  };

  const getNodeSize = (views) => {
    if (!views) return 4;
    return 4 + Math.log10(views + 1) * 1.4;
  };

  const nodeTooltip = (node) => {
    const title = node.title || node.name || node.id;
    return `
      <div style="max-width:280px">
        <div style="font-weight:700;margin-bottom:6px">${escapeHtml(title)}</div>
        <div style="font-size:12px;color:#64748b">
          Views: ${formatNum(node.views)} · Likes: ${formatNum(node.likes)} · Comments: ${formatNum(node.comments)}
        </div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">
          Engagement: ${(Number(node.engagementRate || 0) * 100).toFixed(2)}%
        </div>
      </div>
    `;
  };

  const handleNodeClick = (node) => {
    const rawId = node?._rawId || node?.id;
    if (!rawId) return;
    const vid = String(rawId).includes(":") ? String(rawId).split(":")[1] : rawId;
    window.open(`https://www.youtube.com/watch?v=${vid}`, "_blank");
  };

  // --------- charts data ---------
  const scatterData = useMemo(() => {
    return (graphData.rawMetrics || []).map((v) => ({
      id: v.id,
      title: v.title || v.name || v._rawId || v.id,
      views: Number(v.views) || 0,
      likes: Number(v.likes) || 0,
      comments: Number(v.comments) || 0,
      engagementRate:
        (Number(v.views) || 0) > 0 ? (Number(v.likes) + Number(v.comments)) / Number(v.views) : 0,
    }));
  }, [graphData]);

  const barData = useMemo(() => {
    const sorted = [...scatterData].sort((a, b) => (b[barMetric] || 0) - (a[barMetric] || 0));
    return sorted.slice(0, 10);
  }, [scatterData, barMetric]);

  // --------- render ---------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Industry Network Graph
          </h1>
          <p className="text-slate-600">
            Visualize how videos relate based on correlation of metrics. Business user supports up to 3 linked channels.
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
                <MenuItem icon={BarChart3} label="Summary" view="summary" badge="Default" />
                <MenuItem icon={Network} label="Network Graph" view="graph" badge="Start Here" />
                <MenuItem icon={BarChart3} label="Charts" view="charts" />
                <MenuItem icon={Lightbulb} label="Performance Insights" view="insights" />
              </div>
            </div>

            {/* Analysis Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Analysis Settings
              </h3>
              
              <div className="space-y-4">
                {/* Channel Selector */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">
                    Channel
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                  >
                    {options.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Video Count Input */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">
                    Number of Videos to Analyze
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
                    Analyze between 1-500 of your most recent videos
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
        {error ? (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-rose-500 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-slate-900">Error</p>
                <p className="text-sm text-rose-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Summary */}
        {activeView === "summary" && (
          <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
            {graphData.nodes.length === 0 ? (
              <div className="flex items-center justify-center h-72">
                <div className="text-center text-slate-600">
                  <Network className="mx-auto text-slate-300 mb-4" size={64} />
                  <div className="font-medium">No data yet</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Click “Analyze Videos” to generate the network.
                  </div>
                </div>
              </div>
            ) : selectedKey === "__ALL__" ? (
              // ALL: 1~3 cards, each card has its own small graph
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {perChannelGraphs.map((ch, idx) => (
                  <ChannelGraphCard
                    key={ch.url || idx}
                    title={ch.label}
                    nodes={ch.nodes}
                    links={ch.links}
                  />
                ))}
              </div>
            ) : (
              // Single channel: simple summary cards
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniCard label="Nodes (videos)" value={graphData.nodes.length} />
                <MiniCard label="Edges (connections)" value={graphData.links.length} />
                <MiniCard label="Max videos" value={maxVideos} />
              </div>
            )}
          </section>
        )}

            {activeView === "graph" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Video Network Graph</h2>
                  <p className="text-sm text-slate-500 mb-4">
                    Explore which videos behave similarly based on views, likes, and comments.
                    Node size = views, color = engagement rate. Click a node to open the video.
                    {graphData.nodes.length > 50 && " Drag to pan, scroll to zoom."}
                  </p>

                  <div ref={containerRef} className="h-[600px] relative">
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
                          graphData={{ nodes: graphData.nodes, links: graphData.links }}
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
                            ctx.strokeStyle = "#fff";
                            ctx.lineWidth = 1.5;
                            ctx.stroke();

                            if (globalScale > 1.2 || size > 10) {
                              const fontSize = Math.max(9, 11 / globalScale);
                              ctx.font = `${fontSize}px Sans-Serif`;
                              ctx.fillStyle = "#1e293b";
                              ctx.textAlign = "center";
                              ctx.textBaseline = "bottom";
                              const maxChars = Math.floor(30 / globalScale) + 10;
                              ctx.fillText(
                                truncate(node.title || node.name || node.id, maxChars),
                                node.x,
                                node.y - size - 3
                              );
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

            {/* Charts */}
            {activeView === "charts" && (
              <div className="space-y-6">
                {graphData.rawMetrics.length === 0 ? (
                  <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-center">
                      <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
                      <div className="text-slate-600 mb-2">No chart data available</div>
                      <div className="text-sm text-slate-500">Click "Analyze Videos" to view charts</div>
                    </div>
                  </div>
                ) : selectedKey === "__ALL__" && perChannelGraphs.length > 0 ? (
                  <>
                    {/* Scatter Charts - One per channel */}
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 mb-4">Engagement Rate vs Views by Channel</h2>
                      <div className={`grid grid-cols-1 ${perChannelGraphs.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-6`}>
                        {perChannelGraphs.map((ch, idx) => {
                          const channelInfo = channels.find(c => c.url === ch.url);
                          const isPrimary = channelInfo?.is_primary || idx === 0;
                          const channelName = channelInfo?.name || ch.label || `Channel ${idx + 1}`;
                          
                          const channelScatterData = (ch.rawMetrics || []).map((v) => ({
                            id: v.id,
                            title: v.title || v.name || v._rawId || v.id,
                            views: Number(v.views) || 0,
                            likes: Number(v.likes) || 0,
                            comments: Number(v.comments) || 0,
                            engagementRate:
                              (Number(v.views) || 0) > 0 ? (Number(v.likes) + Number(v.comments)) / Number(v.views) : 0,
                          }));

                          return (
                            <div
                              key={idx}
                              className={`rounded-xl bg-white border shadow-sm p-6 ${
                                isPrimary
                                  ? "border-indigo-300 bg-indigo-50/30"
                                  : "border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-slate-900">{channelName}</h3>
                                  {isPrimary && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white font-semibold">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">Dots = videos</p>
                              </div>

                              <div className="h-[360px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="views" name="Views" tick={{ fontSize: 12 }} />
                                    <YAxis
                                      dataKey="engagementRate"
                                      name="Engagement rate"
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
                                    />
                                    <Tooltip
                                      formatter={(value, name) => {
                                        if (name === "engagementRate")
                                          return `${(Number(value) * 100).toFixed(2)}%`;
                                        return formatNum(value);
                                      }}
                                      labelFormatter={(_, payload) => payload?.[0]?.payload?.title || ""}
                                    />
                                    <Scatter data={channelScatterData} fill={isPrimary ? "#4f46e5" : "#10b981"} />
                                  </ScatterChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bar Charts - One per channel */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-900">Top 10 Videos by Channel</h2>
                        <select
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          value={barMetric}
                          onChange={(e) => setBarMetric(e.target.value)}
                        >
                          <option value="views">Views</option>
                          <option value="likes">Likes</option>
                          <option value="comments">Comments</option>
                        </select>
                      </div>
                      <div className={`grid grid-cols-1 ${perChannelGraphs.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-6`}>
                        {perChannelGraphs.map((ch, idx) => {
                          const channelInfo = channels.find(c => c.url === ch.url);
                          const isPrimary = channelInfo?.is_primary || idx === 0;
                          const channelName = channelInfo?.name || ch.label || `Channel ${idx + 1}`;
                          
                          const channelScatterData = (ch.rawMetrics || []).map((v) => ({
                            id: v.id,
                            title: v.title || v.name || v._rawId || v.id,
                            views: Number(v.views) || 0,
                            likes: Number(v.likes) || 0,
                            comments: Number(v.comments) || 0,
                            engagementRate:
                              (Number(v.views) || 0) > 0 ? (Number(v.likes) + Number(v.comments)) / Number(v.views) : 0,
                          }));

                          const channelBarData = [...channelScatterData]
                            .sort((a, b) => (b[barMetric] || 0) - (a[barMetric] || 0))
                            .slice(0, 10);

                          return (
                            <div
                              key={idx}
                              className={`rounded-xl bg-white border shadow-sm p-6 ${
                                isPrimary
                                  ? "border-indigo-300 bg-indigo-50/30"
                                  : "border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-slate-900">{channelName}</h3>
                                {isPrimary && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white font-semibold">
                                    Primary
                                  </span>
                                )}
                              </div>

                              <div className="h-[420px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={channelBarData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                      dataKey="title"
                                      tick={{ fontSize: 11 }}
                                      interval={0}
                                      angle={-15}
                                      textAnchor="end"
                                      height={80}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value) => formatNum(value)} labelFormatter={(label) => label} />
                                    <Bar dataKey={barMetric} fill={isPrimary ? "#4f46e5" : "#10b981"} radius={[8, 8, 0, 0]}>
                                      <LabelList dataKey={barMetric} position="top" formatter={(v) => formatNum(v)} />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Single Channel Charts (when not ALL mode) */}
                    {/* Scatter */}
                    <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900">Engagement rate vs Views</h2>
                        <p className="text-xs text-slate-500">Dots = videos</p>
                      </div>

                      <div className="h-[360px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="views" name="Views" tick={{ fontSize: 12 }} />
                            <YAxis
                              dataKey="engagementRate"
                              name="Engagement rate"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === "engagementRate")
                                  return `${(Number(value) * 100).toFixed(2)}%`;
                                return formatNum(value);
                              }}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.title || ""}
                            />
                            <Scatter data={scatterData} fill="#4f46e5" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    {/* Bar */}
                    <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-slate-900">Top 10 videos</h2>
                        <select
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          value={barMetric}
                          onChange={(e) => setBarMetric(e.target.value)}
                        >
                          <option value="views">Views</option>
                          <option value="likes">Likes</option>
                          <option value="comments">Comments</option>
                        </select>
                      </div>

                      <div className="h-[420px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="title"
                              tick={{ fontSize: 11 }}
                              interval={0}
                              angle={-15}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => formatNum(value)} labelFormatter={(label) => label} />
                            <Bar dataKey={barMetric} fill="#10b981" radius={[8, 8, 0, 0]}>
                              <LabelList dataKey={barMetric} position="top" formatter={(v) => formatNum(v)} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}

            {/* Performance Insights */}
            {activeView === "insights" && (
              <div className="space-y-6">
            {performanceLoading ? (
              <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-center">
                  <div className="text-slate-600 mb-2">Analyzing performance...</div>
                  <div className="text-sm text-slate-500">Comparing your channels against industry benchmarks</div>
                </div>
              </div>
            ) : performanceError ? (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-rose-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Error</p>
                    <p className="text-sm text-rose-600 mt-1">{performanceError}</p>
                  </div>
                </div>
              </div>
            ) : !performanceData ? (
              <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-center text-slate-600">
                  <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
                  <div className="font-medium">No performance data yet</div>
                  <div className="text-sm text-slate-500 mt-1">
                    Click "Analyze Videos" to generate performance insights
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Primary Channel Metrics Cards */}
                {(() => {
                  const primaryChannel = channels.find(c => c.is_primary) || channels[0];
                  const primaryChannelMetrics = performanceData.channel_metrics?.find(
                    cm => cm.channel_url === primaryChannel?.url
                  ) || performanceData.channel_metrics?.[0];
                  const primaryChannelName = primaryChannel?.name || "your primary channel";

                  if (!primaryChannelMetrics) return null;

                  return (
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">Performance: {primaryChannelName}</h2>
                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white font-semibold">
                          Primary Channel
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <MetricCard
                          label="Average Views per Video"
                          value={formatNum(primaryChannelMetrics.avg_views || 0)}
                          percentile={primaryChannelMetrics.percentiles?.avg_views || 0}
                          industryAvg={formatNum(performanceData.comparison?.avg_views?.industry_avg || 0)}
                        />
                        <MetricCard
                          label="Engagement Rate"
                          value={`${((primaryChannelMetrics.engagement_rate || 0) * 100).toFixed(2)}%`}
                          percentile={primaryChannelMetrics.percentiles?.engagement_rate || 0}
                          industryAvg={`${((performanceData.comparison?.engagement_rate?.industry_avg || 0) * 100).toFixed(2)}%`}
                        />
                        <MetricCard
                          label="Likes per 1K Views"
                          value={primaryChannelMetrics.likes_per_1k_views?.toFixed(1) || "0"}
                          percentile={primaryChannelMetrics.percentiles?.likes_per_1k || 0}
                          industryAvg={performanceData.comparison?.likes_per_1k?.industry_avg?.toFixed(1) || "0"}
                        />
                      </div>
                    </section>
                  );
                })()}

                {/* Performance Insights */}
                {performanceData.insights && performanceData.insights.length > 0 && (
                  <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="text-amber-500" size={20} />
                      <h2 className="text-lg font-semibold text-slate-900">Performance Insights</h2>
                    </div>
                    
                    {/* Channel Performance Summary */}
                    {performanceData.channel_metrics && performanceData.channel_metrics.length > 0 && (
                      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Channel Performance Overview</h3>
                        <div className="space-y-2">
                          {performanceData.channel_metrics.map((channel, idx) => {
                            const channelInfo = channels.find(c => c.url === channel.channel_url);
                            const isPrimary = channelInfo?.is_primary || idx === 0;
                            const channelName = channelInfo?.name || `Channel ${idx + 1}`;
                            
                            return (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900">
                                    {channelName}
                                    {isPrimary && (
                                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                                        Primary
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-600">
                                  <span>{formatNum(channel.avg_views)} avg views</span>
                                  <span>{(channel.engagement_rate * 100).toFixed(2)}% engagement</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const primaryChannel = channels.find(c => c.is_primary) || channels[0];
                      const primaryChannelMetrics = performanceData.channel_metrics?.find(
                        cm => cm.channel_url === primaryChannel?.url
                      ) || performanceData.channel_metrics?.[0];
                      const primaryChannelName = primaryChannel?.name || "your primary channel";

                      if (!primaryChannelMetrics) return null;

                      // Generate insights for primary channel
                      const INDUSTRY_BENCHMARKS = {
                        engagement_rate: { excellent: 0.05, good: 0.02, average: 0.01, below_average: 0.005 },
                        views_per_video: { excellent: 50000, good: 10000, average: 3000, below_average: 500 },
                        comments_per_1000_views: { excellent: 10, good: 5, average: 2, below_average: 1 },
                      };

                      const primaryInsights = [];
                      const engagementRate = primaryChannelMetrics.engagement_rate || 0;
                      const avgViews = primaryChannelMetrics.avg_views || 0;
                      const commentsPer1k = primaryChannelMetrics.comments_per_1k_views || 0;

                      if (engagementRate >= INDUSTRY_BENCHMARKS.engagement_rate.excellent) {
                        primaryInsights.push({
                          type: "positive",
                          title: "Excellent Engagement Rate",
                          description: `Your primary channel "${primaryChannelName}" has an engagement rate of ${(engagementRate * 100).toFixed(2)}%, placing it in the top 10% of channels.`,
                          recommendation: "Continue creating content that resonates with your audience. Consider doubling down on your best-performing video topics.",
                        });
                      } else if (engagementRate < INDUSTRY_BENCHMARKS.engagement_rate.average) {
                        primaryInsights.push({
                          type: "warning",
                          title: "Low Engagement Rate",
                          description: `Your primary channel "${primaryChannelName}" has an engagement rate of ${(engagementRate * 100).toFixed(2)}%, which is below the industry average.`,
                          recommendation: "Focus on creating more engaging content. Ask questions in your videos, create compelling thumbnails, and encourage viewers to like and comment.",
                        });
                      }

                      if (avgViews >= INDUSTRY_BENCHMARKS.views_per_video.excellent) {
                        primaryInsights.push({
                          type: "positive",
                          title: "Strong View Performance",
                          description: `Your primary channel "${primaryChannelName}" averages ${formatNum(avgViews)} views per video, which is exceptional.`,
                          recommendation: "Your content is reaching a wide audience. Consider optimizing upload frequency to maintain momentum.",
                        });
                      } else if (avgViews < INDUSTRY_BENCHMARKS.views_per_video.average) {
                        primaryInsights.push({
                          type: "warning",
                          title: "Views Below Average",
                          description: `Your primary channel "${primaryChannelName}" averages ${formatNum(avgViews)} views per video, which is below industry standards.`,
                          recommendation: "Improve video titles, thumbnails, and SEO. Consider collaborating with other creators or promoting your videos on other platforms.",
                        });
                      }

                      if (commentsPer1k >= INDUSTRY_BENCHMARKS.comments_per_1000_views.good) {
                        primaryInsights.push({
                          type: "positive",
                          title: "Strong Community Engagement",
                          description: `Your primary channel "${primaryChannelName}" is getting ${commentsPer1k.toFixed(1)} comments per 1,000 views, indicating active viewer participation.`,
                          recommendation: "Keep engaging with comments to build a stronger community. Consider creating content that encourages discussion.",
                        });
                      }

                      return (
                        <div className="space-y-4">
                          {primaryInsights.map((insight, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border ${
                                insight.type === "positive"
                                  ? "bg-green-50 border-green-200"
                                  : "bg-orange-50 border-orange-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {insight.type === "positive" ? (
                                  <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                                ) : (
                                  <AlertCircle className="text-orange-600 mt-0.5 flex-shrink-0" size={20} />
                                )}
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-900 mb-1">{insight.title}</h3>
                                  <p className="text-sm text-slate-700 mb-2">{insight.description}</p>
                                  <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200">
                                    <p className="text-xs font-medium text-slate-600 mb-1">Recommendation:</p>
                                    <p className="text-sm text-slate-700">{insight.recommendation}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </section>
                )}

                {/* Channel Comparison Table (if multiple channels) */}
                {performanceData.channel_metrics && performanceData.channel_metrics.length > 1 && (
                  <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Channel Breakdown</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Channel</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Videos</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Avg Views</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Engagement</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-700">Likes/1K</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceData.channel_metrics.map((channel, idx) => {
                            const channelInfo = channels.find(c => c.url === channel.channel_url);
                            const isPrimary = channelInfo?.is_primary || idx === 0;
                            const channelName = channelInfo?.name || `Channel ${idx + 1}`;
                            
                            return (
                              <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${isPrimary ? "bg-indigo-50/30" : ""}`}>
                                <td className="py-3 px-4 text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{channelName}</span>
                                    {isPrimary && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-700">{channel.num_videos}</td>
                                <td className="py-3 px-4 text-right text-slate-700">{formatNum(channel.avg_views)}</td>
                                <td className="py-3 px-4 text-right text-slate-700">
                                  {(channel.engagement_rate * 100).toFixed(2)}%
                                </td>
                                <td className="py-3 px-4 text-right text-slate-700">{channel.likes_per_1k_views.toFixed(1)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
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

function ChannelGraphCard({
    title,
    nodes = [],
    links = [],
    isPrimary = false,
    benchmarkStats = null,
  }) {

  // Measure the real container size to avoid 0-width canvas issues
  const graphBoxRef = useRef(null);
  const [boxSize, setBoxSize] = useState({ w: 360, h: 260 });

  useEffect(() => {
    if (!graphBoxRef.current) return;

    const el = graphBoxRef.current;

    const update = () => {
      const w = Math.max(260, el.clientWidth || 0);
      const h = 260;
      setBoxSize({ w, h });
    };

    update();

    // Use ResizeObserver so the graph always has a correct width inside grid/flex layouts
    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Pick the most popular video as the center (max views)
  const centerNode = useMemo(() => {
    if (!nodes.length) return null;
    return [...nodes].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  }, [nodes]);

  // Build a star graph: center node + top-N similar nodes around it
  const { starNodes, starLinks } = useMemo(() => {
    if (!centerNode) return { starNodes: [], starLinks: [] };

    const centerId = centerNode.id;

    // nodeId -> node
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Find all edges connected to the center node (treat as undirected)
    const neighborEdges = (links || [])
      .map((e) => {
        const s = typeof e.source === "object" ? e.source.id : e.source;
        const t = typeof e.target === "object" ? e.target.id : e.target;
        return { _s: s, _t: t, weight: Number(e.weight ?? e.value ?? 0) };
      })
      .filter((e) => e._s === centerId || e._t === centerId)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));

    // Pick top N unique neighbors by weight
    const N = Math.min(12, nodes.length - 1);
    const neighborIds = [];
    for (const e of neighborEdges) {
      const otherId = e._s === centerId ? e._t : e._s;
      if (otherId && otherId !== centerId && !neighborIds.includes(otherId)) {
        neighborIds.push(otherId);
      }
      if (neighborIds.length >= N) break;
    }

    // Fallback: if no edges exist, select other popular videos by views
    if (neighborIds.length === 0) {
      const fallback = [...nodes]
        .filter((n) => n.id !== centerId)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, N)
        .map((n) => n.id);
      neighborIds.push(...fallback);
    }

    const aroundNodes = neighborIds.map((id) => nodeMap.get(id)).filter(Boolean);

    const starNodes = [centerNode, ...aroundNodes];

    const starLinks = aroundNodes.map((n) => ({
      source: centerId,
      target: n.id,
      weight: 1,
    }));

    return { starNodes, starLinks };
  }, [nodes, links, centerNode]);

  const mostPopularTitle = centerNode?.title || centerNode?.name || "";
  const mostPopularViews = centerNode?.views || 0;

  // Create a stable map so we can place nodes in a neat circle ourselves (no physics needed)
  const layoutMap = useMemo(() => {
    const map = new Map();
    if (!centerNode) return map;

    const cx = boxSize.w / 2;
    const cy = boxSize.h / 2;
    const radius = Math.min(95, Math.max(60, boxSize.w / 2 - 35));

    map.set(centerNode.id, { x: cx, y: cy });

    const around = starNodes.filter((n) => n.id !== centerNode.id);
    around.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, around.length);
      map.set(n.id, {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    });

    return map;
  }, [starNodes, centerNode, boxSize]);

  return (
    <div
        className={`rounded-2xl p-4 ${
          isPrimary
            ? "border-2 border-indigo-500 bg-indigo-50/40"
            : "border border-slate-100 bg-white"
        }`}
      >
  
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 line-clamp-1">{title}</p>

          {centerNode ? (
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">
              <span className="font-semibold text-slate-700">Most popular:</span>{" "}
              {mostPopularTitle}{" "}
              <span className="text-slate-500">
                ({Number(mostPopularViews).toLocaleString()} views)
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No videos</p>
          )}
        </div>

        <span className="text-xs text-slate-500 whitespace-nowrap">
          {nodes.length} nodes · {links.length} edges
        </span>
      </div>

      <div
        ref={graphBoxRef}
        className="mt-3 h-[260px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
      >
        <ForceGraph2D
          graphData={{ nodes: starNodes, links: starLinks }}
          width={boxSize.w}
          height={boxSize.h}
          enableNodeDrag={false}
          cooldownTicks={1}
          d3VelocityDecay={1}
          nodeLabel={(n) => n.title || n.name || n.id}
          onNodeClick={(n) => {
            const rawId = n?._rawId || n?.id;
            if (!rawId) return;
            const vid = String(rawId).includes(":") ? String(rawId).split(":")[1] : rawId;
            window.open(`https://www.youtube.com/watch?v=${vid}`, "_blank");
          }}
          // Replace default node drawing with our own drawing
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node, ctx) => {
            const p = layoutMap.get(node.id);
            if (!p) return;

            const isCenter = centerNode && node.id === centerNode.id;
            const base = isCenter ? 10 : 6;
            const size = base + Math.log10((node.views || 0) + 1);

            // Draw node circle
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = isCenter
              ? "rgba(16, 185, 129, 0.95)"
              : "rgba(79, 70, 229, 0.85)";
            ctx.fill();

            if (isCenter) {
              ctx.strokeStyle = "rgba(15, 118, 110, 0.8)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // Draw node label (video title)
            // We hide center label because it is already shown in "Most popular"
            if (!isCenter) {
              const rawTitle = node.title || node.name || "";
              const label = truncateText(rawTitle, 18);

              ctx.font = "11px sans-serif";
              ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
              ctx.textAlign = "center";
              ctx.textBaseline = "top";

              // Place text under the node
              ctx.fillText(label, p.x, p.y + size + 6);
            }
          }}
          // Make default links transparent (we draw links ourselves)
          linkColor={() => "rgba(0,0,0,0)"}
          linkCanvasObjectMode={() => "replace"}
          linkCanvasObject={(link, ctx) => {
            const sId = typeof link.source === "object" ? link.source.id : link.source;
            const tId = typeof link.target === "object" ? link.target.id : link.target;
            const s = layoutMap.get(sId);
            const t = layoutMap.get(tId);
            if (!s || !t) return;

            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(t.x, t.y);
            ctx.strokeStyle = "rgba(99, 102, 241, 0.20)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">Tip: click node to open video</p>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

// Truncate long text to keep labels readable in small graphs
function truncateText(str, maxLen = 18) {
  const s = String(str || "");
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

// Escape HTML in tooltip to avoid breaking the tooltip container
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MetricCard({ label, value, percentile, industryAvg }) {
  const getPercentileColor = (p) => {
    if (p >= 75) return "text-green-600";
    if (p >= 50) return "text-blue-600";
    if (p >= 25) return "text-amber-600";
    return "text-rose-600";
  };

  const getPercentileLabel = (p) => {
    if (p >= 90) return "Top 10%";
    if (p >= 75) return "Top 25%";
    if (p >= 50) return "Above Average";
    if (p >= 25) return "Below Average";
    return "Needs Improvement";
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mb-2">{value}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${getPercentileColor(percentile)}`}>
          {getPercentileLabel(percentile)}
        </span>
        <span className="text-xs text-slate-500">Industry avg: {industryAvg}</span>
      </div>
      <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${
            percentile >= 75 ? "bg-green-500" : percentile >= 50 ? "bg-blue-500" : percentile >= 25 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${Math.min(percentile, 100)}%` }}
        />
      </div>
    </div>
  );
}

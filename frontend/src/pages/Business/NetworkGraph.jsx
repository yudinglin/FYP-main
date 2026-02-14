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
import {
  BarChart3,
  Network,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Rocket,
  ThumbsUp,
  Zap,
  Target,
  Eye,
  Video,
  Heart,
  MessageCircle,
  Users,
  Star,
  Sprout,
  Trophy,
  ArrowUp,
} from "lucide-react";
import { API_BASE } from "../../core/api/client";

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
  const lastAutoFetchKeyRef = useRef("");
  const containerRef = useRef();
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Center video (Graph tab only)
  const [centerInput, setCenterInput] = useState("");
  const [centerVideoId, setCenterVideoId] = useState("");

  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Video catalog for center-video selection (pre-analysis)
  const [videoCatalog, setVideoCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  // Similarity network (used only in Network Graph view)
  const [similarityGraphData, setSimilarityGraphData] = useState({
    nodes: [],
    links: [],
    rawMetrics: [],
  });

  // --------- resize graph container (ROBUST) ---------
  useEffect(() => {
    if (activeView !== "graph") return;
    if (!containerRef.current) return;

    const el = containerRef.current;
    let raf = 0;
    let retryTimer = 0;

    const measure = () => {
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;

      if (w >= 300 && h >= 300) {
        setContainerSize((prev) => {
          if (prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
        return true;
      }
      return false;
    };

    const updateSize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const ok = measure();
        if (!ok) {
          clearTimeout(retryTimer);
          retryTimer = window.setTimeout(() => {
            requestAnimationFrame(() => measure());
          }, 60);
        }
      });
    };

    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(el);

    window.addEventListener("resize", updateSize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(retryTimer);
      window.removeEventListener("resize", updateSize);
      ro.disconnect();
    };
  }, [activeView]);

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
        `${API_BASE}/api/youtube/videos.performanceComparison?urls=${encodeURIComponent(
          urlsParam
        )}&maxVideos=${parsed}`
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

      // fit view (only meaningful if graph is visible)
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

  const resetGraphOnly = () => {
    setHasAnalyzed(false);
    setError("");
    setLoading(false);

    setGraphData({ nodes: [], links: [], rawMetrics: [] });
    setPerChannelGraphs([]);

    setPerformanceData(null);
    setPerformanceError("");
    setPerformanceLoading(false);

    setSimilarityGraphData({ nodes: [], links: [], rawMetrics: [] });

    setCenterInput("");
    setCenterVideoId("");
  };

  const extractRawVideoId = (maybePrefixed) => {
    const s = String(maybePrefixed || "");
    const parts = s.split(":");
    return parts[parts.length - 1] || "";
  };

  const fetchVideoCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError("");

    try {
      if (!selectedUrls.length) {
        setVideoCatalog([]);
        setCatalogError("No channel selected");
        return;
      }

      const results = await Promise.all(
        selectedUrls.map(async (url, idx) => {
          const q = encodeURIComponent(url);
          const res = await fetch(`${API_BASE}/api/youtube/videos.catalog?url=${q}&maxResults=2000`);
          if (!res.ok) {
            const t = await res.text();
            throw new Error(t || `Failed to fetch video catalog for channel ${idx + 1}`);
          }
          const data = await res.json();
          const vids = Array.isArray(data.videos) ? data.videos : [];
          return { url, idx, vids };
        })
      );

      const merged = [];
      results.forEach(({ url, idx, vids }) => {
        vids.forEach((v) => {
          const rawId = v?.id || "";
          if (!rawId) return;
          merged.push({
            ...v,
            id: `${idx}:${rawId}`,
            _rawId: rawId,
            _channelUrl: url,
          });
        });
      });

      setVideoCatalog(merged);

      if (!centerVideoId && merged.length > 0) {
        setCenterVideoId(merged[0].id);
        setCenterInput(`${merged[0].title} — ${merged[0].id}`);
      }
    } catch (e) {
      console.error(e);
      setCatalogError(e?.message || "Failed to fetch video catalog");
      setVideoCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const resolveCenterVideoId = (value) => {
    if (!value) return "";
    // try match "... — <id>" or last 11-char youtube id or prefixed "<idx>:<id>"
    const m = String(value).match(/([0-9]+:[A-Za-z0-9_-]{11}|[A-Za-z0-9_-]{11})\s*$/);
    return m ? m[1] : "";
  };

  const handleFetchSimilarityGraph = async (prefixedCenterId) => {
    setLoading(true);
    setError("");

    try {
      const centerIdToUse = prefixedCenterId || centerVideoId || resolveCenterVideoId(centerInput);
      if (!centerIdToUse) {
        setError("Please select a center video first.");
        return;
      }

      const rawId = extractRawVideoId(centerIdToUse);

      let channelUrl = "";
      const found = (videoCatalog || []).find((v) => v.id === centerIdToUse);
      if (found?._channelUrl) channelUrl = found._channelUrl;
      else channelUrl = selectedUrls[0] || "";

      if (!channelUrl) {
        setError("No channel URL found for the selected center video.");
        return;
      }

      const q = encodeURIComponent(channelUrl);
      const vid = encodeURIComponent(rawId);
      const topK = Math.max(1, Math.min(500, Number(maxVideos) || 25));

      const res = await fetch(
        `${API_BASE}/api/youtube/videos.similarityNetwork?url=${q}&videoId=${vid}&topK=${topK}&poolMax=2000`
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Similarity network request failed");
      }

      const data = await res.json();

      const nodes = (data.nodes || []).map((n) => ({
        ...n,
        id: n.id,
        _rawId: n.id,
        title: n.title || n.id,
        name: n.title || n.id,
        engagementRate: n.views > 0 ? ((n.likes || 0) + (n.comments || 0)) / n.views : 0,
        isCenter: Boolean(n.isCenter),
        _channelUrl: channelUrl,
      }));

      const links = (data.edges || []).map((e) => ({ ...e }));

      setSimilarityGraphData({
        nodes,
        links,
        rawMetrics:
          data.rawMetrics ||
          nodes.map((n) => ({
            views: n.views || 0,
            likes: n.likes || 0,
            comments: n.comments || 0,
            thumbnail: n.thumbnail,
            title: n.title || n.id,
            id: n.id,
            _rawId: n.id,
            _channelUrl: channelUrl,
          })),
      });
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to fetch similarity network");
      setSimilarityGraphData({ nodes: [], links: [], rawMetrics: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeClick = async () => {
    setHasAnalyzed(true);
    await handleFetchGraph();
    if (activeView === "graph") {
      await handleFetchSimilarityGraph();
    }
  };

  // --------- helpers ---------
  const truncate = (str, len = 45) => {
    if (!str) return "";
    return str.length <= len ? str : str.slice(0, len - 1) + "…";
  };

  const formatNum = (n) => (Number(n) || 0).toLocaleString();

  const MenuItem = ({ icon: Icon, label, view, badge, description }) => {
    const isActive = activeView === view;
    return (
      <button
        onClick={() => setActiveView(view)}
        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
          isActive
            ? "bg-indigo-50 border-2 border-indigo-200"
            : "border-2 border-transparent hover:bg-slate-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <Icon 
            size={18} 
            className={`flex-shrink-0 mt-0.5 ${isActive ? "text-indigo-700" : "text-slate-600"}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-medium ${isActive ? "text-indigo-700" : "text-slate-900"}`}>
                {label}
              </span>
              {badge && (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {isActive && description && (
              <p className="text-xs leading-relaxed text-indigo-600">
                {description}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  const getNodeColor = (engagement) => {
    if (engagement > 0.05) return "#4f46e5";
    if (engagement > 0.02) return "#10b981";
    return "#f59e0b";
  };

  const getNodeSize = (views) => {
    const v = Number(views) || 0;
    return Math.min(10, 2.6 + Math.log10(v + 1) * 1.05);
  };

  const getChannelLabelByUrl = (url) => {
    const c = channels.find((x) => x.url === url);
    return c?.name || "Channel";
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

  const buildFetchKey = () => {
    const urlsKey = (selectedUrls || []).join("|");
    const n = Math.max(5, Math.min(80, Number(videoInput) || 25));
    return `${selectedKey}__${urlsKey}__${n}`;
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

  const displayGraphData = useMemo(() => {
    if (activeView !== "graph") return { nodes: graphData.nodes, links: graphData.links };
    return { nodes: similarityGraphData.nodes, links: similarityGraphData.links };
  }, [
    activeView,
    graphData.nodes,
    graphData.links,
    similarityGraphData.nodes,
    similarityGraphData.links,
  ]);

  // IMPORTANT: clone data before passing to ForceGraph to avoid it mutating React state objects
  const fgData = useMemo(() => {
    const src = displayGraphData || { nodes: [], links: [] };
    return {
      nodes: (src.nodes || []).map((n) => ({ ...n })),
      links: (src.links || []).map((l) => ({ ...l })),
    };
  }, [displayGraphData]);

  // --------- force layout tuning (Graph tab only) ---------
  // Apply forces and reheat ONLY when data changes (not when resizing)
  useEffect(() => {
    if (activeView !== "graph") return;
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

    if ((fgData.nodes || []).length > 0) fg.d3ReheatSimulation();
  }, [activeView, fgData.nodes.length, fgData.links.length]);

  // Resize behavior: do NOT reheat; just re-center and (optionally) fit
  useEffect(() => {
    if (activeView !== "graph") return;
    if (!fgRef.current) return;

    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fgRef.current?.centerAt?.(0, 0, 0);
          if (hasAnalyzed && (fgData.nodes || []).length > 0) {
            fgRef.current?.zoomToFit?.(300, 60);
          }
          fgRef.current?.refresh?.();
        });
      });
    }, 80);

    return () => clearTimeout(t);
  }, [activeView, containerSize.width, containerSize.height, hasAnalyzed, fgData.nodes.length]);


  useEffect(() => {
    if (activeView !== "graph") return;

    const key = selectedUrls.join("|");
    if (!key) {
      setVideoCatalog([]);
      return;
    }

    fetchVideoCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedUrls.join("|")]);

  useEffect(() => {
    if (activeView !== "graph") return;
    if (!hasAnalyzed) return;
    if (!centerVideoId) return;

    handleFetchSimilarityGraph(centerVideoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, hasAnalyzed, centerVideoId]);

  // --------- render ---------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Industry Network Graph</h1>
          <p className="text-slate-600">
            Visualize how videos relate based on correlation of metrics.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-700 px-4 py-2 mb-2">Views</h2>
              <div className="space-y-1">
                <MenuItem 
                  icon={BarChart3} 
                  label="Summary" 
                  view="summary" 
                  badge="Default"
                  description="Quick overview of your network analysis with key metrics and insights"
                />
                <MenuItem 
                  icon={Network} 
                  label="Network Graph" 
                  view="graph" 
                  badge="Start Here"
                  description="Interactive visualization showing how videos connect based on similarity and engagement patterns"
                />
                <MenuItem 
                  icon={BarChart3} 
                  label="Charts" 
                  view="charts"
                  description="Detailed charts and data visualizations of video performance metrics"
                />
                <MenuItem 
                  icon={Lightbulb} 
                  label="Performance Insights" 
                  view="insights"
                  description="AI-powered recommendations and actionable insights to improve your content strategy"
                />
              </div>
            </div>

            {/* Analysis Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Analysis Settings</h3>

              <div className="space-y-4">
                {/* Channel Selector */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">Channel</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedKey}
                    onChange={(e) => {
                      resetGraphOnly();
                      setSelectedKey(e.target.value);
                    }}
                  >
                    {options.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Center Video (only for Network Graph) */}
                <div className={`${activeView !== "graph" ? "opacity-50" : ""}`}>
                  <label className="text-sm text-slate-600 block mb-2">Center Video</label>

                  <input
                    type="text"
                    list="business-center-video-list"
                    value={centerInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCenterInput(val);
                      const id = resolveCenterVideoId(val);
                      if (id) setCenterVideoId(id);
                    }}
                    onBlur={() => {
                      const id = resolveCenterVideoId(centerInput);
                      if (id) setCenterVideoId(id);
                    }}
                    disabled={activeView !== "graph" || catalogLoading || videoCatalog.length === 0}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                    placeholder={
                      activeView !== "graph"
                        ? "Center video available in Network Graph"
                        : catalogLoading
                        ? "Loading videos..."
                        : videoCatalog.length === 0
                        ? "No videos found"
                        : "Search video title..."
                    }
                  />

                  <datalist id="business-center-video-list">
                    {videoCatalog.map((v) => (
                      <option key={v.id} value={`${v.title} — ${v.id}`} />
                    ))}
                  </datalist>

                  <p className="text-xs text-slate-500 mt-1">
                    {activeView !== "graph"
                      ? "Center video is only required for Network Graph."
                      : "Pick a video; it will be the center node (ALL channels supported)."}
                  </p>
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
                  onClick={handleAnalyzeClick}
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
                      {Math.round(
                        graphData.rawMetrics.reduce((s, v) => s + (v.views || 0), 0) /
                          graphData.rawMetrics.length
                      ).toLocaleString()}
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
                {displayGraphData.nodes.length === 0 ? (
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
                    Explore which videos behave similarly based on views, likes, and comments. Node
                    size = views, color = engagement rate. Click a node to open the video.
                    {graphData.nodes.length > 50 && " Drag to pan, scroll to zoom."}
                  </p>

                  <div ref={containerRef} className="h-[600px] relative">
                    {(!hasAnalyzed || similarityGraphData.nodes.length === 0) && !loading ? (
                      <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        <div className="text-center">
                          <Network className="mx-auto text-slate-300 mb-4" size={64} />
                          <div className="text-slate-600 mb-2">No data available yet</div>
                          <div className="text-sm text-slate-500">
                            Click "Analyze Videos" to get started
                          </div>
                          {catalogError ? (
                            <div className="text-xs text-rose-600 mt-2">{catalogError}</div>
                          ) : null}
                        </div>
                      </div>
                    ) : similarityGraphData.nodes.length > 0 && similarityGraphData.links.length === 0 ? (
                      <div className="h-full flex items-center justify-center bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-center max-w-md p-6">
                          <AlertCircle className="mx-auto text-amber-600 mb-4" size={48} />
                          <h3 className="font-semibold text-lg mb-2 text-slate-900">
                            No Strong Connections Found
                          </h3>
                          <p className="text-slate-600 text-sm mb-4">
                            Your videos have unique performance patterns. This means each video
                            appeals to different audiences.
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

                        <ForceGraph2D
                          ref={fgRef}
                          graphData={fgData}
                          width={containerSize.width}
                          height={containerSize.height}
                          nodeLabel={nodeTooltip}
                          onNodeClick={handleNodeClick}
                          nodeCanvasObjectMode={() => "replace"}
                          nodeCanvasObject={(node, ctx, globalScale) => {
                            const size = getNodeSize(node.views);
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                            ctx.fillStyle = getNodeColor(node.engagementRate);
                            ctx.fill();
                            ctx.strokeStyle = "#fff";
                            ctx.lineWidth = 1.5;
                            ctx.stroke();

                            if (globalScale > 2.2) {
                              const fontSize = Math.min(14, Math.max(9, 12 / globalScale));
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
                          linkWidth={(link) => Math.max(0.8, (link.weight || 0.2) * 2)}
                          linkDirectionalParticles={0}
                          linkCurvature={0.1}
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
                    {/* Scatter Charts - Competitive Analysis */}
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 mb-4">
                        Performance Comparison: You vs Competition
                      </h2>
                      <div
                        className={`grid grid-cols-1 ${
                          perChannelGraphs.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
                        } gap-6`}
                      >
                        {perChannelGraphs.map((ch, idx) => {
                          const channelInfo = channels.find((c) => c.url === ch.url);
                          const isPrimary = channelInfo?.is_primary || idx === 0;
                          const channelName =
                            channelInfo?.name || ch.label || `Channel ${idx + 1}`;

                          const channelScatterData = (ch.rawMetrics || []).map((v) => ({
                            id: v.id,
                            title: v.title || v.name || v._rawId || v.id,
                            views: Number(v.views) || 0,
                            likes: Number(v.likes) || 0,
                            comments: Number(v.comments) || 0,
                            engagementRate:
                              (Number(v.views) || 0) > 0
                                ? (Number(v.likes) + Number(v.comments)) / Number(v.views)
                                : 0,
                          }));

                          return (
                            <div
                              key={idx}
                              className={`rounded-xl bg-white border shadow-sm p-6 ${
                                isPrimary ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-slate-900">{channelName}</h3>
                                  {isPrimary && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white font-semibold">
                                      Your Channel
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
                                    <Scatter
                                      data={channelScatterData}
                                      fill={isPrimary ? "#4f46e5" : "#10b981"}
                                    />
                                  </ScatterChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bar Charts - Competitive Analysis */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-900">
                          Top Performing Content: You vs Competition
                        </h2>
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

                      <div
                        className={`grid grid-cols-1 ${
                          perChannelGraphs.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
                        } gap-6`}
                      >
                        {perChannelGraphs.map((ch, idx) => {
                          const channelInfo = channels.find((c) => c.url === ch.url);
                          const isPrimary = channelInfo?.is_primary || idx === 0;
                          const channelName =
                            channelInfo?.name || ch.label || `Channel ${idx + 1}`;

                          const channelScatterData = (ch.rawMetrics || []).map((v) => ({
                            id: v.id,
                            title: v.title || v.name || v._rawId || v.id,
                            views: Number(v.views) || 0,
                            likes: Number(v.likes) || 0,
                            comments: Number(v.comments) || 0,
                            engagementRate:
                              (Number(v.views) || 0) > 0
                                ? (Number(v.likes) + Number(v.comments)) / Number(v.views)
                                : 0,
                          }));

                          const channelBarData = [...channelScatterData]
                            .sort((a, b) => (b[barMetric] || 0) - (a[barMetric] || 0))
                            .slice(0, 10);

                          return (
                            <div
                              key={idx}
                              className={`rounded-xl bg-white border shadow-sm p-6 ${
                                isPrimary ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-slate-900">{channelName}</h3>
                                {isPrimary && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white font-semibold">
                                    Your Channel
                                  </span>
                                )}
                              </div>

                              <div className="h-[420px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={channelBarData} margin={{ top: 10, right: 20, bottom: 90, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                      dataKey="title"
                                      tick={{ fontSize: 11 }}
                                      interval="preserveStartEnd"
                                      minTickGap={10}
                                      angle={-45}
                                      textAnchor="end"
                                      height={110}
                                      tickFormatter={(t) => (t && t.length > 16 ? `${t.slice(0, 16)}…` : t)}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value) => formatNum(value)} labelFormatter={(label) => label} />
                                    <Bar
                                      dataKey={barMetric}
                                      fill={isPrimary ? "#4f46e5" : "#10b981"}
                                      radius={[8, 8, 0, 0]}
                                    >
                                      <LabelList
                                        dataKey={barMetric}
                                        position="top"
                                        formatter={(v) => formatNum(v)}
                                        style={{ fontSize: 10 }}
                                      />
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
                                if (name === "engagementRate") return `${(Number(value) * 100).toFixed(2)}%`;
                                return formatNum(value);
                              }}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.title || ""}
                            />
                            <Scatter data={scatterData} fill="#4f46e5" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

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
                      <div className="text-sm text-slate-500">
                        Comparing your channels against industry benchmarks
                      </div>
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
                    {/* Business-Friendly Summary */}
                    {(() => {
                      // Determine which channel to display based on selection
                      let displayChannel, displayChannelMetrics, displayChannelName;
                      
                      if (selectedKey === "__ALL__") {
                        // Show primary channel when "All channels" is selected
                        displayChannel = channels.find((c) => c.is_primary) || channels[0];
                        displayChannelMetrics =
                          performanceData.channel_metrics?.find(
                            (cm) => cm.channel_url === displayChannel?.url
                          ) || performanceData.channel_metrics?.[0];
                        displayChannelName = displayChannel?.name || "your channel";
                      } else {
                        // Show the selected channel
                        const selectedOption = options.find((o) => o.key === selectedKey);
                        const selectedUrl = selectedOption?.url;
                        displayChannel = channels.find((c) => c.url === selectedUrl);
                        displayChannelMetrics = performanceData.channel_metrics?.find(
                          (cm) => cm.channel_url === selectedUrl
                        );
                        displayChannelName = displayChannel?.name || selectedOption?.label || "this channel";
                      }
                      
                      const primaryChannelMetrics = displayChannelMetrics;
                      const primaryChannelName = displayChannelName;

                      if (!primaryChannelMetrics) return null;

                      const engagementPercentile = primaryChannelMetrics.percentiles?.engagement_rate || 0;
                      const viewsPercentile = primaryChannelMetrics.percentiles?.avg_views || 0;
                      const likesPercentile = primaryChannelMetrics.percentiles?.likes_per_1k || 0;

                      const getPerformanceLevel = (percentile) => {
                        if (percentile >= 75) return { level: "Excellent", color: "green", icon: Rocket };
                        if (percentile >= 50) return { level: "Good", color: "blue", icon: ThumbsUp };
                        if (percentile >= 25) return { level: "Fair", color: "amber", icon: Zap };
                        return { level: "Needs Work", color: "rose", icon: Target };
                      };

                      const reachLevel = getPerformanceLevel(viewsPercentile);
                      const engagementLevel = getPerformanceLevel(engagementPercentile);
                      const likabilityLevel = getPerformanceLevel(likesPercentile);

                      return (
                        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 mb-6">
                          <div className="mb-6">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500 mb-2">
                              Performance Overview
                            </p>
                            <h2 className="text-xl font-semibold text-slate-900">
                              How is {primaryChannelName} performing?
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                              Here's what your numbers tell us about your channel's health
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                              <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    reachLevel.color === "green"
                                      ? "bg-emerald-100"
                                      : reachLevel.color === "blue"
                                      ? "bg-blue-100"
                                      : reachLevel.color === "amber"
                                      ? "bg-indigo-100"
                                      : "bg-slate-200"
                                  }`}>
                                  <reachLevel.icon className={`${
                                      reachLevel.color === "green"
                                        ? "text-emerald-600"
                                        : reachLevel.color === "blue"
                                        ? "text-blue-600"
                                        : reachLevel.color === "amber"
                                        ? "text-indigo-600"
                                        : "text-slate-600"
                                    }`} size={20} />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-900 text-sm">Audience Reach</h3>
                                  <p className="text-xs text-slate-500">How many people see your videos</p>
                                </div>
                              </div>
                              <div className={`text-xl font-bold mb-2 ${
                                  reachLevel.color === "green"
                                    ? "text-emerald-600"
                                    : reachLevel.color === "blue"
                                    ? "text-blue-600"
                                    : reachLevel.color === "amber"
                                    ? "text-indigo-600"
                                    : "text-slate-600"
                                }`}>
                                {reachLevel.level}
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {reachLevel.level === "Excellent"
                                  ? "Your videos are reaching lots of people! Keep it up."
                                  : reachLevel.level === "Good"
                                  ? "You're reaching a decent audience. Room to grow."
                                  : reachLevel.level === "Fair"
                                  ? "Your reach is okay, but there's potential for more."
                                  : "Your videos need more visibility. Let's work on that."}
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                              <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    engagementLevel.color === "green"
                                      ? "bg-emerald-100"
                                      : engagementLevel.color === "blue"
                                      ? "bg-blue-100"
                                      : engagementLevel.color === "amber"
                                      ? "bg-indigo-100"
                                      : "bg-slate-200"
                                  }`}>
                                  <engagementLevel.icon className={`${
                                      engagementLevel.color === "green"
                                        ? "text-emerald-600"
                                        : engagementLevel.color === "blue"
                                        ? "text-blue-600"
                                        : engagementLevel.color === "amber"
                                        ? "text-indigo-600"
                                        : "text-slate-600"
                                    }`} size={20} />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-900 text-sm">Viewer Interest</h3>
                                  <p className="text-xs text-slate-500">How much people interact</p>
                                </div>
                              </div>
                              <div className={`text-xl font-bold mb-2 ${
                                  engagementLevel.color === "green"
                                    ? "text-emerald-600"
                                    : engagementLevel.color === "blue"
                                    ? "text-blue-600"
                                    : engagementLevel.color === "amber"
                                    ? "text-indigo-600"
                                    : "text-slate-600"
                                }`}>
                                {engagementLevel.level}
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {engagementLevel.level === "Excellent"
                                  ? "People love interacting with your content!"
                                  : engagementLevel.level === "Good"
                                  ? "Viewers are engaging well with your videos."
                                  : engagementLevel.level === "Fair"
                                  ? "Some interaction, but could be more engaging."
                                  : "Viewers aren't interacting much. Let's make content more engaging."}
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                              <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    likabilityLevel.color === "green"
                                      ? "bg-emerald-100"
                                      : likabilityLevel.color === "blue"
                                      ? "bg-blue-100"
                                      : likabilityLevel.color === "amber"
                                      ? "bg-indigo-100"
                                      : "bg-slate-200"
                                  }`}>
                                  <likabilityLevel.icon className={`${
                                      likabilityLevel.color === "green"
                                        ? "text-emerald-600"
                                        : likabilityLevel.color === "blue"
                                        ? "text-blue-600"
                                        : likabilityLevel.color === "amber"
                                        ? "text-indigo-600"
                                        : "text-slate-600"
                                    }`} size={20} />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-900 text-sm">Content Appeal</h3>
                                  <p className="text-xs text-slate-500">How much people like it</p>
                                </div>
                              </div>
                              <div className={`text-xl font-bold mb-2 ${
                                  likabilityLevel.color === "green"
                                    ? "text-emerald-600"
                                    : likabilityLevel.color === "blue"
                                    ? "text-blue-600"
                                    : likabilityLevel.color === "amber"
                                    ? "text-indigo-600"
                                    : "text-slate-600"
                                }`}>
                                {likabilityLevel.level}
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {likabilityLevel.level === "Excellent"
                                  ? "Your content really resonates with viewers!"
                                  : likabilityLevel.level === "Good"
                                  ? "People generally like your content."
                                  : likabilityLevel.level === "Fair"
                                  ? "Your content gets some positive response."
                                  : "Your content needs to connect better with viewers."}
                              </p>
                            </div>
                          </div>
                        </section>
                      );
                    })()}

                    {/* Simple Key Insights */}
                    {(() => {
                      const primaryChannel = channels.find((c) => c.is_primary) || channels[0];
                      const primaryChannelMetrics =
                        performanceData.channel_metrics?.find(
                          (cm) => cm.channel_url === primaryChannel?.url
                        ) || performanceData.channel_metrics?.[0];

                      if (!primaryChannelMetrics) return null;

                      const avgViews = primaryChannelMetrics.avg_views || 0;
                      const totalVideos = primaryChannelMetrics.num_videos || 0;

                      return (
                        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 mb-6">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500 mb-2">
                            Channel Statistics
                          </p>
                          <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Stats</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Video className="text-indigo-600" size={22} />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-slate-900">{totalVideos}</div>
                                <div className="text-sm text-slate-500">videos analyzed</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Eye className="text-emerald-600" size={22} />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-slate-900">{formatNum(avgViews)}</div>
                                <div className="text-sm text-slate-500">average views per video</div>
                              </div>
                            </div>
                          </div>
                        </section>
                      );
                    })()}

                    {/* What This Means for Your Business */}
                    {(() => {
                      // Determine which channel to display based on selection
                      let displayChannel, displayChannelMetrics, displayChannelName;
                      
                      if (selectedKey === "__ALL__") {
                        displayChannel = channels.find((c) => c.is_primary) || channels[0];
                        displayChannelMetrics =
                          performanceData.channel_metrics?.find(
                            (cm) => cm.channel_url === displayChannel?.url
                          ) || performanceData.channel_metrics?.[0];
                        displayChannelName = displayChannel?.name || "your channel";
                      } else {
                        const selectedOption = options.find((o) => o.key === selectedKey);
                        const selectedUrl = selectedOption?.url;
                        displayChannel = channels.find((c) => c.url === selectedUrl);
                        displayChannelMetrics = performanceData.channel_metrics?.find(
                          (cm) => cm.channel_url === selectedUrl
                        );
                        displayChannelName = displayChannel?.name || selectedOption?.label || "this channel";
                      }
                      
                      const primaryChannelMetrics = displayChannelMetrics;
                      const primaryChannelName = displayChannelName;

                      if (!primaryChannelMetrics) return null;

                      const insights = generateBusinessFriendlyInsights(primaryChannelMetrics, primaryChannelName);

                      return (
                        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500 mb-2">
                            Actionable Insights
                          </p>
                          <h2 className="text-base font-semibold text-slate-900 mb-4">
                            What This Means for Your Business
                          </h2>

                          <div className="space-y-4">
                            {insights.map((insight, idx) => (
                              <div
                                key={idx}
                                className={`p-4 rounded-xl border ${insight.borderColor} ${insight.bgColor}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      insight.bgColor === "bg-green-50"
                                        ? "bg-emerald-100"
                                        : insight.bgColor === "bg-blue-50"
                                        ? "bg-blue-100"
                                        : insight.bgColor === "bg-amber-50"
                                        ? "bg-indigo-100"
                                        : "bg-slate-200"
                                    }`}>
                                    <insight.icon className={`${
                                        insight.bgColor === "bg-green-50"
                                          ? "text-emerald-600"
                                          : insight.bgColor === "bg-blue-50"
                                          ? "text-blue-600"
                                          : insight.bgColor === "bg-amber-50"
                                          ? "text-indigo-600"
                                          : "text-slate-600"
                                      }`} size={18} />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 mb-2 text-sm">{insight.title}</h3>
                                    <p className="text-slate-600 mb-3 leading-relaxed text-sm">{insight.explanation}</p>
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                      <p className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                                        <CheckCircle size={14} className="text-indigo-600" />
                                        What you should do:
                                      </p>
                                      <p className="text-sm text-slate-600 leading-relaxed">{insight.action}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-5 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                              <Target className="text-indigo-600" size={16} />
                              Your Next 3 Steps
                            </h3>
                            <div className="space-y-2">
                              {insights.slice(0, 3).map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <p className="text-sm text-slate-700 leading-relaxed flex-1">{insight.simpleAction}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      );
                    })()}

                    {/* Multi-Channel Comparison (if multiple channels) */}
                    {performanceData.channel_metrics && performanceData.channel_metrics.length > 1 && (
                      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500 mb-2">
                          Competitive Analysis
                        </p>
                        <h2 className="text-base font-semibold text-slate-900 mb-1">
                          How You Compare to Others
                        </h2>
                        <p className="text-sm text-slate-500 mb-5">
                          See how your channel stacks up against similar channels in your space
                        </p>

                        <div className="space-y-3">
                          {performanceData.channel_metrics.map((channel, idx) => {
                            const channelInfo = channels.find((c) => c.url === channel.channel_url);
                            const isPrimary = channelInfo?.is_primary || idx === 0;
                            const channelName = isPrimary ? channelInfo?.name || "Your Channel" : `Competitor ${idx}`;

                            const engagementPercentile = channel.percentiles?.engagement_rate || 0;
                            const viewsPercentile = channel.percentiles?.avg_views || 0;
                            const overallPerformance = (engagementPercentile + viewsPercentile) / 2;

                            const getPerformanceEmoji = (score) => {
                              if (score >= 75) return Rocket;
                              if (score >= 50) return ThumbsUp;
                              if (score >= 25) return Zap;
                              return Target;
                            };

                            const getPerformanceText = (score) => {
                              if (score >= 75) return "Doing great!";
                              if (score >= 50) return "Good performance";
                              if (score >= 25) return "Room to improve";
                              return "Needs attention";
                            };

                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-xl border ${
                                  isPrimary
                                    ? "border-indigo-200 bg-indigo-50"
                                    : "border-slate-200 bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        overallPerformance >= 75
                                          ? "bg-emerald-100"
                                          : overallPerformance >= 50
                                          ? "bg-blue-100"
                                          : overallPerformance >= 25
                                          ? "bg-indigo-100"
                                          : "bg-slate-200"
                                      }`}>
                                      {(() => {
                                        const IconComponent = getPerformanceEmoji(overallPerformance);
                                        return <IconComponent className={`${
                                            overallPerformance >= 75
                                              ? "text-emerald-600"
                                              : overallPerformance >= 50
                                              ? "text-blue-600"
                                              : overallPerformance >= 25
                                              ? "text-indigo-600"
                                              : "text-slate-600"
                                          }`} size={20} />;
                                      })()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-semibold text-slate-900 text-sm">{channelName}</span>
                                        {isPrimary && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium border border-indigo-200">
                                            Your Channel
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">{getPerformanceText(overallPerformance)}</div>
                                    </div>
                                  </div>
                                  <div className="text-right text-sm">
                                    <div className="font-semibold text-slate-900">{formatNum(channel.avg_views)}</div>
                                    <div className="text-xs text-slate-500">avg views</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{channel.num_videos} videos</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <Lightbulb className="text-indigo-600" size={16} />
                            Competitive Analysis
                          </h3>
                          {(() => {
                            const userChannel =
                              performanceData.channel_metrics.find((channel) => {
                                const channelInfo = channels.find((c) => c.url === channel.channel_url);
                                return channelInfo?.is_primary;
                              }) || performanceData.channel_metrics[0];

                            const competitors = performanceData.channel_metrics.filter((channel) => {
                              const channelInfo = channels.find((c) => c.url === channel.channel_url);
                              return !channelInfo?.is_primary && channel !== performanceData.channel_metrics[0];
                            });

                            if (competitors.length === 0) {
                              return (
                                <p className="text-sm text-slate-700">
                                  Add competitor channels to see how you stack up against similar creators in your space.
                                </p>
                              );
                            }

                            const userScore =
                              (userChannel.percentiles?.engagement_rate || 0) +
                              (userChannel.percentiles?.avg_views || 0);
                            const betterThanCount = competitors.filter((comp) => {
                              const compScore =
                                (comp.percentiles?.engagement_rate || 0) +
                                (comp.percentiles?.avg_views || 0);
                              return userScore > compScore;
                            }).length;

                            if (betterThanCount === competitors.length) {
                              return (
                                <p className="text-sm text-slate-700">
                                  <span className="font-medium text-green-600">Great news!</span> Your channel is outperforming
                                  all the competitor channels you're tracking. Keep up the excellent work!
                                </p>
                              );
                            } else if (betterThanCount > competitors.length / 2) {
                              return (
                                <p className="text-sm text-slate-700">
                                  <span className="font-medium text-blue-600">You're doing well!</span> Your channel is performing
                                  better than {betterThanCount} out of {competitors.length} competitors you're tracking.
                                </p>
                              );
                            } else {
                              return (
                                <p className="text-sm text-slate-700">
                                  <span className="font-medium text-indigo-600">Room for growth:</span> You're currently behind
                                  some competitors, but this gives you clear targets to aim for. Focus on the strategies that work for the top performers.
                                </p>
                              );
                            }
                          })()}
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

function ChannelGraphCard({ title, nodes = [], links = [], isPrimary = false, benchmarkStats = null }) {
  // Measure the real container size to avoid 0-width canvas issues
  const graphBoxRef = useRef(null);
  const fgMiniRef = useRef(null);
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

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const centerNode = useMemo(() => {
    if (!nodes.length) return null;
    return [...nodes].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  }, [nodes]);

  const { starNodes, starLinks } = useMemo(() => {
    if (!centerNode) return { starNodes: [], starLinks: [] };

    const centerId = centerNode.id;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const neighborEdges = (links || [])
      .map((e) => {
        const s = typeof e.source === "object" ? e.source.id : e.source;
        const t = typeof e.target === "object" ? e.target.id : e.target;
        return { _s: s, _t: t, weight: Number(e.weight ?? e.value ?? 0) };
      })
      .filter((e) => e._s === centerId || e._t === centerId)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));

    const N = Math.min(12, nodes.length - 1);
    const neighborIds = [];
    for (const e of neighborEdges) {
      const otherId = e._s === centerId ? e._t : e._s;
      if (otherId && otherId !== centerId && !neighborIds.includes(otherId)) {
        neighborIds.push(otherId);
      }
      if (neighborIds.length >= N) break;
    }

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

  const fixedGraphData = useMemo(() => {
    const fixedNodes = (starNodes || []).map((n) => {
      const p = layoutMap.get(n.id);
      if (!p) return n;
      return {
        ...n,
        x: p.x,
        y: p.y,
        fx: p.x,
        fy: p.y,
      };
    });

    const fixedLinks = (starLinks || []).map((l) => ({
      ...l,
      source: typeof l.source === "object" ? l.source.id : l.source,
      target: typeof l.target === "object" ? l.target.id : l.target,
    }));

    return { nodes: fixedNodes, links: fixedLinks };
  }, [starNodes, starLinks, layoutMap]);

  useEffect(() => {
    if (!fgMiniRef.current) return;
    fgMiniRef.current.centerAt(boxSize.w / 2, boxSize.h / 2, 0);
    fgMiniRef.current.zoom(1, 0);
  }, [boxSize.w, boxSize.h, fixedGraphData.nodes.length]);

  return (
    <div
      className={`rounded-2xl p-4 ${
        isPrimary ? "border-2 border-indigo-500 bg-indigo-50/40" : "border border-slate-100 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 line-clamp-1">{title}</p>

          {centerNode ? (
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">
              <span className="font-semibold text-slate-700">Most popular:</span>{" "}
              {mostPopularTitle}{" "}
              <span className="text-slate-500">({Number(mostPopularViews).toLocaleString()} views)</span>
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
          ref={fgMiniRef}
          graphData={fixedGraphData}
          width={boxSize.w}
          height={boxSize.h}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          cooldownTicks={0}
          d3VelocityDecay={1}
          nodeLabel={(n) => n.title || n.name || n.id}
          onNodeClick={(n) => {
            const rawId = n?._rawId || n?.id;
            if (!rawId) return;
            const vid = String(rawId).includes(":") ? String(rawId).split(":")[1] : rawId;
            window.open(`https://www.youtube.com/watch?v=${vid}`, "_blank");
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node, ctx) => {
            const x = node.x ?? 0;
            const y = node.y ?? 0;

            const isCenter = centerNode && node.id === centerNode.id;
            const base = isCenter ? 7 : 4;
            const size = base + Math.log10((node.views || 0) + 1);

            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fillStyle = isCenter ? "rgba(16, 185, 129, 0.95)" : "rgba(79, 70, 229, 0.85)";
            ctx.fill();

            if (isCenter) {
              ctx.strokeStyle = "rgba(15, 118, 110, 0.8)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            if (!isCenter) {
              const label = truncateText(node.title || node.name || "", 18);
              ctx.font = "11px sans-serif";
              ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillText(label, x, y + size + 6);
            }
          }}
          linkColor={() => "rgba(0,0,0,0)"}
          linkCanvasObjectMode={() => "replace"}
          linkCanvasObject={(link, ctx) => {
            const s = typeof link.source === "object" ? link.source : null;
            const t = typeof link.target === "object" ? link.target : null;
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

function truncateText(str, maxLen = 18) {
  const s = String(str || "");
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

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
            percentile >= 75
              ? "bg-green-500"
              : percentile >= 50
              ? "bg-blue-500"
              : percentile >= 25
              ? "bg-amber-500"
              : "bg-rose-500"
          }`}
          style={{ width: `${Math.min(percentile, 100)}%` }}
        />
      </div>
    </div>
  );
}

function EnhancedMetricCard({ label, value, percentile, industryAvg, explanation, trend = "stable" }) {
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

  const getTrendIcon = (t) => {
    if (t === "up") return <TrendingUp className="text-green-600" size={14} />;
    if (t === "down") return <TrendingDown className="text-rose-600" size={14} />;
    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-slate-500">{label}</p>
        {getTrendIcon(trend)}
      </div>
      <p className="text-2xl font-semibold text-slate-900 mb-2">{value}</p>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">{explanation}</p>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium ${getPercentileColor(percentile)}`}>
          {getPercentileLabel(percentile)}
        </span>
        <span className="text-xs text-slate-500">Industry: {industryAvg}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            percentile >= 75
              ? "bg-green-500"
              : percentile >= 50
              ? "bg-blue-500"
              : percentile >= 25
              ? "bg-amber-500"
              : "bg-rose-500"
          }`}
          style={{ width: `${Math.min(percentile, 100)}%` }}
        />
      </div>
    </div>
  );
}

function generateBusinessFriendlyInsights(channelMetrics, channelName) {
  const insights = [];

  const engagementPercentile = channelMetrics.percentiles?.engagement_rate || 0;
  const viewsPercentile = channelMetrics.percentiles?.avg_views || 0;
  const likesPercentile = channelMetrics.percentiles?.likes_per_1k || 0;
  const avgViews = channelMetrics.avg_views || 0;

  if (viewsPercentile >= 75) {
    insights.push({
      icon: Rocket,
      title: "Your videos are getting great visibility!",
      explanation:
        "Your videos are reaching more people than most other channels. This means your content is being discovered well and your audience is growing.",
      action: "Keep doing what you're doing! Consider posting more frequently to reach even more people.",
      simpleAction: "Post videos more regularly to keep the momentum going",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500",
    });
  } else if (viewsPercentile < 30) {
    insights.push({
      icon: ArrowUp,
      title: "Let's get more eyes on your content",
      explanation:
        "Your videos aren't reaching as many people as they could. This usually means we need to work on making your content more discoverable.",
      action: "Focus on better video titles, eye-catching thumbnails, and sharing your videos on social media to reach more people.",
      simpleAction: "Improve your video titles and thumbnails to attract more viewers",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
    });
  }

  if (engagementPercentile >= 70) {
    insights.push({
      icon: Heart,
      title: "People love interacting with your content!",
      explanation:
        "Your viewers are actively liking and commenting on your videos, which is fantastic! This shows they're really connecting with what you create.",
      action: "Keep creating content that sparks conversation. Reply to comments to build an even stronger community.",
      simpleAction: "Respond to more comments to build a stronger community",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500",
    });
  } else if (engagementPercentile < 40) {
    insights.push({
      icon: MessageCircle,
      title: "Let's get people more involved",
      explanation:
        "Your viewers aren't interacting with your videos as much as they could. This might mean they're watching but not feeling compelled to engage.",
      action: "Ask questions in your videos, encourage viewers to comment, and create content that invites discussion.",
      simpleAction: "Ask viewers questions in your videos to encourage comments",
      bgColor: "bg-amber-50",
      borderColor: "border-l-amber-500",
    });
  }

  if (likesPercentile >= 70) {
    insights.push({
      icon: Star,
      title: "Your content quality is impressive!",
      explanation:
        "People are hitting the like button on your videos more than average, which means they genuinely enjoy what you're creating.",
      action: "Analyze your most-liked videos to understand what resonates with your audience, then create more similar content.",
      simpleAction: "Look at your most popular videos and make more content like that",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500",
    });
  } else if (likesPercentile < 35) {
    insights.push({
      icon: Target,
      title: "There's room to improve content appeal",
      explanation:
        "Your videos might not be connecting with viewers as strongly as they could. This could be about content style, topics, or presentation.",
      action: "Try different content formats, focus on topics your audience cares about, and pay attention to what gets the best response.",
      simpleAction: "Experiment with different video topics and styles to see what works best",
      bgColor: "bg-orange-50",
      borderColor: "border-l-orange-500",
    });
  }

  if (avgViews < 1000) {
    insights.push({
      icon: Sprout,
      title: "You're in the growth phase",
      explanation:
        "Every successful channel starts somewhere! You're building your foundation, and with the right strategies, you can grow your audience significantly.",
      action: "Focus on consistency - post regularly, engage with your audience, and be patient. Growth takes time but it will come.",
      simpleAction: "Stay consistent with posting and be patient - growth takes time",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
    });
  } else if (avgViews > 10000) {
    insights.push({
      icon: Trophy,
      title: "You've built a solid audience!",
      explanation:
        "Getting over 10,000 views per video is a significant achievement. You've proven there's demand for your content.",
      action: "Consider monetization opportunities, collaborations with other creators, or expanding your content topics to grow even further.",
      simpleAction: "Explore ways to monetize your success and collaborate with other creators",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: ThumbsUp,
      title: "You're on the right track!",
      explanation:
        "Your channel is performing steadily. Every creator's journey is unique, and consistent effort is the key to long-term success.",
      action: "Keep creating content you're passionate about, stay consistent with your posting schedule, and engage with your audience.",
      simpleAction: "Keep creating consistently and engaging with your audience",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
    });
  }

  return insights.slice(0, 4);
}

function generateSmartInsights(channelMetrics, channelName, performanceData) {
  const insights = [];

  const engagementRate = channelMetrics.engagement_rate || 0;
  const avgViews = channelMetrics.avg_views || 0;
  const likesPerK = channelMetrics.likes_per_1k_views || 0;
  const commentsPerK = channelMetrics.comments_per_1k_views || 0;

  const engagementPercentile = channelMetrics.percentiles?.engagement_rate || 0;
  const viewsPercentile = channelMetrics.percentiles?.avg_views || 0;
  const likesPercentile = channelMetrics.percentiles?.likes_per_1k || 0;

  const industryEngagement = performanceData.comparison?.engagement_rate?.industry_avg || 0.015;
  const industryViews = performanceData.comparison?.avg_views?.industry_avg || 5000;
  const industryLikes = performanceData.comparison?.likes_per_1k?.industry_avg || 15;

  if (engagementPercentile >= 80) {
    insights.push({
      type: "success",
      priority: "high",
      title: "Outstanding Audience Engagement",
      description: `Your ${(engagementRate * 100).toFixed(
        2
      )}% engagement rate puts you in the top 20% of creators. Your audience is highly active and invested in your content.`,
      recommendation:
        "Leverage this strong engagement by creating more interactive content, hosting live sessions, or launching community polls to maintain this momentum.",
      action: "Create more interactive content like Q&As, polls, or community posts to maintain high engagement",
      actionable: true,
      icon: "trophy",
    });
  } else if (engagementPercentile < 25) {
    insights.push({
      type: "warning",
      priority: "high",
      title: "Engagement Needs Attention",
      description: `Your ${(engagementRate * 100).toFixed(
        2
      )}% engagement rate is below industry standards. This suggests viewers aren't actively interacting with your content.`,
      recommendation:
        "Focus on creating more compelling calls-to-action, ask questions throughout your videos, and respond to comments to encourage interaction.",
      action: "Add clear calls-to-action in your videos asking viewers to like, comment, and subscribe",
      actionable: true,
      icon: "alert",
    });
  }

  if (viewsPercentile >= 75) {
    insights.push({
      type: "success",
      priority: "medium",
      title: "Strong Reach Performance",
      description: `With ${avgViews.toLocaleString()} average views per video, you're reaching a substantial audience and outperforming most creators in your space.`,
      recommendation: "Consider increasing your upload frequency or expanding to related topics to capitalize on your strong reach.",
      action: "Maintain consistent upload schedule and consider expanding content topics",
      actionable: true,
      icon: "trending-up",
    });
  } else if (viewsPercentile < 30) {
    insights.push({
      type: "improvement",
      priority: "high",
      title: "Opportunity to Expand Reach",
      description: `Your average of ${avgViews.toLocaleString()} views per video suggests there's significant room to grow your audience.`,
      recommendation:
        "Optimize your video titles and thumbnails for better click-through rates, and consider promoting your content on other social platforms.",
      action: "Improve video titles, thumbnails, and cross-promote on other social media platforms",
      actionable: true,
      icon: "target",
    });
  }

  if (likesPercentile >= 70 && engagementPercentile >= 60) {
    insights.push({
      type: "success",
      priority: "medium",
      title: "High-Quality Content Recognition",
      description: `Your ${likesPerK.toFixed(
        1
      )} likes per 1K views indicates viewers genuinely appreciate your content quality.`,
      recommendation:
        "Document what makes your most-liked videos successful and apply those elements to future content.",
      action: "Analyze your top-performing videos and replicate their successful elements",
      actionable: true,
      icon: "heart",
    });
  }

  if (commentsPerK >= 5) {
    insights.push({
      type: "success",
      priority: "low",
      title: "Strong Community Building",
      description: `Your ${commentsPerK.toFixed(1)} comments per 1K views shows you're building an engaged community that wants to interact.`,
      recommendation:
        "Continue fostering this community by responding to comments and creating content that sparks discussion.",
      action: "Respond to more comments and create discussion-focused content",
      actionable: true,
      icon: "users",
    });
  }

  if (performanceData.channel_metrics && performanceData.channel_metrics.length > 1) {
    const otherChannels = performanceData.channel_metrics.filter(
      (c) => c.channel_url !== channelMetrics.channel_url
    );
    const avgOtherEngagement =
      otherChannels.reduce((sum, c) => sum + (c.engagement_rate || 0), 0) / otherChannels.length;

    if (engagementRate > avgOtherEngagement * 1.2) {
      insights.push({
        type: "insight",
        priority: "medium",
        title: "Cross-Channel Strategy Opportunity",
        description:
          "This channel significantly outperforms your others in engagement. Consider applying its successful strategies across your channel network.",
        recommendation:
          "Analyze what content types and posting strategies work best here, then adapt them for your other channels.",
        action: "Apply successful strategies from this channel to your other channels",
        actionable: true,
        icon: "lightbulb",
      });
    }
  }

  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return insights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]).slice(0, 5);
}

function InsightCard({ insight }) {
  const getInsightStyle = (type) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "improvement":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "insight":
        return "bg-purple-50 border-purple-200 text-purple-800";
      default:
        return "bg-slate-50 border-slate-200 text-slate-800";
    }
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case "trophy":
        return <CheckCircle className="text-green-600" size={20} />;
      case "alert":
        return <AlertCircle className="text-amber-600" size={20} />;
      case "trending-up":
        return <TrendingUp className="text-blue-600" size={20} />;
      case "target":
        return <BarChart3 className="text-blue-600" size={20} />;
      case "heart":
        return <CheckCircle className="text-green-600" size={20} />;
      case "users":
        return <Network className="text-indigo-600" size={20} />;
      case "lightbulb":
        return <Lightbulb className="text-purple-600" size={20} />;
      default:
        return <Lightbulb className="text-slate-600" size={20} />;
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getInsightStyle(insight.type)}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon(insight.icon)}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-1">{insight.title}</h3>
          <p className="text-sm text-slate-700 mb-3 leading-relaxed">{insight.description}</p>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Recommendation:</p>
            <p className="text-sm text-slate-700">{insight.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

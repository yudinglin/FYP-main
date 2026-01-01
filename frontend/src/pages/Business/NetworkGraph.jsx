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
import { BarChart3, Network, AlertCircle } from "lucide-react";

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
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Industry Network Graph</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Visualize how videos relate based on correlation of metrics. Business user supports up to 3
          linked channels.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* Controls */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <p className="text-xs text-slate-500">Channel</p>
              <select
                className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
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

            <div>
              <p className="text-xs text-slate-500">Max videos</p>
              <input
                className="mt-1 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                placeholder="25"
              />
            </div>

            <button
              onClick={handleFetchGraph}
              disabled={loading}
              className="mt-5 sm:mt-0 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Analyze Videos"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("summary")}
              className={`rounded-xl px-3 py-2 text-sm border ${
                activeView === "summary"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveView("graph")}
              className={`rounded-xl px-3 py-2 text-sm border ${
                activeView === "graph"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => setActiveView("charts")}
              className={`rounded-xl px-3 py-2 text-sm border ${
                activeView === "charts"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Charts
            </button>
          </div>
        </section>

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

        {/* Graph */}
        {activeView === "graph" && (
          <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
            <div
              ref={containerRef}
              className="w-full h-[600px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
            >
              {graphData.nodes.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-600">
                    <Network className="mx-auto text-slate-300 mb-4" size={64} />
                    <div className="font-medium">No graph available</div>
                    <div className="text-sm text-slate-500 mt-1">Click “Analyze Videos” first.</div>
                  </div>
                </div>
              ) : (
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
                  enableNodeDrag
                  enableZoomInteraction
                  enablePanInteraction
                />
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Tip: Click a node to open the video on YouTube.
            </p>
          </section>
        )}

        {/* Charts */}
        {activeView === "charts" && (
          <div className="space-y-6">
            {graphData.rawMetrics.length === 0 ? (
              <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-center">
                  <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
                  <div className="text-slate-600 mb-2">No chart data available</div>
                  <div className="text-sm text-slate-500">Click “Analyze Videos” to view charts</div>
                </div>
              </div>
            ) : (
              <>
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
      </div>
    </div>
  );
}

function ChannelGraphCard({ title, nodes = [], links = [] }) {
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
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
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

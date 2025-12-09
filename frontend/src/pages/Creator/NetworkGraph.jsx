// frontend/src/pages/Creator/NetworkGraph.jsx
import React, { useState, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

const API_BASE = "http://127.0.0.1:5000";

export default function NetworkGraph() {
  const [channelInput, setChannelInput] = useState("");
  const [threshold, setThreshold] = useState(0.9);
  const [maxVideos, setMaxVideos] = useState(10); // <-- New state
  const [graphData, setGraphData] = useState({ nodes: [], links: [], rawMetrics: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fgRef = useRef();
  const containerRef = useRef();

  const handleFetchGraph = async () => {
    setLoading(true);
    setError("");

    try {
      const channelUrl = localStorage.getItem("channelUrl");
      if (!channelUrl) {
        setError("No channel URL found in localStorage.");
        setLoading(false);
        return;
      }

      const q = encodeURIComponent(channelUrl);
      const res = await fetch(
        `${API_BASE}/api/youtube/videos.correlationNetwork?url=${q}&threshold=${threshold.toFixed(2)}&maxVideos=${maxVideos}`
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
      }));

      const links = (data.edges || []).map((e) => ({ ...e }));

      setGraphData({
        nodes,
        links,
        rawMetrics: nodes.map(n => ({
          views: n.views || 0,
          likes: n.likes || 0,
          comments: n.comments || 0,
          thumbnail: n.thumbnail,
          title: n.title || n.id
        }))
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Force layout tuning
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;

    fg.d3Force("charge").strength(-200);
    fg.d3Force("link").distance((link) => 180 - (link.weight || 0) * 100);

    const collideForce = fg.d3Force("collide");
    if (collideForce) {
      collideForce.radius((node) => 5 + Math.sqrt(node.views || 0) / 2000);
    }
  }, [graphData]);

  const getNodeColor = (engagement) => {
    if (engagement > 0.05) return "#4f46e5"; // high
    if (engagement > 0.02) return "#10b981"; // medium
    return "#f59e0b"; // low
  };

  const getNodeSize = (views) => {
    if (!views) return 4;
    return 4 + Math.log10(views + 1) * 2;
  };

  const nodeTooltip = (node) => {
    return `
      Title: ${node.title || "Untitled Video"}
      Published: ${node.publishedAt ?? "N/A"}
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

  const [containerSize, setContainerSize] = useState({ width: 800, height: 540 });
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

  const truncate = (str, n = 30) => str?.length > n ? str.substr(0, n) + "..." : str;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-4">
        Enhanced Video Correlation Network
      </h1>

      <p className="text-sm text-slate-500 mb-6">
        Explore which videos behave similarly based on views, likes, and comments.
        Node size = views, color = engagement rate. Click a node to open the video.
      </p>

      {/* Controls */}
      <div className="mb-6 space-y-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        {/* Correlation Threshold */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="text-sm font-medium text-slate-700 md:w-32">
            Correlation threshold
          </label>
          <div className="flex items-center gap-3 flex-1">
            {/* Use this if u want a slider */}
            {/* <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full"
            /> */}

            <span className="text-sm text-slate-700 w-12 text-right">{threshold.toFixed(2)}</span>
          </div>
        </div>

        {/* Number of Videos */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="text-sm font-medium text-slate-700 md:w-32">
            Number of Videos
          </label>
          <input
            type="number"
            min="1"
            max="200"
            value={maxVideos}
            onChange={(e) => setMaxVideos(parseInt(e.target.value) || 10)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleFetchGraph}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Network"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mt-1 whitespace-pre-line">{error}</p>}
      </div>

      {/* Network Graph */}
      <div ref={containerRef} className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 h-[540px] relative mb-10">
        {graphData.nodes.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No data yet. Enter a channel and click "Generate Network".
          </div>
        ) : (
          <>
            {/* Engagement Rate Legend */}
            <div className="absolute top-4 right-4 bg-white p-3 rounded shadow border text-sm max-w-xs">
              <div className="font-semibold mb-1">Engagement Rate Legend</div>
              <p className="text-xs text-slate-500 mb-2">
                Engagement Rate = (Likes + Comments) / Views. Higher = more active viewers.
              </p>
              <div className="w-full h-4 rounded bg-gradient-to-r from-[#f59e0b] via-[#10b981] to-[#4f46e5] mb-2"></div>
              <div className="flex justify-between text-xs text-slate-700">
                <span>Low &lt; 2%</span>
                <span>Medium 2-5%</span>
                <span>High ≥ 5%</span>
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
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1.2;
                ctx.stroke();

                const fontSize = 10 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.fillStyle = "#000";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(truncate(node.title || node.id), node.x, node.y - size - 2);
              }}
              linkColor={() => "rgba(79, 70, 229, 0.3)"}
              linkWidth={(link) => (link.weight || 0) * 3}
              linkDirectionalParticles={2}
            />
          </>
        )}
      </div>

      {/* Scatter Plot */}
      {graphData.rawMetrics.length > 0 && (
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
                width={700}
                height={400}
                margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
              >
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="views"
                  name="Views"
                  label={{ value: "Views", position: "bottom", offset: 0 }}
                />
                <YAxis
                  type="number"
                  dataKey="likes"
                  name="Likes"
                  label={{ value: "Likes", angle: -90, position: "insideLeft" }}
                />

                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
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
                            <div>Views: {vid.views?.toLocaleString() ?? 0}</div>
                            <div>Likes: {vid.likes?.toLocaleString() ?? 0}</div>
                            <div>Comments: {vid.comments?.toLocaleString() ?? 0}</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Scatter
                  name="Videos"
                  data={graphData.rawMetrics}
                  fill="rgba(79,70,229,0.7)"
                />
              </ScatterChart>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

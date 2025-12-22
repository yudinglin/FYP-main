import React, { useState, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,Cell,
  LineChart, Line,Legend, ResponsiveContainer, BarChart, Bar,  LabelList,
  ComposedChart, Rectangle
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";





const API_BASE = "http://127.0.0.1:5000";

export default function NetworkGraph() {
  const [threshold, setThreshold] = useState(0.9);
  const [maxVideos, setMaxVideos] = useState(10); // <-- New state
  const [graphData, setGraphData] = useState({ nodes: [], links: [], rawMetrics: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fgRef = useRef();
  const { user } = useAuth();
  const containerRef = useRef();
  const [barMetric, setBarMetric] = useState("views"); // views / likes / comments
  const [activeView, setActiveView] = useState("charts"); // 'charts' or 'summary'

  const handleFetchGraph = async () => {
    setLoading(true);
    setError("");

    try {
      const channelUrl = user.youtube_channel;
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
          title: n.title || n.id,
          id: n.id,
        }))
      });
      
      localStorage.setItem("graphData", JSON.stringify({ nodes, links }));
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

  // Summary Panel Component
  const SummaryPanel = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="p-6 text-center text-slate-500">
          No data available for summary.
        </div>
      );
    }

    // Calculate metrics
    const sortedByViews = [...data].sort((a, b) => (b.views || 0) - (a.views || 0));
    const sortedByComments = [...data].sort((a, b) => (b.comments || 0) - (a.comments || 0));

    const topVideos = sortedByViews.slice(0, 3);
    const lowVideos = sortedByViews.slice(-3).reverse(); // bottom 3, but reverse for display

    const avgViews = data.reduce((sum, v) => sum + (v.views || 0), 0) / data.length;
    const avgLikes = data.reduce((sum, v) => sum + (v.likes || 0), 0) / data.length;
    const avgComments = data.reduce((sum, v) => sum + (v.comments || 0), 0) / data.length;
    const avgEngagement = data.reduce((sum, v) => {
      const views = v.views || 0;
      return sum + (views > 0 ? ((v.likes || 0) + (v.comments || 0)) / views : 0);
    }, 0) / data.length;

    const overallPerformance = avgEngagement > 0.05 ? "excellent" : avgEngagement > 0.02 ? "good" : "needs improvement";

    const engagementDrivers = sortedByComments.slice(0, 3); // videos with most comments drive engagement

    return (
      <div className="p-6 space-y-6">
        {/* Overall Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Channel Performance Overview</h3>
          <p className="text-slate-700">
            Your content is performing <span className="font-medium">{overallPerformance}</span>. 
            On average, your videos get {Math.round(avgViews).toLocaleString()} views, 
            {Math.round(avgLikes).toLocaleString()} likes, and {Math.round(avgComments).toLocaleString()} comments.
          </p>
        </div>

        {/* Top Performing Videos */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Your Best Performing Videos</h3>
          <p className="text-slate-600 mb-4">These videos are getting the most attention from viewers:</p>
          <div className="space-y-3">
            {topVideos.map((video, idx) => (
              <div key={video.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors" onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}>
                {video.thumbnail && <img src={video.thumbnail} alt={video.title} className="w-12 h-12 object-cover rounded" />}
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{truncate(video.title, 50)}</div>
                  <div className="text-sm text-slate-600">{(video.views || 0).toLocaleString()} views</div>
                </div>
                <div className="text-green-600 font-medium">#{idx + 1}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-3">💡 Make more videos like these to keep your audience engaged.</p>
        </div>

        {/* Videos Needing Improvement */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Videos That Could Use Some Work</h3>
          <p className="text-slate-600 mb-4">These videos aren't getting as much attention:</p>
          <div className="space-y-3">
            {lowVideos.map((video) => (
              <div key={video.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}>
                {video.thumbnail && <img src={video.thumbnail} alt={video.title} className="w-12 h-12 object-cover rounded" />}
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{truncate(video.title, 50)}</div>
                  <div className="text-sm text-slate-600">{(video.views || 0).toLocaleString()} views</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-3">💡 Try improving titles, thumbnails, or descriptions for these videos to attract more viewers.</p>
        </div>

        {/* Engagement Drivers */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Videos Driving the Most Engagement</h3>
          <p className="text-slate-600 mb-4">These videos are sparking the most conversations:</p>
          <div className="space-y-3">
            {engagementDrivers.map((video, idx) => (
              <div key={video.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}>
                {video.thumbnail && <img src={video.thumbnail} alt={video.title} className="w-12 h-12 object-cover rounded" />}
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{truncate(video.title, 50)}</div>
                  <div className="text-sm text-slate-600">{(video.comments || 0).toLocaleString()} comments</div>
                </div>
                <div className="text-blue-600 font-medium">#{idx + 1}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-3">💡 Encourage viewers to leave comments on your videos to build community.</p>
        </div>

        {/* Actionable Suggestions */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Quick Tips to Grow Your Channel</h3>
          <ul className="space-y-2 text-slate-700">
            <li>• Focus on creating content similar to your top-performing videos.</li>
            <li>• Engage with your audience by responding to comments regularly.</li>
            <li>• Experiment with different thumbnails and titles to see what works best.</li>
            <li>• Post consistently to keep your viewers coming back.</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto flex gap-6">
      {/* Sidebar */}
      <div className="w-60 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Analysis Views</h2>
        <div className="space-y-2">
          <button
            onClick={() => setActiveView("charts")}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeView === "charts" ? "bg-indigo-100 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Charts & Graphs
          </button>
          <button
            onClick={() => setActiveView("summary")}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeView === "summary" ? "bg-indigo-100 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
           Summary
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {activeView === "charts" ? (
          <>
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

        <div className="flex justify-end gap-3">
          <button
            onClick={handleFetchGraph}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Network"}
          </button>

          {/* SAVE GRAPH */}
          <button
            onClick={() => {
              const graphCopy = {
                ...graphData,
                nodes: graphData.nodes.map(n => ({
                  ...n,
                  x: n.x,
                  y: n.y,
                  vx: n.vx,
                  vy: n.vy
                }))
              };

              localStorage.setItem("savedGraph", JSON.stringify(graphCopy));
              alert("Graph saved successfully!");
            }}
            disabled={graphData.nodes.length === 0}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            Save Graph
          </button>

          {/* LOAD GRAPH */}
          <button
            onClick={() => {
              const saved = localStorage.getItem("savedGraph");
              if (!saved) return alert("No saved graph found.");

              const parsed = JSON.parse(saved);

              // Freeze positions so physics does not change layout
              parsed.nodes.forEach(n => {
                n.fx = n.x;
                n.fy = n.y;
              });

              setGraphData(parsed);
              alert("Graph loaded successfully!");
            }}
            className="inline-flex items-center rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Load Saved Graph
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
      )}

      {/* Top Videos Bar Chart - Fully Polished Version */}
      {graphData.rawMetrics.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-md border border-slate-200 mt-8">
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
                    .slice(0, 10)  // <-- THIS line limits to top 10
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
      )}

          </>
        ) : (
          <SummaryPanel data={graphData.rawMetrics} />
        )}
      </div>
    </div>
  );
  
}

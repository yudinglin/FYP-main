// frontend/src/pages/Creator/NetworkGraph.jsx
import React, { useState } from "react";
import ForceGraph2D from "react-force-graph-2d";




// Backend API base address (if you have changed the port, change it here as well)）
const API_BASE = "http://127.0.0.1:5000";

export default function NetworkGraph() {
  const [channelInput, setChannelInput] = useState("");
  const [threshold, setThreshold] = useState(0.9);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchGraph = async () => {
  setLoading(true);
  setError("");

  try {
    //  localStorage take channelUrl（the other page if wanna get youtube data copy the template）
    const channelUrl = localStorage.getItem("channelUrl");

    if (!channelUrl) {
      setError("No channel URL found in localStorage.");
      setLoading(false);
      return;
    }

    const q = encodeURIComponent(channelUrl);

    const res = await fetch(
      `http://localhost:5000/api/youtube/videos.correlationNetwork?url=${q}&threshold=${threshold}`
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Network request failed");
    }

    const data = await res.json();

    const nodes = (data.nodes || []).map((n) => ({
      ...n,
      name: n.title || n.id,
    }));

    const links = (data.edges || []).map((e) => ({
      ...e,
    }));

    setGraphData({ nodes, links });
  } catch (err) {
    console.error(err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-4">
        Video Performance Correlation Network
      </h1>

      <p className="text-sm text-slate-500 mb-6">
        Explore which videos behave similarly based on views, likes and
        comments. Each node is a video, and an edge indicates high correlation
        between their engagement patterns.
      </p>

      {/* Control Area: Input channel + threshold + button */}
      <div className="mb-6 space-y-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="text-sm font-medium text-slate-700 md:w-32">
            Channel
          </label>
          <input
            type="text"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Paste channel URL or channelId (e.g. UCxxxx...)"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="text-sm font-medium text-slate-700 md:w-32">
            Correlation threshold
          </label>
          <div className="flex items-center gap-3 flex-1">
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-slate-700 w-12 text-right">
              {threshold.toFixed(2)}
            </span>
          </div>
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

        {error && (
          <p className="text-sm text-red-600 mt-1 whitespace-pre-line">
            {error}
          </p>
        )}
      </div>

      {/* Chart/Graph area */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 h-[540px]">
        {graphData.nodes.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No data yet. Enter a channel and click &quot;Generate Network&quot;.
          </div>
        ) : (
          <ForceGraph2D
            graphData={graphData}
            width={undefined} // Automatically fills the container width
            height={undefined} // Automatically fills the container height
            nodeLabel={(node) =>
              `${node.title || node.id}\nviews: ${node.views ?? "?"}`
            }
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.title || node.id;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = "black";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(label, node.x, node.y - 10 / globalScale);
            }}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={(link) =>
              (link.weight || 0) * 4
            }
            linkColor={() => "rgba(79, 70, 229, 0.3)"} 
          />
        )}
      </div>
    </div>
  );
}

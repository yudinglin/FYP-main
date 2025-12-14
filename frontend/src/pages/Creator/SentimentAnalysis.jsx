import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";

const API_BASE = "http://localhost:5000";

export default function SentimentAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [maxVideos, setMaxVideos] = useState(5);
  const { user } = useAuth();

  const COLORS = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444" };

  const fetchSentiment = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.youtube_channel) throw new Error("No YouTube channel URL found.");
      const encodedUrl = encodeURIComponent(user.youtube_channel);
      const res = await fetch(
        `${API_BASE}/api/youtube/videos.sentimentAnalysis?url=${encodedUrl}&maxVideos=${maxVideos}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${text}`);
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
  }, [maxVideos]);

  const filteredComments = useMemo(() => {
    if (!data) return [];
    let comments = data.comments;
    if (filter !== "all") comments = comments.filter((c) => c.sentiment === filter);
    return comments.sort((a, b) =>
      sortOrder === "desc" ? b.polarity_score - a.polarity_score : a.polarity_score - b.polarity_score
    );
  }, [data, filter, sortOrder]);

  const sentimentSummary = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.summary)
      .filter(([k]) => k !== "totalComments")
      .map(([key, value]) => ({ name: key, value, color: COLORS[key] }));
  }, [data]);

  const wordFrequency = useMemo(() => {
    if (!filteredComments.length) return [];
    const words = filteredComments
      .map((c) => c.text)
      .join(" ")
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const freqMap = {};
    words.forEach((w) => (freqMap[w] = (freqMap[w] || 0) + 1));
    return Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }, [filteredComments]);

  const sentimentTrend = useMemo(() => {
    if (!data) return [];
    const trend = {};
    data.comments.forEach((c) => {
      const key = c.videoTitle || c.videoId;
      if (!trend[key]) trend[key] = { videoTitle: key, positive: 0, neutral: 0, negative: 0 };
      trend[key][c.sentiment] += 1;
    });
    return Object.values(trend);
  }, [data]);

  if (loading) return <p className="text-center mt-10 text-gray-500">Analyzing comments sentiment...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">Error: {error}</p>;
  if (!data) return <p className="text-center mt-10 text-gray-500">No data available</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Sentiment Analysis</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2 border rounded">
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="p-2 border rounded">
          <option value="desc">Polarity Descending</option>
          <option value="asc">Polarity Ascending</option>
        </select>

        <select value={maxVideos} onChange={(e) => setMaxVideos(Number(e.target.value))} className="p-2 border rounded">
          <option value={5}>5 Videos</option>
          <option value={10}>10 Videos</option>
          <option value={15}>15 Videos</option>
          <option value={20}>20 Videos</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {sentimentSummary.map((item) => (
          <div key={item.name} className="p-4 rounded-lg shadow-md text-center bg-white border-l-8" style={{ borderColor: item.color }}>
            <p className="text-gray-500 font-medium capitalize">{item.name} Comments</p>
            <p className="text-2xl font-bold">{item.value}</p>
            <span className="text-sm text-gray-400">{((item.value / data.summary.totalComments) * 100).toFixed(1)}%</span>
            <div className="w-full bg-gray-200 h-2 rounded mt-2">
              <div className="h-2 rounded" style={{ width: `${(item.value / data.summary.totalComments) * 100}%`, backgroundColor: item.color }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pie Chart */}
      <div className="p-4 bg-white rounded-lg shadow-md mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={sentimentSummary}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {sentimentSummary.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Sentiment Trend (Stacked Bar Chart) */}
      <div className="p-4 bg-white rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Sentiment Trend by Video</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sentimentTrend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="videoTitle" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="positive" stackId="a" fill={COLORS.positive} />
            <Bar dataKey="neutral" stackId="a" fill={COLORS.neutral} />
            <Bar dataKey="negative" stackId="a" fill={COLORS.negative} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Word Cloud */}
      <div className="p-4 bg-white rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Top Keywords</h2>
        <div className="flex flex-wrap gap-2">
          {wordFrequency.map((w, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-1 rounded text-white transform rotate-0 hover:scale-110 transition"
              style={{
                backgroundColor: `hsl(${(idx * 50) % 360}, 70%, 50%)`,
                fontSize: `${14 + w.count * 2}px`,
              }}
            >
              {w.word} ({w.count})
            </span>
          ))}
        </div>
      </div>

      {/* Sample Comments */}
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Sample Comments ({filteredComments.length})</h2>
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {filteredComments.map((c, idx) => (
            <li key={idx} className="p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer">
              <p className="text-gray-700">{c.text}</p>
              <span
                className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full"
                style={{ backgroundColor: COLORS[c.sentiment], color: "#fff" }}
              >
                {c.sentiment.toUpperCase()} ({c.polarity_score})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

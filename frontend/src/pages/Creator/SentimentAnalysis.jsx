import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

import { useAuth } from "../../core/context/AuthContext";

const API_BASE = "http://localhost:5000";

export default function SentimentAnalysis() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [videoOptions, setVideoOptions] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("charts"); // 'charts' or 'summary'

  const COLORS = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444" };
  const selectedSet = useMemo(() => new Set(selectedVideos), [selectedVideos]);
  const sentimentTimeline = useMemo(() => {
    if (!data?.sentimentByMonth?.length) return [];
    return data.sentimentByMonth;
  }, [data]);

  const availableMonths = useMemo(() => {
    if (!sentimentTimeline.length) return [];
    return ["all", ...new Set(sentimentTimeline.map((d) => d.month))];
  }, [sentimentTimeline]);

  const filteredTimeline = useMemo(() => {
  if (!sentimentTimeline.length) return [];
  if (selectedMonth === "all") return sentimentTimeline;
  return sentimentTimeline.filter((d) => d.month === selectedMonth);
}, [sentimentTimeline, selectedMonth]);

    const filteredVideoOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return videoOptions;
    return videoOptions.filter((v) => v.title.toLowerCase().includes(term));
  }, [videoOptions, searchTerm]);

  const fetchVideoOptions = async () => {
    setLoadingVideos(true);
    setError(null);
    try {
      if (!user?.youtube_channel) throw new Error("No YouTube channel URL found.");
      const encodedUrl = encodeURIComponent(user.youtube_channel);
      const res = await fetch(`${API_BASE}/api/youtube/videos.sentimentVideos?url=${encodedUrl}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${text}`);
      }
      const result = await res.json();
      setVideoOptions(result.videos || []);
      if ((result.videos || []).length) {
        const defaultSelection = result.videos.slice(0, 5).map((v) => v.id);
        setSelectedVideos(defaultSelection);
      } else {
        setSelectedVideos([]);
      }
    } catch (err) {
      setError(err.message);
      setVideoOptions([]);
      setSelectedVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchSentiment = async (videoIds) => {
    if (!videoIds.length) {
      setData(null);
      return;
    }
    setLoadingSentiment(true);
    setError(null);
    try {
      if (!user?.youtube_channel) throw new Error("No YouTube channel URL found.");
      const encodedUrl = encodeURIComponent(user.youtube_channel);
      const encodedIds = encodeURIComponent(videoIds.join(","));
      const res = await fetch(
        `${API_BASE}/api/youtube/videos.sentimentAnalysis?url=${encodedUrl}&videoIds=${encodedIds}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${text}`);
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoadingSentiment(false);
    }
  };

  useEffect(() => {
    fetchVideoOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSentiment(selectedVideos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideos]);

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
    const summaryEntries = Object.entries(data.summary || {}).filter(([k]) => k !== "totalComments");
    if (!summaryEntries.length) return [];
    return summaryEntries
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
    if (!data?.comments?.length) return [];
    const trend = {};
    data.comments.forEach((c) => {
      const key = c.videoTitle || c.videoId;
      if (!trend[key]) trend[key] = { videoTitle: key, positive: 0, neutral: 0, negative: 0 };
      trend[key][c.sentiment] += 1;
    });
    return Object.values(trend);
  }, [data]);

  const totalComments = data?.summary?.totalComments || 0;
  const showLoading = loadingVideos || loadingSentiment;
  const noSelection = !selectedVideos.length;
  const hasError = Boolean(error);

  // Summary Panel Component
  const SummaryPanel = ({ data, selectedVideos, videoOptions }) => {
    if (!data || !data.summary) {
      return (
        <div className="p-6 text-center text-slate-500">
          No data available for summary.
        </div>
      );
    }

    const summary = data.summary;
    const totalComments = summary.totalComments || 0;
    const positiveCount = summary.positive || 0;
    const neutralCount = summary.neutral || 0;
    const negativeCount = summary.negative || 0;

    // Calculate percentages
    const positivePercent = totalComments > 0 ? ((positiveCount / totalComments) * 100).toFixed(1) : 0;
    const neutralPercent = totalComments > 0 ? ((neutralCount / totalComments) * 100).toFixed(1) : 0;
    const negativePercent = totalComments > 0 ? ((negativeCount / totalComments) * 100).toFixed(1) : 0;

    // Determine overall tone
    let overallTone = "neutral";
    let toneDescription = "balanced";
    if (positiveCount > negativeCount && positiveCount > neutralCount) {
      overallTone = "positive";
      toneDescription = "mostly positive";
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
      overallTone = "negative";
      toneDescription = "mostly negative";
    }

    // Find most impactful video (most comments)
    // ✅ Correct: derive from sentiment comments
    const mostDiscussedVideo = useMemo(() => {
      if (!data?.comments?.length) return null;

      const counts = {};

      data.comments.forEach((c) => {
        const key = c.videoId;
        if (!counts[key]) {
          counts[key] = {
            videoId: c.videoId,
            title: c.videoTitle,
            count: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
          };
        }
        counts[key].count += 1;
        counts[key][c.sentiment] += 1;
      });

      return Object.values(counts).sort((a, b) => b.count - a.count)[0];
    }, [data]);

    // Calculate sentiment for most discussed video
    let videoSentiment = "neutral";
    if (mostDiscussedVideo) {
      const videoPositive = mostDiscussedVideo.positive || 0;
      const videoNegative = mostDiscussedVideo.negative || 0;
      if (videoPositive > videoNegative) videoSentiment = "positive";
      else if (videoNegative > videoPositive) videoSentiment = "negative";
    }

    return (
      <div className="p-6 space-y-6">
        {/* 1. Overall Audience Tone */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Overall Audience Tone</h3>
          <p className="text-slate-700">
            Audience sentiment is <span className="font-medium">{toneDescription}</span>, indicating {overallTone === "positive" ? "strong viewer satisfaction" : overallTone === "negative" ? "areas for improvement" : "balanced feedback"} with recent content.
          </p>
        </div>

        {/* 2. Sentiment Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Sentiment Distribution</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{positivePercent}%</div>
              <div className="text-sm text-slate-600">Positive</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{neutralPercent}%</div>
              <div className="text-sm text-slate-600">Neutral</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{negativePercent}%</div>
              <div className="text-sm text-slate-600">Negative</div>
            </div>
          </div>
        </div>

        {/* 3. Most Discussed Video */}
        {mostDiscussedVideo && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            Most Discussed Video
          </h3>

          <p className="text-slate-600 mb-3">
            This video received the highest number of comments during the analysis period.
          </p>

          <div
            className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition"
            onClick={() =>
              window.open(`https://www.youtube.com/watch?v=${mostDiscussedVideo.videoId}`, "_blank")
            }
          >
            <div className="flex-1">
              <div className="font-medium text-slate-900">
                {mostDiscussedVideo.title}
              </div>
              <div className="text-sm text-slate-600">
                {mostDiscussedVideo.count} comments •
                Positive: {mostDiscussedVideo.positive} •
                Neutral: {mostDiscussedVideo.neutral} •
                Negative: {mostDiscussedVideo.negative}
              </div>
            </div>
          </div>
        </div>
      )}


        {/* 4. Key Interpretation */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Key Interpretation</h3>
          <p className="text-slate-700">
            {overallTone === "positive" 
              ? "Positive sentiment suggests current content strategy resonates well with viewers, creating strong audience engagement."
              : overallTone === "negative"
              ? "Negative sentiment clusters indicate specific content issues rather than overall dissatisfaction, suggesting targeted improvements."
              : "Balanced sentiment distribution shows consistent but moderate audience reception, with room for strategic content optimization."
            }
          </p>
        </div>

        {/* 5. Actionable Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Actionable Recommendations</h3>
          <ul className="space-y-2 text-slate-700">
            <li>• Respond to negative comments promptly to reduce dissatisfaction and show you care about viewer feedback.</li>
            <li>• Create follow-up content based on positively received topics to capitalize on successful content themes.</li>
            <li>• Address recurring complaints in future videos to prevent similar negative feedback patterns.</li>
            <li>• Use comment sentiment analysis to refine content tone and style for better audience connection.</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Sentiment Analysis
        </h1>

        {/* View Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-1">
            <button
              onClick={() => setActiveView("charts")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                activeView === "charts"
                  ? "bg-indigo-100 text-indigo-700 shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Charts
            </button>
            <button
              onClick={() => setActiveView("summary")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                activeView === "summary"
                  ? "bg-indigo-100 text-indigo-700 shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Summary
            </button>
          </div>
        </div>

        

        {/* Select Videos at the top */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-600 font-medium">Select Videos</label>
            <span className="text-xs text-gray-500">{selectedVideos.length} selected</span>
          </div>
          <div className="mb-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search titles..."
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="max-h-72 overflow-y-auto border rounded bg-white shadow-sm divide-y">
            {!filteredVideoOptions.length && !loadingVideos && (
              <p className="text-sm text-gray-500 p-3">No videos match your search.</p>
            )}
            {filteredVideoOptions.map((v) => {
              const isActive = selectedSet.has(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    setSelectedVideos((prev) =>
                      prev.includes(v.id) ? prev.filter((id) => id !== v.id) : [...prev, v.id]
                    )
                  }
                  className={`w-full text-left px-3 py-2 transition hover:bg-purple-50 focus:outline-none ${
                    isActive ? "bg-red-100" : "bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-500 truncate">{v.id}</p>
                  <div className="mt-1 text-xs font-medium inline-flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? "bg-red-500" : "bg-gray-300"
                      }`}
                    ></span>
                    {isActive ? "Selected" : "Click to select"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sentiment Filter below */}
        <div className="mb-6">
          <label className="text-sm text-gray-600 mb-1 font-medium">Sentiment Filter</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 border rounded w-48"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>


      {showLoading && (
        <p className="text-center mt-4 text-gray-500">
          {loadingVideos ? "Loading video list..." : "Analyzing selected videos..."}
        </p>
      )}

      {hasError && <p className="text-center mt-4 text-red-500">Error: {error}</p>}

      {noSelection && !showLoading && !hasError && (
        <p className="text-center mt-6 text-gray-500">Select one or more videos to view sentiment insights.</p>
      )}

      {!showLoading && !hasError && !noSelection && !data && (
        <p className="text-center mt-10 text-gray-500">No data available for the selected videos.</p>
      )}

      {!showLoading && !hasError && data && (
        <>
          {activeView === "charts" ? (
            <>
              {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {sentimentSummary.map((item) => (
              <div key={item.name} className="p-4 rounded-lg shadow-md text-center bg-white border-l-8" style={{ borderColor: item.color }}>
                <p className="text-gray-500 font-medium capitalize">{item.name} Comments</p>
                <p className="text-2xl font-bold">{item.value}</p>
                <span className="text-sm text-gray-400">
                  {totalComments ? ((item.value / totalComments) * 100).toFixed(1) : 0}%
                </span>
                <div className="w-full bg-gray-200 h-2 rounded mt-2">
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${totalComments ? (item.value / totalComments) * 100 : 0}%`,
                      backgroundColor: item.color,
                    }}
                  ></div>
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

          <div className="mb-4">
          <label className="text-sm text-gray-600 mr-2">Filter by Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 border rounded"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m === "all" ? "All months" : m}
              </option>
            ))}
          </select>
        </div>


          {/* Sentiment Timeline */}
          <div className="p-4 bg-white rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">
              Audience Sentiment Over Time
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              See how viewer sentiment has changed across different years.
            </p>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={filteredTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />

                <Area
                  type="monotone"
                  dataKey="positive"
                  stackId="1"
                  stroke={COLORS.positive}
                  fill={COLORS.positive}
                  name="Positive"
                />
                <Area
                  type="monotone"
                  dataKey="neutral"
                  stackId="1"
                  stroke={COLORS.neutral}
                  fill={COLORS.neutral}
                  name="Neutral"
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  stackId="1"
                  stroke={COLORS.negative}
                  fill={COLORS.negative}
                  name="Negative"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>


          {/* Sentiment Trend (Stacked Bar Chart) */}
          <div className="p-4 bg-white rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Sentiment Trend by Video</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={sentimentTrend}
                margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="videoTitle"
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  tick={{ fontSize: 10 }}
                />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
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
                    fontSize: `${14 + w.count * 0.5}px`,
                  }}
                >
                  {w.word} ({w.count})
                </span>
              ))}
              {!wordFrequency.length && <p className="text-sm text-gray-500">No frequent keywords for the current filters.</p>}
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
              {!filteredComments.length && (
                <li className="text-sm text-gray-500">No comments match the current filters.</li>
              )}
            </ul>
          </div>
        </>
          ) : (
            <SummaryPanel data={data} selectedVideos={selectedVideos} videoOptions={videoOptions} />
          )}
        </>
      )}
    </div>
  );
}

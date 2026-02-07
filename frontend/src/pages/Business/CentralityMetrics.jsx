// frontend/src/pages/Business/ChannelPerformanceAnalyzer.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../../core/context/AuthContext";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  Play,
  MessageCircle,
  TrendingUp as TrendingUpIcon,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Target,
  Award,
  Zap,
  Eye,
  ThumbsUp,
  Smile,
  Frown,
  Meh,
  Hash,
  BarChart3,
  Activity,
  Filter,
  Calendar,
  Video,
  Heart,
  MessageSquare,
  BookOpen,
  Star,
  Newspaper,
  Users,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:5000";

// Error boundary component for charts
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-48 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-center text-slate-500">
            <AlertCircle className="mx-auto mb-2" size={24} />
            <p className="text-sm">Chart temporarily unavailable</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ChannelPerformanceAnalyzer() {
  const { user } = useAuth();

  // Channel list from business profile
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
    const singles = channels.map((c, idx) => ({
      key: c.url || String(idx),
      label: c.name
        ? `${c.name}${c.is_primary ? " (Your Channel)" : ""}`
        : `${c.url}${c.is_primary ? " (Your Channel)" : ""}`,
      url: c.url,
      is_primary: c.is_primary,
    }));
    
    // Add "All Channels" option for retention and trending tabs
    const allOption = {
      key: "all",
      label: "All Channels (Comparison)",
      url: "all",
      is_primary: false,
    };
    
    return [allOption, ...singles];
  }, [channels]);

  const [selectedKey, setSelectedKey] = useState(options[0]?.key || "");
  const [activeTab, setActiveTab] = useState("viral");

  const selectedUrl = useMemo(() => {
    const one = options.find((o) => o.key === selectedKey);
    return one?.url || "";
  }, [selectedKey, options]);

  const [maxVideos, setMaxVideos] = useState(30);
  const [videoInput, setVideoInput] = useState("30");

  // Tab-specific states
  const [retentionData, setRetentionData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [trendingData, setTrendingData] = useState(null);
  const [viralData, setViralData] = useState(null);
  const [contentGapData, setContentGapData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sentiment filter state
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [selectedChannelSentiment, setSelectedChannelSentiment] = useState(null);

  const formatNum = (n) => (Number(n) || 0).toLocaleString();

  // Fetch data based on active tab
  const handleAnalyze = async () => {
    setLoading(true);
    setError("");

    try {
      const parsed = Math.max(5, Math.min(100, Number(videoInput) || 30));
      setMaxVideos(parsed);

      if (!selectedUrl) {
        setError("No channel selected.");
        return;
      }

      // Clear previous data
      setRetentionData(null);
      setSentimentData(null);
      setTrendingData(null);
      setSelectedChannelSentiment(null);

      if (activeTab === "retention") {
        if (channels.length < 2) {
          setError("Retention analysis requires at least 2 channels for comparison. Please add more channels in your Business Profile.");
          return;
        }
        const urlsParam = channels.map(c => c.url).join(",");
        const res = await fetch(
          `${API_BASE}/api/youtube/analyzer.retentionOptimizer?urls=${encodeURIComponent(urlsParam)}&maxVideos=${parsed}`
        );
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to fetch retention data");
        }
        const data = await res.json();
        setRetentionData(data);
      } else if (activeTab === "sentiment") {
        const urlToUse = selectedUrl === "all" ? channels.map(c => c.url).join(",") : selectedUrl;
        const res = await fetch(
          `${API_BASE}/api/youtube/analyzer.commentSentiment?urls=${encodeURIComponent(urlToUse)}&maxVideos=${parsed}&maxComments=50`
        );
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to fetch sentiment data");
        }
        const data = await res.json();
        setSentimentData(data);
        if (data.channels && data.channels.length > 0) {
          setSelectedChannelSentiment(data.channels[0]);
        }
      } else if (activeTab === "trending") {
        const urlToUse = selectedUrl === "all" ? channels.map(c => c.url).join(",") : selectedUrl;
        const res = await fetch(
          `${API_BASE}/api/youtube/analyzer.trendingContent?urls=${encodeURIComponent(urlToUse)}&maxVideos=${parsed}`
        );
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to fetch trending data");
        }
        const data = await res.json();
        setTrendingData(data);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err?.message || "Failed to fetch analysis");
      setRetentionData(null);
      setSentimentData(null);
      setTrendingData(null);
      setSelectedChannelSentiment(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Channel Performance Analyzer
          </h1>
          <p className="text-slate-600">
            Optimize retention, understand sentiment, and discover trending content patterns.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-700 px-4 py-2 mb-2">
                Analysis Tools
              </h2>
              <div className="space-y-1">
                <TabButton
                  icon={Play}
                  label="Retention Optimizer"
                  tab="retention"
                  activeTab={activeTab}
                  onClick={() => setActiveTab("retention")}
                />
                <TabButton
                  icon={MessageCircle}
                  label="Comment Sentiment"
                  tab="sentiment"
                  activeTab={activeTab}
                  onClick={() => setActiveTab("sentiment")}
                />
                <TabButton
                  icon={TrendingUpIcon}
                  label="Trending Content"
                  tab="trending"
                  activeTab={activeTab}
                  onClick={() => setActiveTab("trending")}
                />
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Settings
              </h3>

              <div className="mb-4">
                <label className="text-sm text-slate-600 block mb-2">
                  Select Channel
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                >
                  {options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {selectedKey === "all" && (
                  <p className="text-xs text-indigo-600 mt-1">
                    Compare primary channel with all linked channels
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="text-sm text-slate-600 block mb-2">
                  Videos to Analyze
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">5-100 recent videos</p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>

              {error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* RETENTION OPTIMIZER */}
            {activeTab === "retention" && (
              <RetentionOptimizerView 
                retentionData={retentionData}
                loading={loading}
              />
            )}

            {/* COMMENT SENTIMENT */}
            {activeTab === "sentiment" && (
              <CommentSentimentView
                sentimentData={sentimentData}
                loading={loading}
                sentimentFilter={sentimentFilter}
                setSentimentFilter={setSentimentFilter}
                selectedChannelSentiment={selectedChannelSentiment}
                setSelectedChannelSentiment={setSelectedChannelSentiment}
              />
            )}

            {/* TRENDING CONTENT */}
            {activeTab === "trending" && (
              <TrendingContentView
                trendingData={trendingData}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== IMPROVED RETENTION OPTIMIZER VIEW ====================
function RetentionOptimizerView({ retentionData, loading }) {
  if (!retentionData && !loading) {
    return (
      <EmptyState
        icon={Play}
        title="Retention Rate Optimizer"
        description="Understand what content types and pacing keep viewers watching."
        features={[
          "See which content types work best (Tutorial, Review, etc.)",
          "Analyze video pacing effectiveness (Fast vs Deep-dive)",
          "Compare your title hook strength vs competitors",
          "Get specific recommendations with expected impact"
        ]}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Analyzing retention patterns..." />;
  }

  if (!retentionData || typeof retentionData !== 'object') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
        <div className="text-center text-slate-600">
          <AlertCircle className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">No Data Available</div>
          <div className="text-sm text-slate-500">Unable to analyze retention data. Please try again.</div>
        </div>
      </div>
    );
  }

  const formatNum = (n) => (Number(n) || 0).toLocaleString();

  // Safe access to data properties
  const yourAvgEngagement = retentionData.your_avg_engagement || 0;
  const competitorAvgEngagement = retentionData.competitor_avg_engagement || 0;
  const yourAvgHook = retentionData.your_avg_hook_score || 0;
  const competitorAvgHook = retentionData.competitor_avg_hook_score || 0;
  const analyzedVideos = retentionData.analyzed_videos || 0;
  const engagementDistribution = retentionData.engagement_distribution || {};
  const topPrimaryVideos = retentionData.top_primary_videos || [];
  const topCompetitorVideos = retentionData.top_competitor_videos || [];
  const recommendations = retentionData.recommendations || [];
  const contentTypePerformance = retentionData.content_type_performance || {};
  const pacingPerformance = retentionData.pacing_performance || {};
  const primaryChannelName = retentionData.primary_channel_name || "Your Channel";

  return (
    <div className="space-y-6">
      {/* Engagement & Hook Score Comparison */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="text-indigo-600" size={20} />
          <h2 className="text-lg font-semibold text-slate-900">Performance Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Engagement Rate Comparison */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Engagement Rate</h3>
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: 'Your Channel', value: Math.max(0, yourAvgEngagement * 100) },
                  { name: 'Competitors', value: Math.max(0, competitorAvgEngagement * 100) }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'Engagement %', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
            
            <div className="flex items-center justify-between mt-3 p-3 bg-indigo-50 rounded-lg">
              <div>
                <p className="text-xs text-indigo-700">Your Average</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {(yourAvgEngagement * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-700">Competitors</p>
                <p className="text-2xl font-bold text-green-600">
                  {(competitorAvgEngagement * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Hook Strength Comparison */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Title Hook Strength</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Your Hook Score */}
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-2">Your Hooks</p>
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="10"
                      strokeDasharray={`${(yourAvgHook / 100) * 314} 314`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">
                        {yourAvgHook.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-500">/ 100</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Competitor Hook Score */}
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-2">Competitors</p>
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="10"
                      strokeDasharray={`${(competitorAvgHook / 100) * 314} 314`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {competitorAvgHook.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-500">/ 100</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 text-center">
                {yourAvgHook > competitorAvgHook ? (
                  <span className="text-green-700 font-semibold">
                    ✅ Your titles are {(yourAvgHook - competitorAvgHook).toFixed(0)} points stronger!
                  </span>
                ) : yourAvgHook < competitorAvgHook ? (
                  <span className="text-amber-700 font-semibold">
                    ⚠️ Competitors are {(competitorAvgHook - yourAvgHook).toFixed(0)} points ahead
                  </span>
                ) : (
                  <span className="text-slate-700 font-semibold">
                    You're matched with competitors
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Type Performance */}
      {Object.keys(contentTypePerformance).length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Video className="text-purple-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Content Type Performance</h2>
          </div>

          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(contentTypePerformance)
                .filter(([_, stats]) => stats && typeof stats === 'object')
                .map(([type, stats]) => ({
                  type: type.charAt(0).toUpperCase() + type.slice(1),
                  engagement: Math.max(0, (stats.avg_engagement || 0) * 100),
                  views: Math.max(0, stats.avg_views || 0),
                  count: stats.video_count || 0
                }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Engagement %', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                <Bar dataKey="engagement" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(contentTypePerformance).map(([type, stats]) => (
              <ContentTypeCard key={type} type={type} stats={stats} />
            ))}
          </div>
        </section>
      )}

      {/* Pacing Performance */}
      {Object.keys(pacingPerformance).length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Video Pacing Analysis</h2>
          </div>

          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(pacingPerformance)
                .filter(([_, stats]) => stats && typeof stats === 'object')
                .map(([pacing, stats]) => ({
                  pacing: pacing.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                  engagement: Math.max(0, (stats.avg_engagement || 0) * 100),
                  hookScore: Math.max(0, stats.avg_hook_score || 0),
                  count: stats.video_count || 0
                }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pacing" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="engagement" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Engagement %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(pacingPerformance).map(([pacing, stats]) => (
              <PacingCard key={pacing} pacing={pacing} stats={stats} />
            ))}
          </div>
        </section>
      )}

      {/* Top Performing Videos Comparison */}
      {topPrimaryVideos.length > 0 && topCompetitorVideos.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-amber-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Top Performers Comparison</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Top Videos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                <h3 className="font-medium text-slate-900">Your Best Videos</h3>
              </div>
              <div className="space-y-2">
                {topPrimaryVideos.slice(0, 5).map((video, idx) => (
                  <CompactVideoCard key={idx} video={video} rank={idx + 1} color="indigo" />
                ))}
              </div>
            </div>

            {/* Competitor Top Videos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <h3 className="font-medium text-slate-900">Competitor Best Videos</h3>
              </div>
              <div className="space-y-2">
                {topCompetitorVideos.slice(0, 5).map((video, idx) => (
                  <CompactVideoCard key={idx} video={video} rank={idx + 1} color="green" />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-amber-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">💡 What You Should Do</h2>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <ImprovedRecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Content Type Card Component
function ContentTypeCard({ type, stats }) {
  const icons = {
    tutorial: BookOpen,
    review: Star,
    entertainment: Smile,
    news: Newspaper,
    other: Video
  };
  
  const colors = {
    tutorial: "purple",
    review: "blue",
    entertainment: "pink",
    news: "green",
    other: "slate"
  };

  const colorMap = {
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", icon: "text-purple-600" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", icon: "text-blue-600" },
    pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-900", icon: "text-pink-600" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", icon: "text-green-600" },
    slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-900", icon: "text-slate-600" }
  };
  
  const Icon = icons[type] || Video;
  const color = colorMap[colors[type] || "slate"];
  
  return (
    <div className={`p-4 rounded-lg border ${color.border} ${color.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color.icon} />
        <span className={`font-semibold ${color.text} capitalize text-sm`}>
          {type.replace(/_/g, ' ')}
        </span>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-600">Engagement</span>
          <span className={`font-bold ${color.text}`}>
            {((stats.avg_engagement || 0) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Videos</span>
          <span className={`font-bold ${color.text}`}>{stats.video_count || 0}</span>
        </div>
      </div>
      
      {stats.top_video && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-600">Top: {stats.top_video.title?.slice(0, 35) || 'N/A'}...</p>
        </div>
      )}
    </div>
  );
}

// Pacing Card Component
function PacingCard({ pacing, stats }) {
  const pacingName = pacing.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-900">{pacingName}</span>
        <span className="text-xs px-2 py-1 bg-blue-200 text-blue-900 rounded-full">
          {stats.video_count || 0} videos
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-blue-700">Engagement</p>
          <p className="font-bold text-blue-900">{((stats.avg_engagement || 0) * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-blue-700">Hook Score</p>
          <p className="font-bold text-blue-900">{(stats.avg_hook_score || 0).toFixed(0)}/100</p>
        </div>
      </div>
      
      {stats.top_videos && stats.top_videos[0] && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <p className="text-xs text-blue-700 mb-1">Top performer:</p>
          <div className="flex items-center gap-2">
            {stats.top_videos[0].thumbnail && (
              <img 
                src={stats.top_videos[0].thumbnail} 
                alt="" 
                className="w-12 h-8 object-cover rounded"
              />
            )}
            <p className="text-xs text-slate-700 line-clamp-2 flex-1">
              {stats.top_videos[0].title || 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== IMPROVED COMMENT SENTIMENT VIEW ====================
function CommentSentimentView({ sentimentData, loading, sentimentFilter, setSentimentFilter, selectedChannelSentiment, setSelectedChannelSentiment }) {
  if (!sentimentData && !loading) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Comment Sentiment Analyzer"
        description="Understand how your audience feels and how you compare to other channels."
        features={[
          "Track positive, negative, and neutral comments",
          "Compare your sentiment vs other channels",
          "See sentiment trends over time",
          "Discover what topics your audience discusses most"
        ]}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Analyzing comments..." />;
  }

  if (!sentimentData || typeof sentimentData !== 'object') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
        <div className="text-center text-slate-600">
          <AlertCircle className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">No Sentiment Data</div>
          <div className="text-sm text-slate-500">Unable to analyze comment sentiment. Please try again.</div>
        </div>
      </div>
    );
  }

  const channels = sentimentData.channels || [];
  const hasComparison = sentimentData.has_comparison || false;
  const comparisonInsights = sentimentData.comparison_insights || [];

  if (channels.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
        <div className="text-center text-slate-600">
          <MessageCircle className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">No Comments Found</div>
          <div className="text-sm text-slate-500">No comments were found for analysis.</div>
        </div>
      </div>
    );
  }

  if (!selectedChannelSentiment) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
        <div className="text-center text-slate-600">
          <MessageCircle className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">Select a Channel</div>
          <div className="text-sm text-slate-500">Please select a channel to view sentiment analysis.</div>
        </div>
      </div>
    );
  }

  const filteredComments = sentimentFilter === "all"
    ? (selectedChannelSentiment.categorized_comments || [])
    : (selectedChannelSentiment.categorized_comments || []).filter(comment => comment && comment.sentiment === sentimentFilter);

  const sentimentColors = {
    positive: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800" },
    neutral: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-800" },
    negative: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800" }
  };

  return (
    <div className="space-y-6">
      {/* CROSS-CHANNEL COMPARISON INSIGHTS */}
      {hasComparison && comparisonInsights.length > 0 && (
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">How You Compare to Other Channels</h2>
          </div>
          
          <div className="space-y-3">
            {comparisonInsights.map((insight, idx) => (
              <ComparisonInsightCard key={idx} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Channel Selector */}
      {channels.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="text-sm font-medium text-slate-700 block mb-3">
            Select Channel to View Details
          </label>
          <div className="flex gap-2 flex-wrap">
            {channels.map((channel, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedChannelSentiment(channel)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  selectedChannelSentiment?.channel_url === channel.channel_url
                    ? "bg-indigo-600 text-white shadow-lg scale-105"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {channel.is_primary && <span className="mr-1.5">👤</span>}
                {channel.channel_name || `Channel ${idx + 1}`}
                {channel.is_primary && <span className="text-xs ml-1.5 opacity-75">(You)</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            👤 = Your primary channel • Other channels shown for comparison
          </p>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SentimentCard
          icon={Smile}
          label="Positive"
          percentage={Math.round((selectedChannelSentiment.sentiment_distribution?.positive || 0))}
          count={selectedChannelSentiment.sentiment_counts?.positive || 0}
          color="green"
        />
        <SentimentCard
          icon={Meh}
          label="Neutral"
          percentage={Math.round((selectedChannelSentiment.sentiment_distribution?.neutral || 0))}
          count={selectedChannelSentiment.sentiment_counts?.neutral || 0}
          color="slate"
        />
        <SentimentCard
          icon={Frown}
          label="Negative"
          percentage={Math.round((selectedChannelSentiment.sentiment_distribution?.negative || 0))}
          count={selectedChannelSentiment.sentiment_counts?.negative || 0}
          color="red"
        />
      </div>

      {/* Individual Channel Insights */}
      {selectedChannelSentiment.insights && selectedChannelSentiment.insights.length > 0 && (
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-amber-500" size={24} />
            <h2 className="text-xl font-bold text-slate-900">
              {selectedChannelSentiment.is_primary ? "Your Channel Insights" : `${selectedChannelSentiment.channel_name} Insights`}
            </h2>
          </div>

          <div className="space-y-3">
            {selectedChannelSentiment.insights.map((insight, idx) => (
              <SimpleInsightCard key={idx} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Timeline Chart */}
      {selectedChannelSentiment.timeline && selectedChannelSentiment.timeline.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Sentiment Over Time</h2>
          </div>

          <div className="h-[300px]">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedChannelSentiment.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="positive"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Positive"
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    stackId="1"
                    stroke="#64748b"
                    fill="#64748b"
                    fillOpacity={0.6}
                    name="Neutral"
                  />
                  <Area
                    type="monotone"
                    dataKey="negative"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                    name="Negative"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
        </section>
      )}

      {/* Comment Filter & Display */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-indigo-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Comments ({filteredComments.length})</h2>
          </div>

          <div className="flex gap-2 flex-wrap">
            <FilterButton
              label="All"
              active={sentimentFilter === "all"}
              onClick={() => setSentimentFilter("all")}
              count={selectedChannelSentiment.total_comments || 0}
            />
            <FilterButton
              label="Positive"
              active={sentimentFilter === "positive"}
              onClick={() => setSentimentFilter("positive")}
              count={selectedChannelSentiment.sentiment_counts?.positive || 0}
              color="green"
            />
            <FilterButton
              label="Neutral"
              active={sentimentFilter === "neutral"}
              onClick={() => setSentimentFilter("neutral")}
              count={selectedChannelSentiment.sentiment_counts?.neutral || 0}
              color="slate"
            />
            <FilterButton
              label="Negative"
              active={sentimentFilter === "negative"}
              onClick={() => setSentimentFilter("negative")}
              count={selectedChannelSentiment.sentiment_counts?.negative || 0}
              color="red"
            />
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto space-y-2">
          {filteredComments.length > 0 ? (
            filteredComments.slice(0, 50).map((comment, idx) => {
              if (!comment || !comment.sentiment) return null;
              const colors = sentimentColors[comment.sentiment] || sentimentColors.neutral;
              return (
                <div key={idx} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                  <p className={`text-sm ${colors.text} mb-1`}>{comment.text || 'No comment text'}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="capitalize font-medium">{comment.sentiment}</span>
                    {comment.video_title && (
                      <span className="truncate">• {comment.video_title}</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500">
              <MessageCircle className="mx-auto mb-2" size={32} />
              <p>No comments found for the selected filter.</p>
            </div>
          )}
        </div>
      </section>

      {/* Trending Topics */}
      {selectedChannelSentiment.trending_topics && selectedChannelSentiment.trending_topics.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="text-green-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Trending Discussion Topics</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedChannelSentiment.trending_topics.map((topic, idx) => (
              <div
                key={idx}
                className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium"
              >
                {topic.topic || 'Unknown Topic'} <span className="text-green-600">({topic.mentions || 0})</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Comparison Insight Card Component
function ComparisonInsightCard({ insight }) {
  const impactStyles = {
    positive: {
      bg: "bg-green-50",
      border: "border-green-300",
      icon: "text-green-600",
      badge: "bg-green-600 text-white",
      arrow: ArrowUp
    },
    needs_improvement: {
      bg: "bg-amber-50",
      border: "border-amber-300",
      icon: "text-amber-600",
      badge: "bg-amber-600 text-white",
      arrow: ArrowDown
    },
    critical: {
      bg: "bg-red-50",
      border: "border-red-300",
      icon: "text-red-600",
      badge: "bg-red-600 text-white",
      arrow: ArrowDown
    }
  };

  const style = impactStyles[insight.impact] || impactStyles.needs_improvement;
  const ArrowIcon = style.arrow;

  return (
    <div className={`p-5 rounded-xl border-2 ${style.border} ${style.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-slate-900 text-lg flex-1">{insight.title}</h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-3 py-1.5 rounded-full ${style.badge} font-semibold flex items-center gap-1`}>
            <ArrowIcon size={14} />
            {insight.metric}
          </span>
        </div>
      </div>
      
      <p className="text-slate-700 mb-3 leading-relaxed">{insight.description}</p>
      
      <div className="p-4 bg-white rounded-lg border border-slate-200">
        <div className="flex items-start gap-2">
          <Target className={`${style.icon} flex-shrink-0 mt-0.5`} size={18} />
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Action Step:</p>
            <p className="text-sm text-slate-700">{insight.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SentimentCard({ icon: Icon, label, percentage, count, color }) {
  const colors = {
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "text-green-600", bold: "text-green-900" },
    slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", icon: "text-slate-600", bold: "text-slate-900" },
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "text-red-600", bold: "text-red-900" },
  };

  const c = colors[color];

  return (
    <div className={`p-5 rounded-xl border ${c.border} ${c.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={c.icon} size={24} />
        <p className={`font-medium ${c.bold}`}>{label}</p>
      </div>
      <p className={`text-3xl font-bold ${c.bold} mb-1`}>{percentage}%</p>
      <p className={`text-sm ${c.text}`}>{count} comments</p>
    </div>
  );
}

function FilterButton({ label, active, onClick, count, color = "indigo" }) {
  const colors = {
    indigo: active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
    green: active ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200",
    slate: active ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
    red: active ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${colors[color]}`}
    >
      {label} ({count})
    </button>
  );
}

function SimpleInsightCard({ insight }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-purple-200">
      <h3 className="font-semibold text-slate-900 mb-2">{insight.title}</h3>
      <p className="text-sm text-slate-700 mb-3">{insight.description}</p>
      <div className="p-3 bg-purple-50 rounded-lg">
        <p className="text-xs font-medium text-purple-900 mb-1">💡 What to do:</p>
        <p className="text-sm text-purple-800">{insight.action}</p>
      </div>
    </div>
  );
}

// ==================== TRENDING CONTENT VIEW ====================
function TrendingContentView({ trendingData, loading }) {
  const [viewType, setViewType] = useState("grid");

  if (!trendingData && !loading) {
    return (
      <EmptyState
        icon={TrendingUpIcon}
        title="Trending Content Analyzer"
        description="Discover what's working best and why certain videos perform better."
        features={[
          "See your top-performing videos by views and engagement",
          "Identify successful title patterns",
          "Find trending topics that resonate",
          "Get insights on what makes content succeed"
        ]}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Analyzing trending content..." />;
  }

  if (!trendingData || typeof trendingData !== 'object') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
        <div className="text-center text-slate-600">
          <AlertCircle className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">No Trending Data</div>
          <div className="text-sm text-slate-500">Unable to analyze trending content.</div>
        </div>
      </div>
    );
  }

  const formatNum = (n) => (Number(n) || 0).toLocaleString();
  const channelMetrics = trendingData.channel_metrics || {};
  const topByViews = trendingData.top_by_views || [];
  const topByEngagement = trendingData.top_by_engagement || [];
  const insights = trendingData.insights || [];
  const titlePatterns = trendingData.title_patterns || {};
  const trendingTopics = trendingData.trending_topics || [];

  return (
    <div className="space-y-6">
      {/* Channel Metrics Overview */}
      {Object.keys(channelMetrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SimpleMetricCard
            icon={Video}
            label="Videos Analyzed"
            value={channelMetrics.total_videos_analyzed || 0}
            color="indigo"
          />
          <SimpleMetricCard
            icon={Eye}
            label="Total Views"
            value={formatNum(channelMetrics.total_views || 0)}
            color="blue"
          />
          <SimpleMetricCard
            icon={ThumbsUp}
            label="Avg Views/Video"
            value={formatNum(channelMetrics.avg_views_per_video || 0)}
            color="green"
          />
          <SimpleMetricCard
            icon={TrendingUp}
            label="Above Average"
            value={`${channelMetrics.above_average_count || 0}/${channelMetrics.total_videos_analyzed || 0}`}
            subtitle={channelMetrics.total_videos_analyzed > 0 ? `${(((channelMetrics.above_average_count || 0) / channelMetrics.total_videos_analyzed) * 100).toFixed(0)}% consistency` : '0%'}
            color="purple"
          />
        </div>
      )}

      {/* Top Performers */}
      <TopPerformersSection trendingData={trendingData} />

      {/* Insights */}
      {insights.length > 0 && (
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-amber-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">💡 What's Working</h2>
          </div>

          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <SimpleRecommendationCard key={idx} recommendation={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Title Patterns & Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(titlePatterns).length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="text-purple-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-900">Title Patterns</h2>
            </div>

            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(titlePatterns)
                      .filter(([_, count]) => count > 0)
                      .map(([pattern, count]) => ({
                        name: pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        value: count
                      }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {Object.entries(titlePatterns)
                      .filter(([_, count]) => count > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </section>
        )}

        {trendingTopics.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="text-green-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-900">Hot Topics</h2>
            </div>

            <div className="space-y-2">
              {trendingTopics.slice(0, 10).map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white bg-green-600 px-2 py-1 rounded">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-green-900">{topic.topic || 'Unknown'}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-700">{topic.count || 0}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TopPerformersSection({ trendingData }) {
  const [viewType, setViewType] = useState("views");
  const topByViews = trendingData?.top_by_views || [];
  const topByEngagement = trendingData?.top_by_engagement || [];
  const videos = viewType === "views" ? topByViews : topByEngagement;

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Video className="mx-auto mb-2" size={32} />
        <p>No video data available.</p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="text-amber-500" size={20} />
          <h2 className="text-lg font-semibold text-slate-900">Top Performers</h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewType("views")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewType === "views" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            By Views
          </button>
          <button
            onClick={() => setViewType("engagement")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewType === "engagement" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            By Engagement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video, idx) => (
          <VideoCard key={idx} video={video} rank={idx + 1} />
        ))}
      </div>
    </section>
  );
}

function VideoCard({ video, rank }) {
  const formatNum = (n) => (Number(n) || 0).toLocaleString();

  if (!video || typeof video !== 'object') {
    return <div className="p-4 rounded-xl border border-slate-200 bg-white">
      <div className="text-sm text-slate-500">Video data unavailable</div>
    </div>;
  }

  const videoId = video.id || video.video_id || '';
  const videoTitle = video.title || 'Untitled';
  const videoViews = video.views || 0;
  const videoLikes = video.likes || 0;
  const videoComments = video.comments || 0;
  const videoEngagement = video.engagement_rate || 0;
  const videoThumbnail = video.thumbnail || '';

  return (
    <div
      className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={() => {
        if (videoId) window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
      }}
    >
      <div className="flex gap-3">
        {videoThumbnail && (
          <img src={videoThumbnail} alt={videoTitle} className="w-32 h-20 object-cover rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs font-bold text-white bg-indigo-600 px-2 py-1 rounded">#{rank}</span>
            <h4 className="text-sm font-medium text-slate-900 line-clamp-2 flex-1">{videoTitle}</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-slate-600">
              <Eye size={12} />
              <span>{formatNum(videoViews)}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-600">
              <ThumbsUp size={12} />
              <span>{formatNum(videoLikes)}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-600">
              <MessageSquare size={12} />
              <span>{formatNum(videoComments)}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <Zap size={12} />
              <span>{(videoEngagement * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== HELPER COMPONENTS ====================

function TabButton({ icon: Icon, label, tab, activeTab, onClick }) {
  const isActive = activeTab === tab;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        isActive
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={18} />
      <span className="flex-1 text-left text-sm">{label}</span>
    </button>
  );
}

function SimpleMetricCard({ icon: Icon, label, value, subtitle, color = "indigo" }) {
  const colors = {
    indigo: { bg: "bg-indigo-100", icon: "text-indigo-600", text: "text-indigo-900" },
    blue: { bg: "bg-blue-100", icon: "text-blue-600", text: "text-blue-900" },
    green: { bg: "bg-green-100", icon: "text-green-600", text: "text-green-900" },
    purple: { bg: "bg-purple-100", icon: "text-purple-600", text: "text-purple-900" },
  };

  const c = colors[color];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={c.icon} size={20} />
        </div>
        <p className="text-sm text-slate-600">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function SimpleRecommendationCard({ recommendation }) {
  const impactColors = {
    critical: { border: "border-red-300", bg: "bg-red-50", badge: "bg-red-100 text-red-700" },
    high: { border: "border-amber-300", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700" },
    medium: { border: "border-blue-300", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
    low: { border: "border-green-300", bg: "bg-green-50", badge: "bg-green-100 text-green-700" },
  };

  const colors = impactColors[recommendation.impact] || impactColors.medium;

  return (
    <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-900 flex-1">{recommendation.title}</h3>
        {recommendation.impact && (
          <span className={`text-xs px-2 py-1 rounded-full ${colors.badge} font-medium ml-2`}>
            {recommendation.impact}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700 mb-3">{recommendation.description}</p>
      <div className="p-3 bg-white rounded-lg border border-slate-200">
        <p className="text-xs font-medium text-slate-900 mb-1">✅ Action Step:</p>
        <p className="text-sm text-slate-700">{recommendation.action}</p>
      </div>
    </div>
  );
}

function ImprovedRecommendationCard({ recommendation }) {
  const impactColors = {
    critical: { 
      gradient: "from-red-500 to-orange-500",
      bg: "bg-red-50", 
      border: "border-red-300",
      icon: "text-red-600"
    },
    high: { 
      gradient: "from-amber-500 to-yellow-500",
      bg: "bg-amber-50", 
      border: "border-amber-300",
      icon: "text-amber-600"
    },
    medium: { 
      gradient: "from-blue-500 to-indigo-500",
      bg: "bg-blue-50", 
      border: "border-blue-300",
      icon: "text-blue-600"
    },
    low: { 
      gradient: "from-green-500 to-emerald-500",
      bg: "bg-green-50", 
      border: "border-green-300",
      icon: "text-green-600"
    }
  };

  const colors = impactColors[recommendation.impact] || impactColors.medium;

  return (
    <div className={`p-5 rounded-xl border-2 ${colors.border} ${colors.bg} hover:shadow-lg transition-all`}>
      {/* Impact Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${colors.gradient} text-white text-xs font-bold`}>
          <Zap size={12} />
          {recommendation.impact.toUpperCase()} IMPACT
        </div>
        {recommendation.metric_improvement && (
          <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded-full border border-slate-200">
            {recommendation.metric_improvement}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-900 text-lg mb-2">
        {recommendation.title}
      </h3>

      {/* Description */}
      <p className="text-slate-700 text-sm mb-4 leading-relaxed">
        {recommendation.description}
      </p>

      {/* Action */}
      <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
        <div className="flex gap-2">
          <CheckCircle className={colors.icon} size={20} />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700 mb-1">
              ✅ What to Do:
            </p>
            <p className="text-sm text-slate-800 font-medium">
              {recommendation.action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactVideoCard({ video, rank, color = "indigo" }) {
  const formatNum = (n) => (Number(n) || 0).toLocaleString();
  
  const colors = {
    indigo: { border: "border-indigo-200", bg: "bg-indigo-50", badge: "bg-indigo-600" },
    green: { border: "border-green-200", bg: "bg-green-50", badge: "bg-green-600" }
  };

  const c = colors[color];

  if (!video || typeof video !== 'object') {
    return (
      <div className={`p-3 rounded-lg border ${c.border} ${c.bg}`}>
        <div className="text-sm text-slate-500">Video data unavailable</div>
      </div>
    );
  }

  const videoId = video.id || video.video_id || '';
  const videoTitle = video.title || 'Untitled Video';
  const videoViews = video.views || 0;
  const videoLikes = video.likes || 0;
  const videoEngagement = video.engagement || video.engagement_rate || 0;
  const videoThumbnail = video.thumbnail || '';

  return (
    <div
      className={`group p-3 rounded-lg border ${c.border} ${c.bg} hover:shadow-md transition-all cursor-pointer`}
      onClick={() => {
        if (videoId) {
          window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
        }
      }}
    >
      <div className="flex gap-3">
        {videoThumbnail && (
          <div className="relative flex-shrink-0">
            <img
              src={videoThumbnail}
              alt={videoTitle}
              className="w-24 h-16 object-cover rounded border border-slate-200"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className={`absolute top-1 left-1 text-xs font-bold text-white ${c.badge} px-2 py-0.5 rounded`}>
              #{rank}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-slate-900 line-clamp-2 mb-2">{videoTitle}</h4>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <Eye size={10} />
              <span>{formatNum(videoViews)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart size={10} />
              <span>{formatNum(videoLikes)}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <Zap size={10} />
              <span>{(videoEngagement * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, features }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
      <div className="text-center max-w-2xl mx-auto">
        <Icon className="mx-auto text-slate-300 mb-4" size={64} />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{description}</p>

        <div className="text-left space-y-3">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-indigo-600" size={16} />
              </div>
              <p className="text-sm text-slate-700">{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingState({ message }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  );
}
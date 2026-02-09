// IMPROVEMENTS MADE:
// 1. Replaced hexagonal radar chart with clear bar charts for Quality Metrics
// 2. Added explanatory text for Retention Heatmap with real-world analogies
// 3. Improved Viewer Engagement Segments with clearer visualization and explanations
// 4. Enhanced Competitor Gap Analysis with visual topic cards and better UI
// 5. Added educational tooltips and context throughout

import React, { useState, useMemo } from "react";
import { useAuth } from "../../core/context/AuthContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  TrendingUp,
  MessageSquare,
  Target,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  Calendar,
  BarChart3,
  Activity,
  Lightbulb,
  Play,
  TrendingDown,
  Filter,
  Search,
  UserPlus,
  UserMinus,
  Flame,
  ThumbsUp,
  Share2,
  Percent,
  Hash,
  FileText,
  Video,
  GitCompare,
  Smile,
  Meh,
  Frown,
  Info,
  Tag,
  TrendingUpIcon,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:5000";

// Helper function to convert engagement rate to understandable text
const getEngagementInsight = (engagementRate) => {
  const percentage = engagementRate * 100;
  
  if (percentage >= 8) {
    return {
      level: "Exceptional",
      description: "Outstanding audience connection",
      color: "#10b981",
      emoji: "🔥"
    };
  } else if (percentage >= 5) {
    return {
      level: "Excellent",
      description: "Very high engagement",
      color: "#3b82f6",
      emoji: "⭐"
    };
  } else if (percentage >= 3) {
    return {
      level: "Good",
      description: "Above average engagement",
      color: "#8b5cf6",
      emoji: "👍"
    };
  } else if (percentage >= 1.5) {
    return {
      level: "Fair",
      description: "Average engagement",
      color: "#f59e0b",
      emoji: "📊"
    };
  } else if (percentage >= 0.5) {
    return {
      level: "Low",
      description: "Below average engagement",
      color: "#f97316",
      emoji: "⚠️"
    };
  } else {
    return {
      level: "Very Low",
      description: "Needs improvement",
      color: "#ef4444",
      emoji: "🔻"
    };
  }
};

// Helper to format engagement rate display
const formatEngagementRate = (rate) => {
  const insight = getEngagementInsight(rate);
  return {
    percentage: (rate * 100).toFixed(2) + "%",
    insight: insight
  };
};

export default function EnhancedChannelAnalyzer() {
  const { user } = useAuth();

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
    return channels.map((c, idx) => ({
      key: c.url || String(idx),
      label: c.name
        ? `${c.name}${c.is_primary ? " (Primary)" : ""}`
        : `${c.url}${c.is_primary ? " (Primary)" : ""}`,
      url: c.url,
      is_primary: c.is_primary,
    }));
  }, [channels]);

  const [selectedKey, setSelectedKey] = useState(options[0]?.key || "");
  const [activeTab, setActiveTab] = useState("journey");
  
  // Competitor selection state
  const [analyzePrimaryOnly, setAnalyzePrimaryOnly] = useState(true);
  const [selectedCompetitors, setSelectedCompetitors] = useState([]);

  const [journeyData, setJourneyData] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [retentionData, setRetentionData] = useState(null);
  const [gapData, setGapData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get competitor channels (non-primary channels)
  const competitorChannels = useMemo(() => {
    return channels.filter(c => !c.is_primary);
  }, [channels]);

  const handleCompetitorToggle = (channelUrl) => {
    setSelectedCompetitors(prev => {
      if (prev.includes(channelUrl)) {
        return prev.filter(url => url !== channelUrl);
      } else {
        return [...prev, channelUrl];
      }
    });
  };

  const selectedUrl = useMemo(() => {
    if (analyzePrimaryOnly) {
      const primaryChannel = channels.find(c => c.is_primary);
      return primaryChannel?.url || "";
    } else {
      // Primary + selected competitors
      const primaryChannel = channels.find(c => c.is_primary);
      const urls = [primaryChannel?.url, ...selectedCompetitors].filter(Boolean);
      return urls.join(",");
    }
  }, [analyzePrimaryOnly, selectedCompetitors, channels]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");

    try {
      if (!selectedUrl) {
        setError("No channel selected.");
        return;
      }

      // Clear previous data
      setJourneyData(null);
      setQualityData(null);
      setRetentionData(null);
      setGapData(null);

      // Analyze entire channel (100 videos)
      const maxVideos = 100;

      if (activeTab === "journey") {
        const res = await fetch(
          `${API_BASE}/api/youtube/analyzer.audienceJourney?urls=${encodeURIComponent(selectedUrl)}&maxVideos=${maxVideos}`
        );
        if (!res.ok) throw new Error("Failed to fetch journey data");
        const data = await res.json();
        setJourneyData(data);
      } else if (activeTab === "quality") {
        const res = await fetch(
          `${API_BASE}/api/youtube/analyzer.engagementQuality?urls=${encodeURIComponent(selectedUrl)}&maxVideos=${maxVideos}&maxComments=50`
        );
        if (!res.ok) throw new Error("Failed to fetch quality data");
        const data = await res.json();
        setQualityData(data);
      } else if (activeTab === "retention") {
        const res = await fetch(
          `${API_BASE}/api/youtube/analyzer.retentionHeatmap?urls=${encodeURIComponent(selectedUrl)}&maxVideos=${maxVideos}`
        );
        if (!res.ok) throw new Error("Failed to fetch retention data");
        const data = await res.json();
        setRetentionData(data);
      } else if (activeTab === "gaps") {
        if (analyzePrimaryOnly || selectedCompetitors.length === 0) {
          setError("Gap analysis requires comparing with at least one competitor. Please select competitors to compare.");
          return;
        }
        const res = await fetch(
          `${API_BASE}/api/youtube/analyzer.competitorGaps?urls=${encodeURIComponent(selectedUrl)}&maxVideos=${maxVideos}`
        );
        if (!res.ok) throw new Error("Failed to fetch gap data");
        const data = await res.json();
        setGapData(data);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err?.message || "Failed to fetch analysis");
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
            Advanced Channel Analytics
          </h1>
          <p className="text-slate-600">
            Deep insights into audience behavior, engagement quality, retention patterns, and competitive positioning.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-80 flex flex-col gap-4">
            {/* Tab Navigation with Explanations */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-700 px-4 py-2 mb-2">
                Analysis Tools
              </h2>
              <div className="space-y-1">
                <TabButtonWithInfo
                  icon={Users}
                  label="Audience Journey"
                  description="Track which videos attract subscribers and which cause viewers to leave"
                  tab="journey"
                  activeTab={activeTab}
                  onClick={() => setActiveTab("journey")}
                />
                <TabButtonWithInfo
                  icon={MessageSquare}
                  label="Engagement Quality"
                  description="Measure comment depth, viewer actions, and community strength beyond basic sentiment"
                  tab="quality"
                  activeTab={activeTab}
                  onClick={() => setActiveTab("quality")}
                />
                <TabButtonWithInfo
                  icon={Activity}
                  label="Retention Heatmap"
                  description="See exactly where viewers drop off and find your optimal video length"
                  tab="retention"
                  activeTab={activeTab}
                  onClick={() => setActiveTab("retention")}
                />
                <TabButtonWithInfo
                  icon={GitCompare}
                  label="Competitor Gaps"
                  description="Discover content opportunities you're missing and areas where you dominate"
                  tab="gaps"
                  activeTab={activeTab}
                  onClick={() => setActiveTab("gaps")}
                />
              </div>
            </div>

            {/* Analysis Options */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Analysis Options
              </h3>

              {/* Primary Only Toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={analyzePrimaryOnly}
                    onChange={(e) => {
                      setAnalyzePrimaryOnly(e.target.checked);
                      if (e.target.checked) {
                        setSelectedCompetitors([]);
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-900">Analyze Primary Channel Only</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Focus on your main channel without comparisons
                    </p>
                  </div>
                </label>
              </div>

              {/* Competitor Selection */}
              {!analyzePrimaryOnly && competitorChannels.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <label className="text-sm font-medium text-slate-700 block mb-3">
                    Compare With:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {competitorChannels.map((channel) => (
                      <label
                        key={channel.url}
                        className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompetitors.includes(channel.url)}
                          onChange={() => handleCompetitorToggle(channel.url)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-900 block truncate">
                            {channel.name || channel.url}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedCompetitors.length > 0 && (
                    <p className="text-xs text-indigo-600 mt-2 font-medium">
                      {selectedCompetitors.length} competitor{selectedCompetitors.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              {!analyzePrimaryOnly && competitorChannels.length === 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs text-amber-600">
                    Add competitor channels in your Business Profile to enable comparison analysis
                  </p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full mt-4 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing Entire Channel...
                  </span>
                ) : (
                  "Analyze Entire Channel"
                )}
              </button>

              <p className="text-xs text-slate-500 mt-2 text-center">
                Analyzes up to 100 most recent videos
              </p>

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "journey" && (
              <AudienceJourneyView data={journeyData} loading={loading} />
            )}
            {activeTab === "quality" && (
              <EngagementQualityView data={qualityData} loading={loading} />
            )}
            {activeTab === "retention" && (
              <RetentionHeatmapView data={retentionData} loading={loading} />
            )}
            {activeTab === "gaps" && (
              <CompetitorGapsView data={gapData} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== AUDIENCE JOURNEY VIEW ====================
function AudienceJourneyView({ data, loading }) {
  const [selectedChannel, setSelectedChannel] = useState(null);

  React.useEffect(() => {
    if (data?.channels && data.channels.length > 0 && !selectedChannel) {
      setSelectedChannel(data.channels[0]);
    }
  }, [data, selectedChannel]);

  if (!data && !loading) {
    return (
      <EmptyState
        icon={Users}
        title="Audience Journey Mapping"
        description="Understand which videos attract subscribers, which lose them, and which content sequences work best."
        features={[
          "Identify subscriber magnet videos",
          "Detect churn risk content",
          "Analyze viewer engagement segments",
          "Discover successful content sequences"
        ]}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Mapping audience journeys..." />;
  }

  if (!data || !data.channels || data.channels.length === 0) {
    return <NoDataState />;
  }

  const hasComparison = data.has_comparison;
  const comparisonInsights = data.comparison_insights || [];
  const channels = data.channels || [];

  return (
    <div className="space-y-6">
      {/* Comparison Insights */}
      {hasComparison && comparisonInsights.length > 0 && (
        <ComparisonInsightsSection insights={comparisonInsights} />
      )}

      {/* Channel Selector */}
      {channels.length > 1 && (
        <ChannelSelector
          channels={channels}
          selectedChannel={selectedChannel}
          onSelect={setSelectedChannel}
        />
      )}

      {selectedChannel && (
        <>
          {/* IMPROVED: Viewer Segments with better explanation */}
          <ViewerSegmentsSection channel={selectedChannel} />

          {/* Subscriber Magnets */}
          {selectedChannel.subscriber_magnets && selectedChannel.subscriber_magnets.length > 0 && (
            <SubscriberMagnetsSection magnets={selectedChannel.subscriber_magnets} />
          )}

          {/* Churn Risks */}
          {selectedChannel.churn_risks && selectedChannel.churn_risks.length > 0 && (
            <ChurnRisksSection risks={selectedChannel.churn_risks} />
          )}

          {/* Content Sequences */}
          {selectedChannel.content_sequences && selectedChannel.content_sequences.length > 0 && (
            <ContentSequencesSection sequences={selectedChannel.content_sequences} />
          )}

          {/* Individual Insights */}
          {selectedChannel.insights && selectedChannel.insights.length > 0 && (
            <InsightsSection insights={selectedChannel.insights} />
          )}
        </>
      )}
    </div>
  );
}

// IMPROVED: Better explanation and visualization of viewer segments
function ViewerSegmentsSection({ channel }) {
  const segments = channel.viewer_segments_percentages || {};
  
  const segmentData = [
    { 
      name: "Superfans", 
      value: segments.superfans || 0, 
      color: "#10b981", 
      icon: Flame,
      description: "Highly engaged viewers who interact with most of your content"
    },
    { 
      name: "Engaged", 
      value: segments.engaged || 0, 
      color: "#3b82f6", 
      icon: ThumbsUp,
      description: "Regular viewers who consistently watch and engage"
    },
    { 
      name: "Casual", 
      value: segments.casual || 0, 
      color: "#f59e0b", 
      icon: Eye,
      description: "Occasional viewers who watch but don't engage much"
    },
    { 
      name: "At Risk", 
      value: segments.at_risk || 0, 
      color: "#ef4444", 
      icon: AlertTriangle,
      description: "Viewers who rarely engage and may stop watching"
    },
  ];

  const totalCount = channel.viewer_segments || {};

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="text-indigo-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Viewer Engagement Segments</h2>
      </div>
      
      {/* Explanation Box */}
      <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-start gap-2">
          <Info size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-900">
            <strong>What this shows:</strong> Your audience is divided into 4 groups based on how they engage with your videos. 
            This helps you understand viewer loyalty and identify which content keeps people coming back.
          </div>
        </div>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {segmentData.map((segment) => {
          const Icon = segment.icon;
          return (
            <div 
              key={segment.name} 
              className="p-4 rounded-xl border-2 transition-all hover:shadow-md"
              style={{ 
                borderColor: segment.color + '40',
                backgroundColor: segment.color + '08'
              }}
            >
              <div className="flex items-center justify-center mb-3">
                <div 
                  className="p-3 rounded-full"
                  style={{ backgroundColor: segment.color + '20' }}
                >
                  <Icon size={24} style={{ color: segment.color }} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color: segment.color }}>
                  {segment.value.toFixed(1)}%
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-2">{segment.name}</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {segment.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Bar Chart */}
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={segmentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ value: 'Percentage of Videos', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip 
              formatter={(value) => `${value.toFixed(1)}%`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {segmentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Actionable Insight */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <strong className="text-slate-900">Growth Strategy:</strong> Aim for 30%+ Superfans and under 15% At Risk. 
            {segments.superfans > 30 
              ? " You're doing great! Keep creating the content that drives this loyalty."
              : segments.at_risk > segments.superfans
              ? " Focus on improving content quality - too many videos are losing viewer interest."
              : " Increase engagement by asking more questions and encouraging interaction in your videos."}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubscriberMagnetsSection({ magnets }) {
  return (
    <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="text-green-600" size={24} />
        <h2 className="text-xl font-bold text-slate-900">🎯 Subscriber Magnet Videos</h2>
      </div>
      <p className="text-sm text-green-800 mb-4">
        These videos have the highest potential to attract new subscribers based on high engagement + strong reach.
      </p>

      <div className="space-y-3">
        {magnets.slice(0, 5).map((magnet, idx) => (
          <MagnetVideoCard key={idx} video={magnet} rank={idx + 1} />
        ))}
      </div>
    </section>
  );
}

function MagnetVideoCard({ video, rank }) {
  const formatNum = (n) => (Number(n) || 0).toLocaleString();
  const engagementInfo = formatEngagementRate(video.engagement_rate);

  return (
    <div className="bg-white rounded-xl border border-green-200 p-4 hover:shadow-md transition-all cursor-pointer"
         onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}>
      <div className="flex gap-3">
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs font-bold bg-green-600 text-white px-2 py-1 rounded">
              #{rank}
            </span>
            <h4 className="text-sm font-medium text-slate-900 line-clamp-2 flex-1">
              {video.title}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Eye size={12} />
              <span>{formatNum(video.views)} views</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-700 font-bold">
              <Target size={12} />
              <span>Score: {video.subscriber_score}</span>
            </div>
          </div>

          <div 
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${engagementInfo.insight.color}20`, color: engagementInfo.insight.color }}
          >
            <span>{engagementInfo.insight.emoji}</span>
            <span>{engagementInfo.insight.level}</span>
            <span className="opacity-75">• {engagementInfo.percentage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChurnRisksSection({ risks }) {
  return (
    <section className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-6">
      <div className="flex items-center gap-2 mb-3">
        <UserMinus className="text-red-600" size={24} />
        <h2 className="text-xl font-bold text-slate-900">⚠️ Churn Risk Videos</h2>
      </div>
      <p className="text-sm text-red-800 mb-4">
        These videos may disappoint viewers - low engagement despite decent views suggests dissatisfaction.
      </p>

      <div className="space-y-3">
        {risks.slice(0, 5).map((risk, idx) => (
          <ChurnVideoCard key={idx} video={risk} rank={idx + 1} />
        ))}
      </div>
    </section>
  );
}

function ChurnVideoCard({ video, rank }) {
  const formatNum = (n) => (Number(n) || 0).toLocaleString();
  const engagementInfo = formatEngagementRate(video.engagement_rate);

  return (
    <div className="bg-white rounded-xl border border-red-200 p-4 hover:shadow-md transition-all cursor-pointer"
         onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}>
      <div className="flex gap-3">
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs font-bold bg-red-600 text-white px-2 py-1 rounded">
              Risk #{rank}
            </span>
            <h4 className="text-sm font-medium text-slate-900 line-clamp-2 flex-1">
              {video.title}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Eye size={12} />
              <span>{formatNum(video.views)} views</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-red-700 font-bold">
              <AlertTriangle size={12} />
              <span>Risk: {video.churn_risk_score.toFixed(1)}</span>
            </div>
          </div>

          <div 
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${engagementInfo.insight.color}20`, color: engagementInfo.insight.color }}
          >
            <TrendingDown size={12} />
            <span>{engagementInfo.insight.level}</span>
            <span className="opacity-75">• {engagementInfo.percentage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentSequencesSection({ sequences }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="text-purple-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Successful Content Sequences</h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        These content type sequences lead to better engagement when published back-to-back.
      </p>

      <div className="space-y-3">
        {sequences.map((seq, idx) => (
          <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-purple-600 text-white px-2 py-1 rounded">
                  #{idx + 1}
                </span>
                <span className="font-mono text-sm font-medium text-purple-900">
                  {seq.sequence}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-purple-700 font-semibold">
                  {(seq.avg_engagement * 100).toFixed(2)}% engagement
                </span>
                <span className="text-xs text-purple-600 ml-2">
                  ({seq.occurrences} times)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ==================== ENGAGEMENT QUALITY VIEW ====================
function EngagementQualityView({ data, loading }) {
  const [selectedChannel, setSelectedChannel] = useState(null);

  React.useEffect(() => {
    if (data?.channels && data.channels.length > 0 && !selectedChannel) {
      setSelectedChannel(data.channels[0]);
    }
  }, [data, selectedChannel]);

  if (!data && !loading) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Engagement Quality Analysis"
        description="Go beyond sentiment to measure comment depth, conversation quality, and community building."
        features={[
          "Measure comment depth and thoughtfulness",
          "Track question rates and curiosity",
          "Identify action-taking viewers",
          "Monitor community interaction levels"
        ]}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Analyzing engagement quality..." />;
  }

  if (!data || !data.channels || data.channels.length === 0) {
    return <NoDataState />;
  }

  const hasComparison = data.has_comparison;
  const comparisonInsights = data.comparison_insights || [];
  const channels = data.channels || [];

  return (
    <div className="space-y-6">
      {/* Comparison Insights */}
      {hasComparison && comparisonInsights.length > 0 && (
        <ComparisonInsightsSection insights={comparisonInsights} />
      )}

      {/* Channel Selector */}
      {channels.length > 1 && (
        <ChannelSelector
          channels={channels}
          selectedChannel={selectedChannel}
          onSelect={setSelectedChannel}
        />
      )}

      {selectedChannel && (
        <>
          {/* Sentiment Overview */}
          <SentimentOverviewSection 
            sentimentDistribution={selectedChannel.sentiment_distribution}
            sentimentCounts={selectedChannel.sentiment_counts}
            totalComments={selectedChannel.total_comments}
          />

          {/* Quality Score Overview */}
          <QualityScoreSection channel={selectedChannel} />

          {/* IMPROVED: Quality Metrics with clear bar charts */}
          <QualityMetricsBar metrics={selectedChannel.quality_metrics} />

          {/* Depth Distribution */}
          <DepthDistributionSection distribution={selectedChannel.depth_distribution} />

          {/* Top Quality Comments */}
          {selectedChannel.top_quality_comments && selectedChannel.top_quality_comments.length > 0 && (
            <TopQualityCommentsSection comments={selectedChannel.top_quality_comments} />
          )}

          {/* Categorized Comments by Sentiment */}
          {selectedChannel.categorized_comments && selectedChannel.categorized_comments.length > 0 && (
            <CategorizedCommentsSection comments={selectedChannel.categorized_comments} />
          )}

          {/* Insights */}
          {selectedChannel.insights && selectedChannel.insights.length > 0 && (
            <InsightsSection insights={selectedChannel.insights} />
          )}
        </>
      )}
    </div>
  );
}

function SentimentOverviewSection({ sentimentDistribution, sentimentCounts, totalComments }) {
  const sentimentData = [
    { 
      name: "Positive", 
      value: sentimentDistribution.positive || 0, 
      count: sentimentCounts.positive || 0,
      color: "#10b981",
      icon: Smile,
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    { 
      name: "Neutral", 
      value: sentimentDistribution.neutral || 0, 
      count: sentimentCounts.neutral || 0,
      color: "#64748b",
      icon: Meh,
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200"
    },
    { 
      name: "Negative", 
      value: sentimentDistribution.negative || 0, 
      count: sentimentCounts.negative || 0,
      color: "#ef4444",
      icon: Frown,
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="text-blue-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Comment Sentiment Analysis</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {sentimentData.map((sentiment) => {
          const Icon = sentiment.icon;
          return (
            <div key={sentiment.name} className={`p-5 rounded-xl border ${sentiment.borderColor} ${sentiment.bgColor}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={24} style={{ color: sentiment.color }} />
                <p className="font-medium text-slate-900">{sentiment.name}</p>
              </div>
              <p className="text-3xl font-bold mb-1" style={{ color: sentiment.color }}>
                {sentiment.value.toFixed(1)}%
              </p>
              <p className="text-sm text-slate-600">{sentiment.count.toLocaleString()} comments</p>
            </div>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={sentimentData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {sentimentData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
}

function CategorizedCommentsSection({ comments }) {
  const [selectedSentiment, setSelectedSentiment] = useState("all");

  const filteredComments = selectedSentiment === "all" 
    ? comments 
    : comments.filter(c => c.sentiment === selectedSentiment);

  const sentimentColors = {
    positive: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800" },
    neutral: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-800" },
    negative: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800" }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="text-indigo-600" size={20} />
          <h2 className="text-lg font-semibold text-slate-900">Comments by Sentiment</h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSentiment("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedSentiment === "all" 
                ? "bg-indigo-600 text-white" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All ({comments.length})
          </button>
          <button
            onClick={() => setSelectedSentiment("positive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedSentiment === "positive" 
                ? "bg-green-600 text-white" 
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            Positive ({comments.filter(c => c.sentiment === "positive").length})
          </button>
          <button
            onClick={() => setSelectedSentiment("neutral")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedSentiment === "neutral" 
                ? "bg-slate-600 text-white" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Neutral ({comments.filter(c => c.sentiment === "neutral").length})
          </button>
          <button
            onClick={() => setSelectedSentiment("negative")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedSentiment === "negative" 
                ? "bg-red-600 text-white" 
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            Negative ({comments.filter(c => c.sentiment === "negative").length})
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredComments.length > 0 ? (
          filteredComments.slice(0, 50).map((comment, idx) => {
            const colors = sentimentColors[comment.sentiment] || sentimentColors.neutral;
            return (
              <div key={idx} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                <p className={`text-sm ${colors.text} mb-1`}>{comment.text}</p>
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
            <p>No comments found for this filter.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function QualityScoreSection({ channel }) {
  const score = channel.quality_metrics?.overall_quality_score || 0;
  const getScoreColor = (score) => {
    if (score >= 70) return { color: "#10b981", label: "Excellent" };
    if (score >= 50) return { color: "#3b82f6", label: "Good" };
    if (score >= 30) return { color: "#f59e0b", label: "Fair" };
    return { color: "#ef4444", label: "Needs Work" };
  };

  const scoreInfo = getScoreColor(score);

  return (
    <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overall Engagement Quality Score</h2>
        
        <div className="relative w-40 h-40 mx-auto mb-4">
          <svg className="transform -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="65"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="15"
            />
            <circle
              cx="80"
              cy="80"
              r="65"
              fill="none"
              stroke={scoreInfo.color}
              strokeWidth="15"
              strokeDasharray={`${(score / 100) * 408} 408`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold" style={{ color: scoreInfo.color }}>
              {score.toFixed(0)}
            </div>
            <div className="text-sm text-slate-600">/ 100</div>
          </div>
        </div>

        <div className="inline-block px-4 py-2 rounded-full text-white font-semibold"
             style={{ backgroundColor: scoreInfo.color }}>
          {scoreInfo.label}
        </div>

        <p className="text-sm text-slate-600 mt-4">
          Based on comment depth, questions, actions, and community interaction
        </p>
      </div>
    </section>
  );
}

// IMPROVED: Replaced radar chart with clear bar chart visualization
function QualityMetricsBar({ metrics }) {
  const metricData = [
    { 
      name: "Comment Depth", 
      value: metrics.avg_comment_length,
      max: 50,
      description: "Average words per comment",
      color: "#3b82f6",
      icon: FileText
    },
    { 
      name: "Questions Asked", 
      value: metrics.question_rate,
      max: 100,
      description: "% of comments asking questions",
      color: "#10b981",
      icon: MessageCircle
    },
    { 
      name: "Action Takers", 
      value: metrics.action_rate,
      max: 100,
      description: "% mentioning they took action",
      color: "#f59e0b",
      icon: Zap
    },
    { 
      name: "Community Interaction", 
      value: metrics.community_rate,
      max: 100,
      description: "% engaging with other viewers",
      color: "#8b5cf6",
      icon: Users
    },
    { 
      name: "Meaningful Content", 
      value: metrics.meaningful_rate,
      max: 100,
      description: "% of non-spam comments",
      color: "#06b6d4",
      icon: CheckCircle
    }
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="text-blue-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Quality Metrics Breakdown</h2>
      </div>
      <p className="text-sm text-slate-600 mb-6">
        These metrics measure the depth and quality of your audience engagement beyond simple like counts
      </p>

      <div className="space-y-5">
        {metricData.map((metric) => {
          const Icon = metric.icon;
          const percentage = (metric.value / metric.max) * 100;
          
          return (
            <div key={metric.name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} style={{ color: metric.color }} />
                  <span className="text-sm font-medium text-slate-900">{metric.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold" style={{ color: metric.color }}>
                    {metric.name === "Comment Depth" 
                      ? metric.value.toFixed(1) 
                      : `${metric.value.toFixed(1)}%`}
                  </span>
                </div>
              </div>
              
              <div className="mb-1">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, percentage)}%`,
                      backgroundColor: metric.color
                    }}
                  />
                </div>
              </div>
              
              <p className="text-xs text-slate-500">{metric.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>💡 What this means:</strong> Higher scores indicate viewers are deeply engaged, 
          asking thoughtful questions, taking action on your advice, and building community with each other.
        </p>
      </div>
    </section>
  );
}

function DepthDistributionSection({ distribution }) {
  const depthData = [
    { name: "Shallow (1-5 words)", value: distribution.shallow || 0, color: "#ef4444" },
    { name: "Moderate (6-15 words)", value: distribution.moderate || 0, color: "#f59e0b" },
    { name: "Deep (15+ words)", value: distribution.deep || 0, color: "#10b981" },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-slate-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Comment Depth Distribution</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {depthData.map((item) => (
          <div key={item.name} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${item.color}15` }}>
            <div className="text-3xl font-bold mb-1" style={{ color: item.color }}>
              {item.value.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600">{item.name}</div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={depthData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {depthData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
}

function TopQualityCommentsSection({ comments }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="text-amber-500" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Top Quality Comments</h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        The most thoughtful and detailed comments from your audience.
      </p>

      <div className="space-y-3">
        {comments.map((comment, idx) => (
          <div key={idx} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold bg-amber-600 text-white px-2 py-1 rounded flex-shrink-0">
                {comment.word_count} words
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 mb-2">{comment.text}</p>
                <p className="text-xs text-slate-500 truncate">
                  Video: {comment.video_title}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ==================== RETENTION HEATMAP VIEW ====================
function RetentionHeatmapView({ data, loading }) {
  const [selectedChannel, setSelectedChannel] = useState(null);

  React.useEffect(() => {
    if (data?.channels && data.channels.length > 0 && !selectedChannel) {
      setSelectedChannel(data.channels[0]);
    }
  }, [data, selectedChannel]);

  if (!data && !loading) {
    return (
      <EmptyState
        icon={Activity}
        title="Audience Retention Heatmap"
        description="Discover where viewers drop off and identify your golden retention window."
        features={[
          "See retention patterns across video sections",
          "Find your optimal video length",
          "Identify intro effectiveness",
          "Analyze successful pacing patterns"
        ]}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Analyzing retention patterns..." />;
  }

  if (!data || !data.channels || data.channels.length === 0) {
    return <NoDataState />;
  }

  const hasComparison = data.has_comparison;
  const comparisonInsights = data.comparison_insights || [];
  const channels = data.channels || [];

  return (
    <div className="space-y-6">
      {/* Comparison Insights */}
      {hasComparison && comparisonInsights.length > 0 && (
        <ComparisonInsightsSection insights={comparisonInsights} />
      )}

      {/* Channel Selector */}
      {channels.length > 1 && (
        <ChannelSelector
          channels={channels}
          selectedChannel={selectedChannel}
          onSelect={setSelectedChannel}
        />
      )}

      {selectedChannel && (
        <>
          {/* IMPROVED: Retention Heatmap with better explanation */}
          <RetentionHeatmapSection heatmap={selectedChannel.retention_heatmap} />

          {/* Golden Window */}
          {selectedChannel.golden_window && selectedChannel.golden_window.metrics && (
            <GoldenWindowSection golden={selectedChannel.golden_window} />
          )}

          {/* Duration Performance */}
          {selectedChannel.duration_performance && (
            <DurationPerformanceSection performance={selectedChannel.duration_performance} />
          )}

          {/* Insights */}
          {selectedChannel.insights && selectedChannel.insights.length > 0 && (
            <InsightsSection insights={selectedChannel.insights} />
          )}
        </>
      )}
    </div>
  );
}

// IMPROVED: Better explanation of retention patterns
function RetentionHeatmapSection({ heatmap }) {
  const getZoneColor = (retention) => {
    if (retention >= 70) return "#10b981";
    if (retention >= 50) return "#3b82f6";
    if (retention >= 30) return "#f59e0b";
    return "#ef4444";
  };

  const getZoneEmoji = (retention) => {
    if (retention >= 70) return "🔥";
    if (retention >= 50) return "✅";
    if (retention >= 30) return "⚠️";
    return "🔻";
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="text-blue-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Retention Heatmap</h2>
      </div>

      {/* Explanation Box */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <strong>How to read this:</strong> Each zone shows what percentage of your videos keep viewers engaged 
            through that section. Think of it like a funnel - if 93% start strong (Intro) but only 31% make it 
            to the middle, you're losing viewers during the early section. Higher percentages = better retention.
          </div>
        </div>
      </div>

      {/* Visual Representation */}
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={heatmap}>
          <defs>
            <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="zone" 
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{ value: 'Retention %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
            domain={[0, 100]}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip 
            formatter={(value) => `${value.toFixed(1)}% of videos`}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Area
            type="monotone"
            dataKey="retention"
            stroke="#4f46e5"
            strokeWidth={2}
            fill="url(#retentionGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Zone Breakdown Cards */}
      <div className="grid grid-cols-5 gap-2 mt-6">
        {heatmap.map((zone, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border-2 transition-all hover:shadow-lg"
            style={{ 
              borderColor: `${getZoneColor(zone.retention)}40`,
              backgroundColor: `${getZoneColor(zone.retention)}08`
            }}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{getZoneEmoji(zone.retention)}</div>
              <div className="text-xs font-medium text-slate-700 mb-2">{zone.zone}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: getZoneColor(zone.retention) }}>
                {zone.retention.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500">
                of videos retain here
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-world analogy */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <strong className="text-slate-900">Real-world example:</strong> Imagine 100 people walk into a store (Intro). 
            If only 59 make it past the entrance area (Early), 31 reach the middle aisles (Middle), 13 get to the back 
            (Late), and just 4 make it to checkout (Outro), you'd know your entrance and early store layout need work!
          </div>
        </div>
      </div>
    </section>
  );
}

function GoldenWindowSection({ golden }) {
  return (
    <section className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border-2 border-amber-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="text-amber-600" size={24} />
        <h2 className="text-xl font-bold text-slate-900">🎯 Your Golden Retention Window</h2>
      </div>

      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-amber-600 mb-2">
          {golden.duration_label}
        </div>
        <p className="text-slate-700">
          Videos in this length get the best engagement and retention
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-amber-200 text-center">
          <div className="text-2xl font-bold text-amber-600 mb-1">
            {(golden.metrics.avg_engagement * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-slate-600">Avg Engagement</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-amber-200 text-center">
          <div className="text-2xl font-bold text-amber-600 mb-1">
            {golden.metrics.avg_views.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600">Avg Views</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-amber-200 text-center">
          <div className="text-2xl font-bold text-amber-600 mb-1">
            {golden.metrics.video_count}
          </div>
          <div className="text-xs text-slate-600">Videos</div>
        </div>
      </div>
    </section>
  );
}

function DurationPerformanceSection({ performance }) {
  const durationData = Object.entries(performance).map(([key, data]) => {
    const labels = {
      ultra_short: "< 3 min",
      short: "3-8 min",
      medium: "8-15 min",
      long: "15-30 min",
      very_long: "> 30 min"
    };

    return {
      duration: labels[key] || key,
      engagement: data.avg_engagement * 100,
      views: data.avg_views,
      count: data.video_count
    };
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-purple-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Performance by Video Length</h2>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={durationData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="duration" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: 'Engagement %', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
          <Bar dataKey="engagement" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

// ==================== COMPETITOR GAPS VIEW ====================
function CompetitorGapsView({ data, loading }) {
  if (!data && !loading) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Competitor Gap Analysis"
        description="Identify what competitors do that you don't, and vice versa. Find opportunities and threats."
        features={[
          "Discover untapped content topics",
          "Identify posting frequency gaps",
          "Find format opportunities",
          "Analyze competitive advantages"
        ]}
      />
    );
  }

  if (loading) {
    return <LoadingState message="Analyzing competitive gaps..." />;
  }

  if (!data) {
    return <NoDataState />;
  }

  const primary = data.primary_channel;
  const competitors = data.competitors_summary || [];
  const contentGaps = data.content_gaps || [];
  const uniqueTopics = data.your_unique_topics || [];
  const missingFormats = data.missing_content_types || [];
  const frequencyComparison = data.frequency_comparison;
  const performanceComparison = data.performance_comparison;
  const gapInsights = data.gap_insights || [];
  const opportunities = data.opportunities || [];

  return (
    <div className="space-y-6">
      {/* Gap Insights */}
      {gapInsights.length > 0 && (
        <section className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">⚠️ Competitive Gaps & Threats</h2>
          </div>

          <div className="space-y-3">
            {gapInsights.map((insight, idx) => (
              <GapInsightCard key={idx} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-green-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">✅ Your Competitive Advantages</h2>
          </div>

          <div className="space-y-3">
            {opportunities.map((opp, idx) => (
              <OpportunityCard key={idx} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* IMPROVED: Content Gaps with visual topic cards */}
      {contentGaps.length > 0 && (
        <ContentGapsSection gaps={contentGaps} />
      )}

      {/* Your Unique Topics */}
      {uniqueTopics.length > 0 && (
        <UniqueTopicsSection topics={uniqueTopics} />
      )}

      {/* Performance Comparison */}
      <PerformanceComparisonSection
        primary={primary}
        competitors={competitors}
        performanceComparison={performanceComparison}
        frequencyComparison={frequencyComparison}
      />
    </div>
  );
}

function GapInsightCard({ insight }) {
  const impactColors = {
    critical: { bg: "bg-red-50", border: "border-red-300", badge: "bg-red-600" },
    high: { bg: "bg-orange-50", border: "border-orange-300", badge: "bg-orange-600" },
    medium: { bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-600" },
  };

  const colors = impactColors[insight.impact] || impactColors.medium;

  return (
    <div className={`p-5 rounded-xl border-2 ${colors.border} ${colors.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-slate-900 text-lg flex-1">{insight.title}</h3>
        <span className={`text-xs px-3 py-1.5 rounded-full text-white font-semibold ${colors.badge}`}>
          {insight.impact.toUpperCase()}
        </span>
      </div>

      <p className="text-slate-700 mb-3">{insight.description}</p>

      {insight.opportunity_size && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-1">Opportunity Size:</p>
          <p className="text-sm font-bold text-slate-900">{insight.opportunity_size}</p>
        </div>
      )}

      <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
        <div className="flex items-start gap-2">
          <Target className="text-indigo-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Action Required:</p>
            <p className="text-sm text-slate-700 font-medium">{insight.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity }) {
  return (
    <div className="p-5 rounded-xl border-2 border-green-300 bg-green-50">
      <h3 className="font-bold text-slate-900 text-lg mb-2">{opportunity.title}</h3>
      <p className="text-slate-700 mb-3">{opportunity.description}</p>

      <div className="p-4 bg-white rounded-lg border-2 border-green-200">
        <div className="flex items-start gap-2">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1">How to Leverage:</p>
            <p className="text-sm text-slate-700 font-medium">{opportunity.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// IMPROVED: Visual topic cards instead of plain list
function ContentGapsSection({ gaps }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Search className="text-purple-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">High-Value Content Gaps</h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Topics competitors cover successfully that you're missing - ranked by opportunity size.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gaps.map((gap, idx) => (
          <div 
            key={idx} 
            className="group p-5 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            {/* Topic Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={16} className="text-purple-600" />
                  <h4 className="font-bold text-purple-900 capitalize text-lg">
                    {gap.topic}
                  </h4>
                </div>
                <p className="text-xs text-purple-700 font-medium">
                  Competitor: {gap.competitor}
                </p>
              </div>
              <div className="text-right ml-2">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-bold">
                  <Hash size={12} />
                  {idx + 1}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 bg-white rounded-lg border border-purple-200">
                <div className="text-xs text-slate-600 mb-1">Videos</div>
                <div className="text-xl font-bold text-purple-900">{gap.frequency}</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-purple-200">
                <div className="text-xs text-slate-600 mb-1">Engagement</div>
                <div className="text-xl font-bold text-purple-900">
                  {(gap.engagement * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Opportunity Indicator */}
            <div className="flex items-center gap-2 p-2 bg-purple-600 text-white rounded-lg text-xs font-semibold">
              <TrendingUpIcon size={14} />
              <span>High Opportunity - Untapped Audience</span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Action */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-900">
            <strong>Action Plan:</strong> Start with the top 3 gaps. Create 2-3 videos for each topic over 
            the next month to capture this proven audience demand.
          </div>
        </div>
      </div>
    </section>
  );
}

function UniqueTopicsSection({ topics }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="text-green-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Your Unique Topics (Competitive Moat)</h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Content you cover that competitors don't - your differentiation.
      </p>

      <div className="flex flex-wrap gap-2">
        {topics.map((topic, idx) => (
          <div key={idx} className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
            {topic.topic} <span className="text-green-600 ml-1">({topic.frequency})</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PerformanceComparisonSection({ primary, competitors, performanceComparison, frequencyComparison }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-blue-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-900">Performance Comparison</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <ComparisonMetric
          label="Your Engagement"
          value={`${(performanceComparison.your_engagement * 100).toFixed(2)}%`}
          comparison={performanceComparison.engagement_gap > 0 ? "ahead" : "behind"}
          icon={TrendingUp}
        />
        <ComparisonMetric
          label="Competitor Avg"
          value={`${(performanceComparison.competitor_avg_engagement * 100).toFixed(2)}%`}
          comparison="baseline"
          icon={BarChart3}
        />
        <ComparisonMetric
          label="Your Avg Views"
          value={performanceComparison.your_views.toLocaleString()}
          comparison={performanceComparison.views_gap > 0 ? "ahead" : "behind"}
          icon={Eye}
        />
        <ComparisonMetric
          label="Posting Frequency"
          value={`${frequencyComparison.your_videos_per_month.toFixed(1)}/mo`}
          comparison={frequencyComparison.gap_days < 0 ? "ahead" : "behind"}
          icon={Calendar}
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="font-semibold text-slate-900 mb-3">Competitor Breakdown</h3>
        <div className="space-y-2">
          {competitors.map((comp, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium text-slate-900">{comp.name}</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-600">
                  {(comp.avg_engagement * 100).toFixed(2)}% eng
                </span>
                <span className="text-slate-600">
                  {comp.avg_views.toLocaleString()} views
                </span>
                <span className="text-slate-600">
                  {comp.videos_per_month.toFixed(1)}/mo
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonMetric({ label, value, comparison, icon: Icon }) {
  const colors = {
    ahead: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: "text-green-600" },
    behind: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "text-red-600" },
    baseline: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", icon: "text-slate-600" }
  };

  const color = colors[comparison];

  return (
    <div className={`p-4 rounded-lg border ${color.border} ${color.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color.icon} />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color.text}`}>{value}</div>
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================

function TabButtonWithInfo({ icon: Icon, label, description, tab, activeTab, onClick }) {
  const isActive = activeTab === tab;
  return (
    <button
      onClick={onClick}
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
          <div className={`text-sm font-medium mb-1 ${isActive ? "text-indigo-700" : "text-slate-900"}`}>
            {label}
          </div>
          <p className={`text-xs leading-relaxed ${isActive ? "text-indigo-600" : "text-slate-500"}`}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

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

function ComparisonInsightsSection({ insights }) {
  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-900">Cross-Channel Comparison</h2>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <ComparisonInsightCard key={idx} insight={insight} />
        ))}
      </div>
    </section>
  );
}

function ComparisonInsightCard({ insight }) {
  const impactStyles = {
    positive: {
      bg: "bg-green-50",
      border: "border-green-300",
      badge: "bg-green-600 text-white",
      arrow: ArrowUp
    },
    needs_improvement: {
      bg: "bg-amber-50",
      border: "border-amber-300",
      badge: "bg-amber-600 text-white",
      arrow: ArrowDown
    },
    critical: {
      bg: "bg-red-50",
      border: "border-red-300",
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
        <span className={`text-xs px-3 py-1.5 rounded-full ${style.badge} font-semibold flex items-center gap-1`}>
          <ArrowIcon size={14} />
          {insight.metric}
        </span>
      </div>

      <p className="text-slate-700 mb-3">{insight.description}</p>

      <div className="p-4 bg-white rounded-lg border border-slate-200">
        <div className="flex items-start gap-2">
          <Target className="text-indigo-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Action Step:</p>
            <p className="text-sm text-slate-700">{insight.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelSelector({ channels, selectedChannel, onSelect }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <label className="text-sm font-medium text-slate-700 block mb-3">
        Select Channel to View Details
      </label>
      <div className="flex gap-2 flex-wrap">
        {channels.map((channel, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(channel)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              selectedChannel?.channel_url === channel.channel_url
                ? "bg-indigo-600 text-white shadow-lg scale-105"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {channel.is_primary && <span className="mr-1.5">👤</span>}
            {channel.channel_name || `Channel ${idx + 1}`}
            {channel.is_primary && <span className="text-xs ml-1.5 opacity-75">(Primary)</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightsSection({ insights }) {
  return (
    <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-amber-600" size={24} />
        <h2 className="text-xl font-bold text-slate-900">💡 Key Insights</h2>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <InsightCard key={idx} insight={insight} />
        ))}
      </div>
    </section>
  );
}

function InsightCard({ insight }) {
  const impactColors = {
    critical: { border: "border-red-300", bg: "bg-red-50", badge: "bg-red-100 text-red-700" },
    high: { border: "border-amber-300", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700" },
    medium: { border: "border-blue-300", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
    positive: { border: "border-green-300", bg: "bg-green-50", badge: "bg-green-100 text-green-700" },
  };

  const colors = impactColors[insight.impact] || impactColors.medium;

  return (
    <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-900 flex-1">{insight.title}</h3>
        {insight.impact && (
          <span className={`text-xs px-2 py-1 rounded-full ${colors.badge} font-medium ml-2`}>
            {insight.impact}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700 mb-3">{insight.description}</p>
      <div className="p-3 bg-white rounded-lg border border-slate-200">
        <p className="text-xs font-medium text-slate-900 mb-1">✅ Action:</p>
        <p className="text-sm text-slate-700">{insight.action}</p>
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

function NoDataState() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
      <div className="text-center text-slate-600">
        <AlertTriangle className="mx-auto text-slate-300 mb-4" size={64} />
        <div className="font-medium text-slate-900 text-xl mb-2">No Data Available</div>
        <div className="text-sm text-slate-500">Unable to load analysis data. Please try again.</div>
      </div>
    </div>
  );
}
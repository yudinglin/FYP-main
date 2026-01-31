// frontend/src/pages/Business/PredictiveAnalysis.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "../../core/context/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  Users,
  Eye,
  BarChart3,
  Award,
  Zap,
  Star,
  ThumbsUp,
  Activity,
  PlayCircle,
  MessageSquare,
  Heart,
} from "lucide-react";

// Utility Functions
function formatNumber(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Helper function to get user-friendly quality description
function getQualityDescription(score) {
  if (score >= 80) {
    return {
      label: "Excellent",
      description: "Your audience loves your content and actively participates",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    };
  } else if (score >= 60) {
    return {
      label: "Very Good",
      description: "Strong audience interest with good interaction rates",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    };
  } else if (score >= 40) {
    return {
      label: "Good",
      description: "Healthy audience base with room to increase engagement",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    };
  } else if (score >= 20) {
    return {
      label: "Fair",
      description: "Building momentum - focus on increasing viewer interaction",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    };
  } else {
    return {
      label: "Needs Work",
      description: "Opportunity to grow by encouraging more audience participation",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    };
  }
}

// Helper function for engagement rate description
function getEngagementDescription(rate) {
  const percentage = rate * 100;
  if (percentage >= 10) {
    return {
      label: "Outstanding",
      description: "Exceptional audience engagement",
      color: "text-emerald-600"
    };
  } else if (percentage >= 5) {
    return {
      label: "Excellent",
      description: "Strong viewer interaction",
      color: "text-green-600"
    };
  } else if (percentage >= 3) {
    return {
      label: "Very Good",
      description: "Good audience participation",
      color: "text-blue-600"
    };
  } else if (percentage >= 1) {
    return {
      label: "Good",
      description: "Decent viewer engagement",
      color: "text-indigo-600"
    };
  } else if (percentage >= 0.1) {
    return {
      label: "Moderate",
      description: "Room for improvement",
      color: "text-orange-600"
    };
  } else {
    return {
      label: "Low",
      description: "Focus on boosting interaction",
      color: "text-slate-600"
    };
  }
}

const API_BASE = "http://localhost:5000";

const VIEWS = {
  OVERVIEW: "overview",
  GROWTH: "growth",
  COMPARISON: "comparison",
  ENGAGEMENT: "engagement",
};

export default function PredictiveAnalysis() {
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

  const primaryChannel = useMemo(() => {
    return channels.find((c) => c.is_primary) || channels[0] || null;
  }, [channels]);

  const competitorChannels = useMemo(() => {
    return channels.filter((c) => !c.is_primary);
  }, [channels]);

  // State
  const [selectedView, setSelectedView] = useState(VIEWS.OVERVIEW);
  const [selectedCompetitors, setSelectedCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [subscriberPredictions, setSubscriberPredictions] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // Initialize with all competitors selected
  useEffect(() => {
    if (competitorChannels.length > 0) {
      setSelectedCompetitors(competitorChannels.map((c) => c.url));
    }
  }, [competitorChannels]);

  // Auto-analyze when page loads if we have a primary channel
  useEffect(() => {
    if (primaryChannel && !analysisData && !loading) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryChannel?.url]);

  const handleAnalyze = async () => {
    if (!primaryChannel) {
      setError("Please set up your primary YouTube channel first in your Business Profile.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisData(null);

    try {
      const params = new URLSearchParams({
        primary_url: primaryChannel.url,
        campaign_budget: "1000",
        product_price: "50",
        max_videos: "25",
      });

      if (selectedCompetitors.length > 0) {
        params.append("competitor_urls", selectedCompetitors.join(","));
      }

      const res = await fetch(`${API_BASE}/api/youtube/business.analysis?${params}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to analyze channels");
      }

      const data = await res.json();
      
      data.competitors = data.competitors.map((comp) => ({
        ...comp,
        channel_name: competitorChannels.find((c) => c.url === comp.channel_url)?.name || "Competitor",
      }));
      
      setAnalysisData(data);
      fetchSubscriberPredictions([primaryChannel.url, ...selectedCompetitors]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriberPredictions = async (channelUrls) => {
    setPredictionsLoading(true);
    
    try {
      const predictions = await Promise.all(
        channelUrls.map(async (url) => {
          try {
            const q = encodeURIComponent(url);
            
            const r1 = await fetch(`${API_BASE}/api/youtube/channels.list?url=${q}`);
            if (!r1.ok) throw new Error("Failed to fetch channel data");
            const channelData = await r1.json();
            const currentSubscribers = channelData.subscriberCount ?? 0;

            const r2 = await fetch(
              `${API_BASE}/api/youtube/videos.correlationNetwork?url=${q}&maxVideos=50`
            );
            if (!r2.ok) throw new Error("Failed to fetch video data");
            const videoData = await r2.json();
            const rawMetrics = videoData.rawMetrics ?? videoData.nodes ?? [];
            
            if (rawMetrics.length === 0) {
              return { url, error: "No video data available" };
            }

            const videosWithDates = rawMetrics
              .filter(v => v.publishedAt)
              .map(v => ({
                ...v,
                publishedAt: new Date(v.publishedAt),
                engagement: (v.views > 0) ? ((v.likes || 0) + (v.comments || 0)) / v.views : 0,
              }))
              .sort((a, b) => a.publishedAt - b.publishedAt);

            if (videosWithDates.length === 0) {
              return { url, error: "No videos with publish dates" };
            }

            const history = [];
            const firstDate = new Date(videosWithDates[0].publishedAt);
            firstDate.setDate(1);
            const lastDate = new Date();
            
            const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                              (lastDate.getMonth() - firstDate.getMonth());
            
            const startSubscribers = Math.max(10, Math.floor(currentSubscribers * 0.15));
            const totalGrowth = currentSubscribers - startSubscribers;
            
            let currentDate = new Date(firstDate);
            let monthIndex = 0;
            
            while (currentDate <= lastDate) {
              const videosUpToDate = videosWithDates.filter(v => v.publishedAt <= currentDate);
              
              if (videosUpToDate.length > 0) {
                const avgEngagement = videosWithDates
                  .filter(v => v.publishedAt <= currentDate)
                  .reduce((sum, v) => sum + v.engagement, 0) / videosUpToDate.length;
                
                const totalViews = videosUpToDate.reduce((sum, v) => sum + (v.views || 0), 0);
                const progress = monthIndex / Math.max(1, monthsDiff);
                const engagementBoost = Math.min(avgEngagement * 2, 0.5);
                const viewsBoost = Math.min(totalViews / 5000000, 0.3);
                const growthCurve = Math.pow(progress, 0.7 + engagementBoost + viewsBoost);
                const estimatedSubscribers = Math.floor(
                  startSubscribers + (totalGrowth * growthCurve)
                );
                
                history.push({
                  date: currentDate.toISOString().split("T")[0],
                  subscribers: Math.min(estimatedSubscribers, currentSubscribers),
                });
              } else {
                history.push({
                  date: currentDate.toISOString().split("T")[0],
                  subscribers: startSubscribers,
                });
              }

              currentDate = new Date(currentDate);
              currentDate.setMonth(currentDate.getMonth() + 1);
              monthIndex++;
            }

            if (history.length > 0) {
              history[history.length - 1].subscribers = currentSubscribers;
            }

            const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
            const firstHistDate = new Date(sorted[0].date);
            const dataPoints = sorted.map((item) => {
              const date = new Date(item.date);
              const monthsSinceStart = (date - firstHistDate) / (1000 * 60 * 60 * 24 * 30.44);
              return {
                x: monthsSinceStart,
                y: item.subscribers,
              };
            });

            const n = dataPoints.length;
            const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
            const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
            const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
            const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

            const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const b = (sumY - m * sumX) / n;

            const lastPoint = dataPoints[dataPoints.length - 1];
            
            const future3 = lastPoint.x + 3;
            const future6 = lastPoint.x + 6;
            const future12 = lastPoint.x + 12;
            
            const predicted3Months = Math.round(m * future3 + b);
            const predicted6Months = Math.round(m * future6 + b);
            const predicted12Months = Math.round(m * future12 + b);
            
            const avgGrowthPerMonth = m;
            const totalGrowth6Months = predicted6Months - currentSubscribers;
            const growthRate = currentSubscribers > 0 ? (totalGrowth6Months / currentSubscribers) * 100 : 0;

            return {
              url,
              currentSubscribers,
              predicted3Months,
              predicted6Months,
              predicted12Months,
              avgGrowthPerMonth: Math.round(avgGrowthPerMonth),
              totalGrowth6Months,
              growthRate,
              history,
            };
          } catch (err) {
            console.error(`Error fetching predictions for ${url}:`, err);
            return { url, error: err.message };
          }
        })
      );

      setSubscriberPredictions(predictions);
    } catch (err) {
      console.error("Error fetching subscriber predictions:", err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const toggleCompetitor = (url) => {
    setSelectedCompetitors((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const MenuItem = ({ icon: Icon, label, view }) => (
    <button
      onClick={() => setSelectedView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        selectedView === view
          ? "bg-indigo-50 text-indigo-700 font-medium border-2 border-indigo-200"
          : "text-slate-600 hover:bg-slate-50 border-2 border-transparent"
      }`}
    >
      <Icon size={20} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Channel Performance Analysis
          </h1>
          <p className="text-slate-600">
            Understand your growth, compare with others, and plan your next steps
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex flex-col gap-4">
            {/* Navigation */}
            {analysisData && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                <h2 className="text-xs font-bold text-slate-600 px-4 py-2 mb-1 uppercase tracking-wide">
                  Analysis
                </h2>
                <div className="space-y-1">
                  <MenuItem icon={BarChart3} label="Overview" view={VIEWS.OVERVIEW} />
                  <MenuItem icon={TrendingUp} label="Growth Forecast" view={VIEWS.GROWTH} />
                  <MenuItem icon={Users} label="Comparison" view={VIEWS.COMPARISON} />
                  <MenuItem icon={ThumbsUp} label="Engagement" view={VIEWS.ENGAGEMENT} />
                </div>
              </div>
            )}

            {/* Channel Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Your Channels
              </h3>

              <div className="space-y-4">
                {/* Your Channel */}
                <div>
                  <label className="text-sm text-slate-600 block mb-2">Primary Channel</label>
                  {primaryChannel ? (
                    <div className="p-3 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-indigo-600" />
                        <span className="text-sm font-medium text-slate-900">{primaryChannel.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-sm text-amber-700">No channel set</span>
                    </div>
                  )}
                </div>

                {/* Competitors */}
                {competitorChannels.length > 0 && (
                  <div>
                    <label className="text-sm text-slate-600 block mb-2">Compare With</label>
                    <div className="space-y-2">
                      {competitorChannels.map((ch) => (
                        <label
                          key={ch.url}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCompetitors.includes(ch.url)}
                            onChange={() => toggleCompetitor(ch.url)}
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <span className="text-sm text-slate-700">{ch.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !primaryChannel}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Analyzing..." : analysisData ? "Refresh Analysis" : "Analyze Now"}
                </button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {analysisData && (
              <div className="bg-indigo-600 rounded-xl shadow-sm p-4 text-white">
                <div className="text-sm font-medium mb-3">Quick Stats</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Subscribers</span>
                    <span className="font-semibold">
                      {formatNumber(analysisData.primary_channel.subscribers)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Avg Views/Video</span>
                    <span className="font-semibold">
                      {formatNumber(analysisData.primary_channel.avg_views_per_video)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Engagement</span>
                    <span className="font-semibold">
                      {getEngagementDescription(analysisData.primary_channel.engagement_rate).label}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {error && !analysisData ? (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-rose-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Error</p>
                    <p className="text-sm text-rose-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : !analysisData ? (
              <EmptyState primaryChannel={primaryChannel} onAnalyze={handleAnalyze} loading={loading} />
            ) : (
              <>
                {selectedView === VIEWS.OVERVIEW && <OverviewView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.GROWTH && (
                  <GrowthView 
                    predictions={subscriberPredictions} 
                    loading={predictionsLoading}
                    primaryChannel={primaryChannel}
                    competitorChannels={competitorChannels}
                  />
                )}
                {selectedView === VIEWS.COMPARISON && <ComparisonView data={analysisData} primaryName={primaryChannel?.name} />}
                {selectedView === VIEWS.ENGAGEMENT && <EngagementView data={analysisData} primaryName={primaryChannel?.name} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ primaryChannel, onAnalyze, loading }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
      <div className="flex items-center justify-center h-72">
        <div className="text-center text-slate-600">
          <BarChart3 className="mx-auto text-slate-300 mb-4" size={64} />
          <div className="font-medium text-slate-900 text-xl mb-2">Ready to Analyze?</div>
          {primaryChannel ? (
            <>
              <div className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                Click "Analyze Now" to see insights about your channel: <strong>{primaryChannel.name}</strong>
              </div>
              <button
                onClick={onAnalyze}
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Analyze Now"}
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-500 max-w-md mx-auto">
              Please set up your primary YouTube channel in your Business Profile first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Overview View
function OverviewView({ data, primaryName }) {
  const primary = data.primary_channel;
  const hasCompetitors = data.competitors && data.competitors.length > 0;
  
  const qualityInfo = getQualityDescription(primary.audience_quality);
  const engagementInfo = getEngagementDescription(primary.engagement_rate);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-indigo-600" size={20} />
            <div className="text-sm font-medium text-slate-600">Total Subscribers</div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(primary.subscribers)}</div>
          <div className="text-xs text-slate-500">Your current audience size</div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="text-indigo-600" size={20} />
            <div className="text-sm font-medium text-slate-600">Avg Views per Video</div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{formatNumber(primary.avg_views_per_video)}</div>
          <div className="text-xs text-slate-500">How many people watch each video</div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="text-indigo-600" size={20} />
            <div className="text-sm font-medium text-slate-600">Audience Engagement</div>
          </div>
          <div className={`text-3xl font-bold mb-1 ${engagementInfo.color}`}>
            {engagementInfo.label}
          </div>
          <div className="text-xs text-slate-500">{engagementInfo.description}</div>
        </div>
      </div>

      {/* Audience Quality */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Star className="text-indigo-600" size={24} />
          Audience Quality Score
        </h3>
        
        <div className={`p-5 rounded-xl border-2 ${qualityInfo.borderColor} ${qualityInfo.bgColor}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className={`text-2xl font-bold mb-1 ${qualityInfo.color}`}>{qualityInfo.label}</div>
              <div className="text-sm text-slate-700">{qualityInfo.description}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-slate-900">{primary.audience_quality}</div>
              <div className="text-xs text-slate-500">out of 100</div>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
            <div 
              className={`h-2 rounded-full transition-all ${qualityInfo.color.replace('text-', 'bg-')}`}
              style={{ width: `${primary.audience_quality}%` }}
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <div className="text-xs font-semibold text-slate-700 mb-2">What this means:</div>
          <div className="text-sm text-slate-600">
            This score reflects how actively your audience engages with your content through likes, comments, and shares. 
            A higher score means your viewers are more invested in your content.
          </div>
        </div>
      </div>

      {/* Growth Status */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={24} />
          Growth Momentum
        </h3>
        
        <div className="p-5 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-semibold text-slate-700">Current Trend:</span>
              <span className={`ml-2 text-lg font-bold ${
                primary.growth_momentum.trend === "growing" ? "text-green-600" :
                primary.growth_momentum.trend === "declining" ? "text-red-600" :
                "text-blue-600"
              }`}>
                {primary.growth_momentum.trend === "growing" ? "Growing" :
                 primary.growth_momentum.trend === "declining" ? "Declining" :
                 "Stable"}
              </span>
            </div>
            {primary.growth_momentum.trend === "growing" && <TrendingUp className="text-green-600" size={32} />}
            {primary.growth_momentum.trend === "declining" && <TrendingDown className="text-red-600" size={32} />}
            {primary.growth_momentum.trend === "stable" && <Activity className="text-blue-600" size={32} />}
          </div>
          
          <p className="text-sm text-slate-700">
            {primary.growth_momentum.trend === "growing" 
              ? "Your recent videos are performing better than older content. Keep up the momentum!"
              : primary.growth_momentum.trend === "declining"
              ? "Recent videos are getting fewer views. Review what made your top videos successful and apply those lessons."
              : "Your channel shows consistent performance. Look for opportunities to boost growth through new content strategies."}
          </p>
        </div>
      </div>

      {/* Key Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="text-amber-500" size={24} />
            Recommended Actions
          </h3>
          <div className="space-y-3">
            {data.recommendations.slice(0, 3).map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Competitive Position */}
      {hasCompetitors && data.competitive_analysis && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Your Position vs Competitors</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RankCard
              title="Growth"
              rank={data.competitive_analysis.rankings.growth}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Audience Quality"
              rank={data.competitive_analysis.rankings.audience_quality}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Engagement"
              rank={data.competitive_analysis.rankings.audience_quality}
              total={data.competitive_analysis.rankings.total_channels}
            />
            <RankCard
              title="Consistency"
              rank={data.competitive_analysis.rankings.growth}
              total={data.competitive_analysis.rankings.total_channels}
            />
          </div>
        </div>
      )}

      {/* Strengths & Areas to Improve */}
      {data.competitive_analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.competitive_analysis.strengths.length > 0 && (
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-green-600" size={20} />
                <h4 className="font-bold text-slate-900">Your Strengths</h4>
              </div>
              <ul className="space-y-2">
                {data.competitive_analysis.strengths.map((s, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.competitive_analysis.weaknesses.length > 0 && (
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-orange-600" size={20} />
                <h4 className="font-bold text-slate-900">Areas to Improve</h4>
              </div>
              <ul className="space-y-2">
                {data.competitive_analysis.weaknesses.map((w, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Growth Predictions View
function GrowthView({ predictions, loading, primaryChannel, competitorChannels }) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <div className="text-slate-600">Building your growth forecast...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center text-slate-600">
            <Activity className="mx-auto text-slate-300 mb-4" size={64} />
            <div className="font-medium text-slate-900 text-xl mb-2">No Prediction Data</div>
            <div className="text-sm text-slate-500">Click "Analyze Now" to generate growth forecast</div>
          </div>
        </div>
      </div>
    );
  }

  const primaryPrediction = predictions.find(p => p.url === primaryChannel?.url);
  const validPredictions = predictions.filter(p => !p.error);

  const getChannelName = (url) => {
    if (url === primaryChannel?.url) return primaryChannel?.name || "Your Channel";
    const comp = competitorChannels.find(c => c.url === url);
    return comp?.name || "Competitor";
  };

  return (
    <div className="space-y-6">
      {/* Your Forecast */}
      {primaryPrediction && !primaryPrediction.error && (
        <div className="rounded-2xl bg-indigo-600 shadow-sm p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">{primaryChannel?.name || "Your Channel"}</h2>
          <p className="text-indigo-100 mb-6 text-sm">6-month subscriber growth forecast</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl p-5 bg-white/10 backdrop-blur border border-white/20">
              <div className="text-sm font-medium text-white/80 mb-2">Current Subscribers</div>
              <div className="text-3xl font-bold mb-1">{formatNumber(primaryPrediction.currentSubscribers)}</div>
              <div className="text-xs text-white/70">Today's count</div>
            </div>
            
            <div className="rounded-xl p-5 bg-white/20 border-2 border-white/40 backdrop-blur">
              <div className="text-sm font-medium text-white/90 mb-2">Expected in 6 Months</div>
              <div className="text-3xl font-bold mb-1">{formatNumber(primaryPrediction.predicted6Months)}</div>
              <div className="text-xs text-white/80">
                Growth of {formatNumber(primaryPrediction.totalGrowth6Months)} new subscribers
              </div>
            </div>
            
            <div className="rounded-xl p-5 bg-white/10 backdrop-blur border border-white/20">
              <div className="text-sm font-medium text-white/80 mb-2">Growth Rate</div>
              <div className="text-3xl font-bold mb-1">{primaryPrediction.growthRate.toFixed(1)}%</div>
              <div className="text-xs text-white/70">Percentage increase</div>
            </div>
          </div>

          {/* Chart */}
          {primaryPrediction.history && primaryPrediction.history.length > 0 && (
            <div className="mt-4 p-4 bg-white/10 rounded-xl backdrop-blur border border-white/20">
              <div className="text-sm font-semibold text-white/90 mb-3">Growth Trend (Last 12 Months)</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={primaryPrediction.history.slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '11px' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                      }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '11px' }}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => [formatNumber(value), "Subscribers"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="subscribers" 
                      stroke="#ffffff" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Understanding the Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Info className="text-indigo-600" size={20} />
            What This Forecast Means
          </h3>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Expected Monthly Growth:</strong> About {formatNumber(primaryPrediction.avgGrowthPerMonth)} new subscribers per month
            </p>
            <p>
              <strong>6-Month Target:</strong> Reach {formatNumber(primaryPrediction.predicted6Months)} total subscribers
            </p>
            <p>
              <strong>Growth Percentage:</strong> Your channel is projected to grow by {primaryPrediction.growthRate.toFixed(1)}% over the next 6 months
            </p>
            <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-xs text-slate-600">
                <strong>Note:</strong> This forecast is based on your current content performance and engagement patterns. 
                Consistent uploads and audience interaction can help you exceed this projection.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Target className="text-amber-500" size={20} />
            How to Reach This Goal
          </h3>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Stay Consistent:</strong> Upload videos on a regular schedule so your audience knows when to expect new content
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Boost Engagement:</strong> Reply to comments quickly and ask questions to encourage viewer participation
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Optimize Content:</strong> Use eye-catching thumbnails and clear titles that tell viewers what they'll learn
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Comparison with Competitors */}
      {validPredictions.length > 1 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Growth Comparison</h3>
          <p className="text-sm text-slate-600 mb-4">
            See how your projected growth compares to other channels
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={validPredictions.map(p => ({
                  name: getChannelName(p.url),
                  current: p.currentSubscribers,
                  predicted: p.predicted6Months,
                  isPrimary: p.url === primaryChannel?.url,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} style={{ fontSize: '12px' }} />
                <YAxis 
                  tickFormatter={(value) => formatNumber(value)}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  formatter={(value) => formatNumber(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="current" name="Current Subscribers" radius={[8, 8, 0, 0]}>
                  {validPredictions.map((_, index) => (
                    <Cell key={`cell-current-${index}`} fill={validPredictions[index].url === primaryChannel?.url ? "#4f46e5" : "#cbd5e1"} />
                  ))}
                </Bar>
                <Bar dataKey="predicted" name="Predicted in 6 Months" radius={[8, 8, 0, 0]}>
                  {validPredictions.map((_, index) => (
                    <Cell key={`cell-predicted-${index}`} fill={validPredictions[index].url === primaryChannel?.url ? "#6366f1" : "#e0e7ff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// Comparison View
function ComparisonView({ data, primaryName }) {
  const primary = data.primary_channel;
  const competitors = data.competitors;

  if (!competitors || competitors.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12">
        <div className="flex items-center justify-center h-72">
          <div className="text-center text-slate-600">
            <Users className="mx-auto text-slate-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Channels Selected</h3>
            <p className="text-slate-600">Select channels to compare from the sidebar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Your Channel Highlight */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Channel Comparison</h2>

        <div className="mb-6 p-5 rounded-xl bg-indigo-50 border-2 border-indigo-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{primaryName || "Your Channel"}</h3>
              <p className="text-sm text-slate-600">{formatNumber(primary.subscribers)} subscribers</p>
            </div>
            <div className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">Your Channel</div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wide">Comparing With</h3>
          <div className="space-y-3">
            {competitors.map((comp, idx) => (
              <ChannelComparisonCard
                key={idx}
                channel={comp}
                channelName={comp.channel_name}
                primary={primary}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics Chart */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Performance Comparison</h3>
        <p className="text-sm text-slate-600 mb-4">
          Compare key performance metrics across all channels (scores out of 100)
        </p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: primaryName || "You", ...primary, isPrimary: true },
                ...competitors.map(c => ({ name: c.channel_name, ...c, isPrimary: false }))
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} style={{ fontSize: '12px' }} />
              <YAxis domain={[0, 100]} style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="audience_quality" name="Audience Quality" radius={[8, 8, 0, 0]}>
                {[
                  { isPrimary: true },
                  ...competitors.map(() => ({ isPrimary: false }))
                ].map((entry, index) => (
                  <Cell key={`cell-quality-${index}`} fill={entry.isPrimary ? "#4f46e5" : "#cbd5e1"} />
                ))}
              </Bar>
              <Bar dataKey="consistency_score" name="Consistency" radius={[8, 8, 0, 0]}>
                {[
                  { isPrimary: true },
                  ...competitors.map(() => ({ isPrimary: false }))
                ].map((entry, index) => (
                  <Cell key={`cell-consistency-${index}`} fill={entry.isPrimary ? "#6366f1" : "#e0e7ff"} />
                ))}
              </Bar>
              <Bar dataKey="growth_momentum.score" name="Growth Momentum" radius={[8, 8, 0, 0]}>
                {[
                  { isPrimary: true },
                  ...competitors.map(() => ({ isPrimary: false }))
                ].map((entry, index) => (
                  <Cell key={`cell-growth-${index}`} fill={entry.isPrimary ? "#f59e0b" : "#fde68a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.competitive_analysis?.strengths && data.competitive_analysis.strengths.length > 0 && (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-600" />
              Where You Excel
            </h4>
            <ul className="space-y-2 text-sm text-slate-700">
              {data.competitive_analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5 flex-shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.competitive_analysis?.weaknesses && data.competitive_analysis.weaknesses.length > 0 && (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-orange-600" />
              Opportunities for Growth
            </h4>
            <ul className="space-y-2 text-sm text-slate-700">
              {data.competitive_analysis.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5 flex-shrink-0">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Engagement View
function EngagementView({ data, primaryName }) {
  const primary = data.primary_channel;
  const allChannels = [
    { name: primaryName || "You", ...primary, isPrimary: true },
    ...data.competitors.map(c => ({ ...c, isPrimary: false }))
  ];

  const qualityInfo = getQualityDescription(primary.audience_quality);
  const engagementInfo = getEngagementDescription(primary.engagement_rate);

  return (
    <div className="space-y-6">
      {/* Engagement Overview */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Audience Engagement Analysis</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-5 rounded-xl border-2 ${qualityInfo.borderColor} ${qualityInfo.bgColor}`}>
            <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Quality Rating</div>
            <div className={`text-2xl font-bold mb-2 ${qualityInfo.color}`}>
              {qualityInfo.label}
            </div>
            <div className="text-sm text-slate-700">{qualityInfo.description}</div>
            <div className="mt-2 text-xs text-slate-500">Score: {primary.audience_quality}/100</div>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border-2 border-slate-200">
            <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Engagement Level</div>
            <div className={`text-2xl font-bold mb-2 ${engagementInfo.color}`}>
              {engagementInfo.label}
            </div>
            <div className="text-sm text-slate-700">{engagementInfo.description}</div>
            <div className="mt-2 text-xs text-slate-500">
              {(primary.engagement_rate * 100).toFixed(2)}% of viewers interact
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border-2 border-slate-200">
            <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Reach Per Video</div>
            <div className="text-2xl font-bold text-slate-900 mb-2">
              {formatNumber(primary.avg_views_per_video)}
            </div>
            <div className="text-sm text-slate-700">Average views per upload</div>
            <div className="mt-2 text-xs text-slate-500">Content visibility</div>
          </div>
        </div>

        {/* Explanation */}
        <div className="p-5 bg-indigo-50 rounded-xl border-2 border-indigo-200">
          <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Info size={20} className="text-indigo-600" />
            Understanding Your Engagement
          </h3>
          <p className="text-sm text-slate-700 mb-2">
            {primary.audience_quality >= 70
              ? "You have built a highly engaged community. Your viewers actively interact with your content through likes and comments. This strong connection helps your videos reach more people through YouTube's recommendation system."
              : primary.audience_quality >= 40
              ? "Your audience shows moderate engagement. You have a solid foundation, and there's room to grow. Focus on creating content that encourages viewers to like, comment, and share. Even small improvements in engagement can significantly expand your reach."
              : "Your engagement metrics suggest opportunities for improvement. Focus on building stronger connections with your audience by responding to comments, asking questions in your videos, and creating content that encourages interaction. Engaged viewers help your channel grow faster."}
          </p>
          <p className="text-xs text-slate-600 mt-2">
            <strong>Remember:</strong> Engagement measures how actively your audience interacts with your content. 
            Higher engagement tells YouTube your videos are valuable, leading to more recommendations and growth.
          </p>
        </div>
      </div>

      {/* Comparison Chart */}
      {data.competitors.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Engagement Comparison</h3>
          <p className="text-sm text-slate-600 mb-4">
            See how your audience engagement compares to other channels
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={allChannels.map(c => ({
                  name: c.isPrimary ? "You" : c.channel_name,
                  quality: c.audience_quality,
                  isPrimary: c.isPrimary
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} style={{ fontSize: '12px' }} />
                <YAxis domain={[0, 100]} style={{ fontSize: '12px' }} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="quality" name="Audience Quality Score" radius={[8, 8, 0, 0]}>
                  {allChannels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isPrimary ? "#6366f1" : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Actionable Tips */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="text-indigo-600" size={20} />
          Ways to Boost Engagement
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 mb-2">Immediate Actions</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Respond to every comment within the first hour of posting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Ask a specific question at the end of each video</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Pin an engaging comment or question to the top</span>
              </li>
            </ul>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 mb-2">Content Strategy</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Include clear calls-to-action in your videos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Create content that naturally encourages discussion</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Feature viewer comments in follow-up videos</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function RecommendationCard({ recommendation }) {
  const getColor = (type) => {
    if (type === "success") return { bg: "bg-slate-50", border: "border-slate-300", icon: "text-indigo-600" };
    if (type === "warning") return { bg: "bg-amber-50", border: "border-amber-300", icon: "text-amber-600" };
    return { bg: "bg-blue-50", border: "border-blue-300", icon: "text-blue-600" };
  };

  const color = getColor(recommendation.type);
  const Icon = recommendation.type === "success" ? CheckCircle : recommendation.type === "warning" ? AlertCircle : Info;

  return (
    <div className={`${color.bg} border-2 ${color.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`${color.icon} mt-0.5 flex-shrink-0`} size={20} />
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 mb-1">{recommendation.title}</h4>
          <p className="text-sm text-slate-700 mb-2">{recommendation.message}</p>
          <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-1">Action Step:</p>
            <p className="text-sm text-slate-800">{recommendation.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankCard({ title, rank, total }) {
  const isTop = rank === 1;
  const isGood = rank <= total / 2;

  return (
    <div className={`p-4 rounded-xl border-2 ${isTop ? 'bg-amber-50 border-amber-300' : isGood ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${isTop ? 'text-amber-600' : isGood ? 'text-green-600' : 'text-slate-700'}`}>
          #{rank}
        </span>
        <span className="text-sm text-slate-600">of {total}</span>
      </div>
      {isTop && (
        <div className="mt-2 flex items-center gap-1">
          <Award size={14} className="text-amber-600" />
          <p className="text-xs text-amber-700 font-semibold">Top Performer</p>
        </div>
      )}
    </div>
  );
}

function ChannelComparisonCard({ channel, channelName, primary }) {
  const engagementDiff = primary ? ((channel.engagement_rate - primary.engagement_rate) / primary.engagement_rate * 100) : 0;
  const qualityDiff = primary ? (channel.audience_quality - primary.audience_quality) : 0;

  return (
    <div className="p-5 rounded-xl bg-white border-2 border-slate-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{channelName}</h4>
          <p className="text-sm text-slate-600">{formatNumber(channel.subscribers)} subscribers</p>
        </div>
        {qualityDiff !== 0 && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${qualityDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {qualityDiff > 0 ? 'Ahead of You' : 'Behind You'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-600 mb-1">Avg Views</p>
          <p className="text-sm font-bold text-slate-900">{formatNumber(channel.avg_views_per_video)}</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-600 mb-1">Engagement</p>
          <p className="text-sm font-bold text-slate-900">{getEngagementDescription(channel.engagement_rate).label}</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-600 mb-1">Quality Score</p>
          <p className="text-sm font-bold text-slate-900">{channel.audience_quality}/100</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-600 mb-1">Growth</p>
          <p className="text-sm font-bold text-slate-900 capitalize">{channel.growth_momentum.trend}</p>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  MessageSquare,
  ThumbsUp,
  Play,
  Eye,
  Award,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Heart,
  Star,
  Smile,
  Frown,
  Meh,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../core/context/AuthContext";

const API_BASE = "http://localhost:5000";

/**
 * Simplified Content Performance Insights
 * Business-focused: Easy to understand metrics for non-technical users
 */
export default function ContentPerformanceInsights() {
  const { user } = useAuth();

  // Channel selector
  const channels = Array.isArray(user?.youtube_channels) ? user.youtube_channels : [];

  const options = useMemo(() => {
    const base = [
      {
        key: "ALL",
        label: "All my channels",
        urls: channels.map((c) => c.url).filter(Boolean),
      },
    ];
    const singles = channels
      .map((c, idx) => ({
        key: `CH_${idx}`,
        label: c?.name || `Channel ${idx + 1}`,
        urls: c?.url ? [c.url] : [],
      }))
      .filter((o) => o.urls.length > 0);
    return [...base, ...singles];
  }, [channels]);

  const [selectedKey, setSelectedKey] = useState("ALL");
  const selectedOption = options.find((o) => o.key === selectedKey) || options[0];
  const selectedUrls = selectedOption?.urls || [];

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    async function fetchOne(url, label) {
      const encodedUrl = encodeURIComponent(url);
      const res = await fetch(
        `${API_BASE}/api/youtube/audience.resonance?url=${encodedUrl}&maxVideos=50`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to fetch data for ${label}`);
      }

      const data = await res.json();
      return { label, url, data };
    }

    async function fetchAll() {
      setLoading(true);
      setError(null);
      setResults([]);

      try {
        if (!selectedUrls || selectedUrls.length === 0) {
          throw new Error(
            "No channels connected. Please add channels in Business Profile → Link Channel."
          );
        }

        const urlToLabel = new Map();
        channels.forEach((c, idx) => {
          if (c?.url) urlToLabel.set(c.url, c?.name || `Channel ${idx + 1}`);
        });

        const tasks = selectedUrls.map((url) =>
          fetchOne(url, urlToLabel.get(url) || "Channel")
        );
        const res = await Promise.all(tasks);

        setResults(res);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to load performance data");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [selectedKey, selectedUrls.length]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="text-slate-600">Analyzing your content performance...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Error loading data</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const MenuItem = ({ icon: Icon, label, view, description }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex flex-col gap-1 px-4 py-3 rounded-lg transition-all text-left ${
        activeView === view
          ? "bg-indigo-50 text-indigo-700 font-medium border-2 border-indigo-200"
          : "text-slate-600 hover:bg-slate-50 border-2 border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="flex-1 text-sm font-medium">{label}</span>
      </div>
      {description && (
        <span className="text-xs text-slate-500 ml-9">{description}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-900">
              Content Performance Analysis
            </h1>
          </div>
          <p className="text-slate-600">
            Understand what content works best and how your audience responds
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-700 px-4 py-2 mb-2">
                What to View
              </h2>
              <div className="space-y-1">
                <MenuItem 
                  icon={BarChart3} 
                  label="Performance Summary" 
                  view="overview" 
                  description="Your best performing content"
                />
                <MenuItem 
                  icon={Heart} 
                  label="Audience Loyalty" 
                  view="retention"
                  description="Videos people watch completely"
                />
                <MenuItem 
                  icon={Sparkles} 
                  label="Trending Content" 
                  view="viral"
                  description="Videos gaining momentum"
                />
              </div>
            </div>

            {/* Channel Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Select Channel
              </h3>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

            {/* Quick Stats */}
            {results.length > 0 && results[0]?.data && (
              <div className="bg-indigo-600 rounded-xl shadow-sm p-4 text-white">
                <div className="text-sm font-medium mb-3">Quick Stats</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Videos Analyzed</span>
                    <span className="font-semibold">
                      {results.reduce((sum, r) => sum + (r.data?.channel?.videos_analyzed || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-200 text-sm">Total Subscribers</span>
                    <span className="font-semibold">
                      {formatNumber(results.reduce((sum, r) => sum + (r.data?.channel?.subscribers || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeView === "overview" && (
              <div className="space-y-6">
                {results.map((item) => (
                  <OverviewPanel key={item.url} title={item.label} data={item.data} />
                ))}
              </div>
            )}

            {activeView === "retention" && (
              <div className="space-y-6">
                {results.map((item) => (
                  <RetentionPanel key={item.url} title={item.label} data={item.data} />
                ))}
              </div>
            )}

            {activeView === "viral" && (
              <div className="space-y-6">
                {results.map((item) => (
                  <ViralPanel key={item.url} title={item.label} data={item.data} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatNumber(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Helper to get user-friendly engagement description
function getEngagementLevel(rate) {
  if (rate >= 10) return { label: "Outstanding", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (rate >= 5) return { label: "Excellent", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
  if (rate >= 3) return { label: "Very Good", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
  if (rate >= 1) return { label: "Good", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" };
  if (rate >= 0.1) return { label: "Moderate", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
  return { label: "Needs Work", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };
}

// Helper Components
function StatCard({ icon: Icon, label, value, helpText, color = "indigo" }) {
  const colorClasses = {
    indigo: "bg-indigo-50 border-indigo-100",
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
  };

  return (
    <div className={`rounded-xl border-2 p-5 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} className="text-slate-700" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {helpText && <p className="text-xs text-slate-600 mt-1">{helpText}</p>}
    </div>
  );
}

function ContentTypeRow({ rank, theme, count, engagement }) {
  const themeNames = {
    tutorial: "How-To & Tutorials",
    review: "Product Reviews",
    vlog: "Daily Vlogs",
    challenge: "Challenges",
    listicle: "Top Lists",
    educational: "Educational",
    entertainment: "Entertainment",
    news: "News & Updates",
  };

  const engagementLevel = getEngagementLevel(engagement);

  return (
    <div className="flex items-center justify-between rounded-xl bg-white border-2 border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <span className="text-sm font-bold text-indigo-700">#{rank}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {themeNames[theme] || theme}
          </p>
          <p className="text-xs text-slate-600">{count} videos</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${engagementLevel.color}`}>{engagementLevel.label}</p>
        <p className="text-xs text-slate-500">{engagement.toFixed(1)}% interaction</p>
      </div>
    </div>
  );
}

function VideoCard({ video, rank }) {
  const getYouTubeId = (id) => {
    if (!id) return null;
    return String(id).includes(":") ? String(id).split(":")[1] : id;
  };

  const ytId = getYouTubeId(video.id);
  const thumbnailUrl = video.thumbnail || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  const engagementLevel = getEngagementLevel(video.engagement_rate || 0);

  return (
    <div
      className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
      onClick={() => ytId && window.open(`https://www.youtube.com/watch?v=${ytId}`, "_blank")}
    >
      <div className="relative">
        <img
          src={thumbnailUrl}
          alt={video.title}
          className="w-full h-40 object-cover"
          onError={(e) => {
            e.target.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
          }}
        />
        <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
          #{rank}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3">
            <ExternalLink className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-3">
          {video.title}
        </p>

        <div className="flex items-center gap-3 text-xs text-slate-600 mb-3">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{formatNumber(video.views || 0)} views</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            <span>{formatNumber(video.likes || 0)} likes</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{formatNumber(video.comments || 0)} comments</span>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 rounded-lg ${engagementLevel.bg} border ${engagementLevel.border} px-3 py-1.5`}>
          <TrendingUp className={`w-3 h-3 ${engagementLevel.color}`} />
          <span className={`text-xs font-semibold ${engagementLevel.color}`}>
            {engagementLevel.label} Performance
          </span>
        </div>
      </div>
    </div>
  );
}

// Main Panel Components
function OverviewPanel({ title, data }) {
  const channel = data?.channel || {};
  const engagement = data?.engagement || {};
  const themes = data?.content_themes?.themes || {};
  const sentiment = data?.audience_sentiment || {};

  const topPerformers = engagement.top_performers || [];
  const averages = engagement.averages || {};
  const avgEngagementLevel = getEngagementLevel(averages.engagement_rate || 0);

  const topThemes = Object.entries(themes)
    .sort((a, b) => b[1].avg_engagement - a[1].avg_engagement)
    .slice(0, 3);

  // Sentiment interpretation
  const getSentimentStatus = (score) => {
    if (score > 50) return { label: "Very Positive", icon: <Smile className="w-5 h-5 text-emerald-600" />, color: "text-emerald-600", bg: "bg-emerald-50", description: "Your audience loves your content!" };
    if (score > 20) return { label: "Positive", icon: <Smile className="w-5 h-5 text-green-600" />, color: "text-green-600", bg: "bg-green-50", description: "People are responding well to your videos" };
    if (score > -20) return { label: "Neutral", icon: <Meh className="w-5 h-5 text-slate-600" />, color: "text-slate-600", bg: "bg-slate-50", description: "Mixed reactions - room for improvement" };
    return { label: "Needs Attention", icon: <Frown className="w-5 h-5 text-orange-600" />, color: "text-orange-600", bg: "bg-orange-50", description: "Focus on creating more engaging content" };
  };

  const sentimentStatus = getSentimentStatus(sentiment.sentiment_score || 0);

  return (
    <section className="space-y-6">
      {/* Channel Stats */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">Performance summary of your recent content</p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            {channel.videos_analyzed || 0} videos analyzed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Total Subscribers"
            value={formatNumber(channel.subscribers || 0)}
            helpText="People following your channel"
            color="indigo"
          />
          <StatCard
            icon={Eye}
            label="Total Views"
            value={formatNumber(channel.total_views || 0)}
            helpText="All-time views across your content"
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Engagement Level"
            value={avgEngagementLevel.label}
            helpText={`${averages.engagement_rate?.toFixed(2)}% of viewers interact with your content`}
            color="emerald"
          />
        </div>
      </div>

      {/* Audience Mood & Content Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audience Mood */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 text-slate-900 mb-4">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-base font-semibold">How Your Audience Feels</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Based on comments and reactions from viewers
          </p>

          <div className={`rounded-xl border-2 ${sentimentStatus.bg} p-5 mb-4`}>
            <div className="flex items-center gap-3 mb-3">
              {sentimentStatus.icon}
              <div>
                <p className={`text-lg font-bold ${sentimentStatus.color}`}>{sentimentStatus.label}</p>
                <p className="text-sm text-slate-600">{sentimentStatus.description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 uppercase">Positive</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{sentiment.positive_count || 0}</p>
              <p className="text-xs text-emerald-600 mt-1">Happy comments</p>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase">Questions</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{sentiment.question_count || 0}</p>
              <p className="text-xs text-blue-600 mt-1">People asking</p>
            </div>
          </div>
        </div>

        {/* Top Content Types */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 text-slate-900 mb-4">
            <Star className="w-5 h-5" />
            <h3 className="text-base font-semibold">Your Best Content Types</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            What formats get the most audience engagement
          </p>

          {topThemes.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Not enough data yet</p>
              <p className="text-xs text-slate-400 mt-1">Keep creating to see patterns!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topThemes.map(([theme, data], idx) => (
                <ContentTypeRow
                  key={theme}
                  rank={idx + 1}
                  theme={theme}
                  count={data.count}
                  engagement={data.avg_engagement}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Performing Videos */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 text-slate-900 mb-4">
          <Award className="w-5 h-5" />
          <h3 className="text-base font-semibold">Your Top Performing Videos</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Videos that got the best response from your audience
        </p>

        {topPerformers.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No performance data available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPerformers.slice(0, 6).map((video, idx) => (
              <VideoCard key={video.id} video={video} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RetentionPanel({ title, data }) {
  const retention = data?.retention || {};
  const highRetention = retention.high_retention_videos || [];
  const avgScore = retention.avg_retention_score || 0;

  // Convert retention score to understandable level
  const getRetentionLevel = (score) => {
    if (score >= 5) return { label: "Exceptional", color: "text-emerald-600", description: "People love watching your entire videos" };
    if (score >= 3) return { label: "Very Good", color: "text-green-600", description: "Strong viewer retention throughout videos" };
    if (score >= 1.5) return { label: "Good", color: "text-blue-600", description: "Viewers stay engaged with your content" };
    if (score >= 0.5) return { label: "Moderate", color: "text-orange-600", description: "Some viewers watch completely" };
    return { label: "Needs Work", color: "text-slate-600", description: "Focus on keeping viewers engaged longer" };
  };

  const retentionLevel = getRetentionLevel(avgScore);

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 text-slate-900 mb-4">
        <Heart className="w-6 h-6" />
        <h2 className="text-xl font-semibold">{title} - Audience Loyalty</h2>
      </div>
      <p className="text-slate-600 mb-6">
        How well your videos keep people watching from start to finish
      </p>

      <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Overall Loyalty Level</p>
            <p className={`text-2xl font-bold ${retentionLevel.color} mb-2`}>
              {retentionLevel.label}
            </p>
            <p className="text-sm text-slate-600">{retentionLevel.description}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-slate-900">{avgScore.toFixed(1)}</p>
            <p className="text-xs text-slate-500">loyalty score</p>
          </div>
        </div>
      </div>

      {highRetention.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-8 text-center">
          <Heart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600 font-medium">No high-loyalty videos yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Keep creating engaging content that holds viewers' attention!
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Videos People Watch Completely ({highRetention.length})
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            These videos successfully kept viewers engaged throughout
          </p>
          <div className="space-y-3">
            {highRetention.slice(0, 5).map((video, idx) => (
              <div
                key={video.id}
                className="rounded-xl bg-slate-50 border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  const ytId = String(video.id).includes(":") ? String(video.id).split(":")[1] : video.id;
                  window.open(`https://www.youtube.com/watch?v=${ytId}`, "_blank");
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-700">#{idx + 1}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2">
                      {video.title}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
                      <span>{formatNumber(video.views)} views</span>
                      <span>{formatNumber(video.likes)} likes</span>
                      <span>{formatNumber(video.comments)} comments</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1">
                      <Heart className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">
                        High Loyalty: {video.retention_score.toFixed(1)} score
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ViralPanel({ title, data }) {
  const viral = data?.viral_potential || {};
  const viralCandidates = viral.viral_candidates || [];

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 text-slate-900 mb-4">
        <Sparkles className="w-6 h-6" />
        <h2 className="text-xl font-semibold">{title} - Trending Content</h2>
      </div>
      <p className="text-slate-600 mb-6">
        Videos showing strong growth and high sharing potential
      </p>

      {viralCandidates.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600 font-medium">No trending videos detected yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Keep creating! Viral moments can happen at any time
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-indigo-50 border-2 border-indigo-200 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Videos with Growth Potential
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Content showing exceptional audience response
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-indigo-600">
                  {viralCandidates.length}
                </p>
                <p className="text-xs text-slate-500">trending videos</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {viralCandidates.map((video, idx) => {
              const getViralLevel = (score) => {
                if (score >= 8) return { label: "Very High", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
                if (score >= 5) return { label: "High", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
                if (score >= 3) return { label: "Moderate", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
                return { label: "Growing", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" };
              };

              const viralLevel = getViralLevel(video.viral_score);

              return (
                <div
                  key={video.id}
                  className="rounded-xl bg-slate-50 border-2 border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    const ytId = String(video.id).includes(":") ? String(video.id).split(":")[1] : video.id;
                    window.open(`https://www.youtube.com/watch?v=${ytId}`, "_blank");
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-indigo-700">#{idx + 1}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-3">
                        {video.title}
                      </p>

                      <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                        <div>
                          <p className="text-slate-500 mb-1">Views</p>
                          <p className="font-semibold text-slate-900">
                            {formatNumber(video.views)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Likes</p>
                          <p className="font-semibold text-emerald-600">
                            {formatNumber(video.likes)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Comments</p>
                          <p className="font-semibold text-blue-600">
                            {formatNumber(video.comments)}
                          </p>
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-1.5 rounded-lg ${viralLevel.bg} border ${viralLevel.border} px-3 py-1.5`}>
                        <TrendingUp className={`w-3 h-3 ${viralLevel.color}`} />
                        <span className={`text-xs font-semibold ${viralLevel.color}`}>
                          {viralLevel.label} Potential
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
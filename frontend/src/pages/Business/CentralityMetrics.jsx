import React, { useEffect, useMemo, useState } from "react";
import {
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  ThumbsUp,
  Lightbulb,
  Play,
  Eye,
  Award,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Flame,
  Clock,
  DollarSign,
  Heart,
  Share2,
  Calendar,
  Star,
  ArrowRight,
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
          <p className="text-slate-600">Analyzing your content performance...</p>
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

  const MenuItem = ({ icon: Icon, label, view, badge, description }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex flex-col gap-1 px-4 py-3 rounded-lg transition-all text-left ${
        activeView === view
          ? "bg-violet-50 text-violet-700 font-medium"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="flex-1 text-sm font-medium">{label}</span>
        {badge && (
          <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <span className="text-xs text-slate-500 ml-9">{description}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-7 h-7 text-violet-600" />
            <h1 className="text-3xl font-bold text-slate-900">
              Content Performance Insights
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Understand what your audience loves and what brands should sponsor
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-72 flex flex-col gap-4">
            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-700 px-4 py-2 mb-2">
                Choose What to View
              </h2>
              <div className="space-y-1">
                <MenuItem 
                  icon={BarChart3} 
                  label="Quick Summary" 
                  view="overview" 
                  badge="Start Here"
                  description="See your best content at a glance"
                />
                <MenuItem 
                  icon={Sparkles} 
                  label="Brand Partnership Opportunities" 
                  view="sponsorship"
                  description="What sponsors should know about you"
                />
                <MenuItem 
                  icon={Flame} 
                  label="Videos Going Viral" 
                  view="viral"
                  description="Your most shareable content"
                />
                <MenuItem 
                  icon={Heart} 
                  label="Audience Loyalty" 
                  view="retention"
                  description="Videos people finish watching"
                />
                <MenuItem 
                  icon={Clock} 
                  label="Best Time to Post" 
                  view="timing"
                  description="When your audience is most active"
                />
                <MenuItem 
                  icon={DollarSign} 
                  label="Sponsorship Value" 
                  view="roi"
                  description="What you're worth to brands"
                />
              </div>
            </div>

            {/* Channel Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Select Channel
              </h3>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
              <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl shadow-sm p-4 text-white">
                <div className="text-sm font-medium mb-3">At a Glance</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-violet-200 text-sm">Channels Analyzed</span>
                    <span className="font-semibold">{results.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-violet-200 text-sm">Videos Reviewed</span>
                    <span className="font-semibold">
                      {results.reduce((sum, r) => sum + (r.data?.channel?.videos_analyzed || 0), 0)}
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

            {activeView === "sponsorship" && (
              <div className="space-y-6">
                {results.map((item) => (
                  <SponsorshipPanel key={item.url} title={item.label} data={item.data} />
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

            {activeView === "retention" && (
              <div className="space-y-6">
                {results.map((item) => (
                  <RetentionPanel key={item.url} title={item.label} data={item.data} />
                ))}
              </div>
            )}

            {activeView === "timing" && (
              <div className="space-y-6">
                {results.map((item) => (
                  <TimingPanel key={item.url} title={item.label} data={item.data} />
                ))}
              </div>
            )}

            {activeView === "roi" && (
              <div className="space-y-6">
                {results.map((item) => (
                  <ROIPanel key={item.url} title={item.label} data={item.data} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function InfoCard({ icon, label, value, helpText, color = "slate" }) {
  const colorClasses = {
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5">
      <div
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 ${colorClasses[color]}`}
      >
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

function AudienceReactionBadge({ icon, label, value, color, helpText }) {
  const colorClasses = {
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {helpText && <p className="text-xs opacity-80">{helpText}</p>}
    </div>
  );
}

function ContentTypeRow({ rank, theme, count, popularity }) {
  const medals = ["🥇", "🥈", "🥉"];
  const themeNames = {
    tutorial: "How-To & Tutorials",
    review: "Product Reviews",
    vlog: "Daily Vlogs",
    challenge: "Challenges & Competitions",
    listicle: "Top Lists & Rankings",
    educational: "Educational Content",
    entertainment: "Entertainment & Fun",
    news: "News & Updates",
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{medals[rank - 1] || "📊"}</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {themeNames[theme] || theme}
          </p>
          <p className="text-xs text-slate-600">{count} videos in this category</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-emerald-700">{popularity.toFixed(1)}%</p>
        <p className="text-xs text-slate-500">audience interaction</p>
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

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
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
        <div className="absolute top-2 left-2 bg-violet-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
          #{rank}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-3">
          {video.title}
        </p>

        <div className="flex items-center gap-3 text-xs text-slate-600 mb-3">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{(video.views || 0).toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            <span>{(video.likes || 0).toLocaleString()} likes</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{(video.comments || 0).toLocaleString()} comments</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">
            {(video.engagement_rate || 0).toFixed(2)}% audience interaction
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

  const topThemes = Object.entries(themes)
    .sort((a, b) => b[1].avg_engagement - a[1].avg_engagement)
    .slice(0, 3);

  return (
    <section className="space-y-6">
      {/* Channel Stats */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">Quick overview of your performance</p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
            Based on {channel.videos_analyzed || 0} recent videos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={<Users className="w-4 h-4" />}
            label="Your Audience"
            value={(channel.subscribers || 0).toLocaleString()}
            helpText="People who subscribed to your channel"
            color="violet"
          />
          <InfoCard
            icon={<Eye className="w-4 h-4" />}
            label="Total Reach"
            value={(channel.total_views || 0).toLocaleString()}
            helpText="All-time video views across your channel"
            color="indigo"
          />
          <InfoCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Audience Interaction"
            value={`${(averages.engagement_rate || 0).toFixed(2)}%`}
            helpText="How many people like, comment, or share"
            color="emerald"
          />
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6">
          <div className="flex items-center gap-2 text-emerald-900 mb-4">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-base font-semibold">How Your Audience Feels</h3>
          </div>
          <p className="text-sm text-emerald-800 mb-4">
            Based on comments and reactions from your viewers
          </p>

          <div className="space-y-3">
            <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-700">Overall Mood</span>
                <span className="text-xl font-bold text-emerald-700">
                  {(sentiment.sentiment_score || 0) > 0 ? "Positive 😊" : "Neutral 😐"}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{
                    width: `${Math.max(0, Math.min(100, 50 + (sentiment.sentiment_score || 0) / 2))}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                The more positive, the better your content resonates
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AudienceReactionBadge
                icon={<ThumbsUp className="w-3 h-3" />}
                label="Happy Viewers"
                value={sentiment.positive_count || 0}
                color="emerald"
                helpText="Positive comments"
              />
              <AudienceReactionBadge
                icon={<MessageSquare className="w-3 h-3" />}
                label="Curious Viewers"
                value={sentiment.question_count || 0}
                color="blue"
                helpText="People asking questions"
              />
            </div>
          </div>
        </div>

        {/* Top Themes */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 text-slate-900 mb-4">
            <Star className="w-5 h-5" />
            <h3 className="text-base font-semibold">Your Most Popular Content Types</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            What your audience engages with the most
          </p>

          {topThemes.length === 0 ? (
            <p className="text-sm text-slate-500">Not enough data yet - keep creating!</p>
          ) : (
            <div className="space-y-3">
              {topThemes.map(([theme, data], idx) => (
                <ContentTypeRow
                  key={theme}
                  rank={idx + 1}
                  theme={theme}
                  count={data.count}
                  popularity={data.avg_engagement}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Videos */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 text-slate-900 mb-4">
          <Award className="w-5 h-5" />
          <h3 className="text-base font-semibold">Your Star Performers</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Videos that got the most love from your audience
        </p>

        {topPerformers.length === 0 ? (
          <p className="text-sm text-slate-500">No data available</p>
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

function SponsorshipPanel({ title, data }) {
  const sponsorship = data?.sponsorship || {};
  const insights = sponsorship.insights || [];
  const recommendations = sponsorship.recommendations || [];

  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-6">
      <div className="flex items-center gap-2 text-violet-900 mb-4">
        <Sparkles className="w-6 h-6" />
        <h2 className="text-xl font-semibold">{title} - Why Brands Should Work With You</h2>
      </div>
      <p className="text-violet-800 mb-6">
        Key insights that make you attractive to sponsors and advertisers
      </p>

      {insights.length === 0 ? (
        <div className="rounded-xl bg-white/80 p-6 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-violet-300 mb-3" />
          <p className="text-sm text-violet-700">Building your sponsorship profile...</p>
          <p className="text-xs text-violet-600 mt-1">Keep creating great content!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white/80 backdrop-blur-sm border border-violet-100 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      {insight.title}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">{insight.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-violet-700">{insight.value}</p>
                    <p className="text-xs text-violet-600">{insight.metric}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-violet-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-violet-600" />
              <h3 className="text-sm font-semibold text-slate-900">What This Means for Sponsors</h3>
            </div>
            <ul className="space-y-3">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function ViralPanel({ title, data }) {
  const viral = data?.viral_potential || {};
  const viralCandidates = viral.viral_candidates || [];

  return (
    <section className="rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 p-6">
      <div className="flex items-center gap-2 text-orange-900 mb-4">
        <Flame className="w-6 h-6" />
        <h2 className="text-xl font-semibold">{title} - Videos That Could Go Viral</h2>
      </div>
      <p className="text-orange-800 mb-6">
        Content with high sharing potential and explosive growth patterns
      </p>

      {viralCandidates.length === 0 ? (
        <div className="rounded-xl bg-white/80 p-6 text-center">
          <Flame className="w-12 h-12 mx-auto text-orange-300 mb-3" />
          <p className="text-sm text-slate-600">No viral patterns detected yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Keep creating engaging content - viral moments can happen anytime!
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-orange-100 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Videos Showing Viral Characteristics
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  High sharing rate and exceptional audience response
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-600">
                  {viralCandidates.length}
                </p>
                <p className="text-xs text-slate-500">hot videos</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {viralCandidates.map((video, idx) => (
              <div
                key={video.id}
                className="rounded-xl bg-white/80 backdrop-blur-sm border border-orange-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">#{idx + 1}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2">
                      {video.title}
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div>
                        <p className="text-slate-500">Views</p>
                        <p className="font-semibold text-slate-900">
                          {video.views.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Like Rate</p>
                        <p className="font-semibold text-emerald-600">
                          {video.like_ratio.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Comments</p>
                        <p className="font-semibold text-blue-600">
                          {video.comment_ratio.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-100 to-red-100 px-2 py-1">
                      <Share2 className="w-3 h-3 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-700">
                        Viral Score: {video.viral_score.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RetentionPanel({ title, data }) {
  const retention = data?.retention || {};
  const highRetention = retention.high_retention_videos || [];
  const avgScore = retention.avg_retention_score || 0;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6">
      <div className="flex items-center gap-2 text-blue-900 mb-4">
        <Heart className="w-6 h-6" />
        <h2 className="text-xl font-semibold">{title} - Audience Loyalty</h2>
      </div>
      <p className="text-blue-800 mb-6">
        Videos that keep people watching and engaging throughout
      </p>

      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Average Loyalty Score
            </p>
            <p className="text-xs text-slate-600 mt-1">
              How well your videos hold people's attention (higher is better)
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">{avgScore.toFixed(2)}%</p>
            <p className="text-xs text-slate-500">viewer loyalty</p>
          </div>
        </div>
      </div>

      {highRetention.length === 0 ? (
        <div className="rounded-xl bg-white/80 p-6 text-center">
          <Heart className="w-12 h-12 mx-auto text-blue-300 mb-3" />
          <p className="text-sm text-slate-600">No standout loyalty videos yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Keep creating content that keeps people engaged!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Videos People Love to Watch ({highRetention.length})
          </h3>
          <p className="text-xs text-slate-600 mb-3">
            These videos kept viewers engaged from start to finish
          </p>
          {highRetention.map((video, idx) => (
            <div
              key={video.id}
              className="rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-700">#{idx + 1}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2">
                    {video.title}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
                    <span>{video.views.toLocaleString()} views</span>
                    <span>{video.likes.toLocaleString()} likes</span>
                    <span>{video.comments.toLocaleString()} comments</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1">
                    <Heart className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">
                      Loyalty: {video.retention_score.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TimingPanel({ title, data }) {
  const timing = data?.timing || {};
  const dayPerformance = timing.day_performance || {};
  const bestDay = timing.best_day;

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const chartData = days
    .filter((day) => dayPerformance[day])
    .map((day) => ({
      day,
      engagement: dayPerformance[day].avg_engagement,
      views: dayPerformance[day].avg_views,
      count: dayPerformance[day].video_count,
    }));

  return (
    <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 p-6">
      <div className="flex items-center gap-2 text-amber-900 mb-4">
        <Clock className="w-6 h-6" />
        <h2 className="text-xl font-semibold">{title} - Best Time to Post</h2>
      </div>
      <p className="text-amber-800 mb-6">
        When your audience is most active and engaged with your content
      </p>

      {chartData.length === 0 ? (
        <div className="rounded-xl bg-white/80 p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto text-amber-300 mb-3" />
          <p className="text-sm text-slate-600">Not enough data to find patterns yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Post consistently and we'll find your best posting times!
          </p>
        </div>
      ) : (
        <>
          {bestDay && (
            <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-amber-100 p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Your Best Day to Upload</p>
                  <p className="text-xs text-slate-600 mt-1">{timing.recommendation}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-600">{bestDay}</p>
                  <p className="text-xs text-slate-500">most engagement</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-amber-100 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Performance by Day of Week
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Days ranked by how much your audience interacts with your videos
            </p>
            <div className="space-y-3">
              {chartData
                .sort((a, b) => b.engagement - a.engagement)
                .map((item) => (
                  <div key={item.day}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{item.day}</span>
                      <span className="text-xs text-slate-600">
                        {item.engagement.toFixed(2)}% interaction · {item.count} videos posted
                      </span>
                    </div>
                    <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                        style={{
                          width: `${(item.engagement / Math.max(...chartData.map(d => d.engagement))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ROIPanel({ title, data }) {
  const roi = data?.roi || {};
  const metrics = roi.metrics || {};
  const recommendations = roi.recommendations || [];

  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 p-6">
      <div className="flex items-center gap-2 text-emerald-900 mb-4">
        <DollarSign className="w-6 h-6" />
        <h2 className="text-xl font-semibold">{title} - Your Value to Sponsors</h2>
      </div>
      <p className="text-emerald-800 mb-6">
        What your channel is worth to brands and advertisers
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100 p-5">
          <p className="text-sm font-semibold text-slate-900 mb-2">Cost Per Interaction</p>
          <p className="text-2xl font-bold text-emerald-700">
            ${metrics.cpe ? metrics.cpe.toFixed(2) : "N/A"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            How much sponsors pay for each like/comment (lower = better value)
          </p>
        </div>

        <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100 p-5">
          <p className="text-sm font-semibold text-slate-900 mb-2">Sponsor Return Multiplier</p>
          <p className="text-2xl font-bold text-emerald-700">
            {metrics.roi_potential ? `${metrics.roi_potential.toFixed(1)}x` : "N/A"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            For every $1 invested, sponsors could get back this much
          </p>
        </div>

        <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100 p-5">
          <p className="text-sm font-semibold text-slate-900 mb-2">Overall Value Rating</p>
          <p className="text-2xl font-bold text-emerald-700">
            {metrics.value_score ? metrics.value_score.toFixed(1) : "N/A"}/10
          </p>
          <p className="text-xs text-slate-500 mt-1">
            How attractive you are to potential sponsors
          </p>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Why Brands Should Invest in You
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
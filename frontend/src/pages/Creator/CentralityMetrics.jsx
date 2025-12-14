import React, { useEffect, useState } from "react";
import { TrendingUp, Zap, Link2, Award } from "lucide-react";
import { useAuth } from "../../core/context/AuthContext";

export default function CentralityMetrics() {
  const [data, setData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const channelUrl = user.youtube_channel;
        if (!channelUrl) {
          throw new Error("No channelUrl found in localStorage");
        }

        const encodedUrl = encodeURIComponent(channelUrl);
        
        // Fetch centrality metrics
        const centralityRes = await fetch(
          `http://localhost:5000/api/youtube/videos.centralityMetrics?url=${encodedUrl}`
        );
        if (!centralityRes.ok) throw new Error("Failed to fetch centrality data");
        const centralityData = await centralityRes.json();
        setData(centralityData);

        // Fetch video details to get titles
        const networkRes = await fetch(
          `http://localhost:5000/api/youtube/videos.correlationNetwork?url=${encodedUrl}&maxVideos=50`
        );
        if (!networkRes.ok) throw new Error("Failed to fetch video details");
        const networkData = await networkRes.json();
        
        const videoMap = {};
        (networkData.rawMetrics || []).forEach(v => {
          videoMap[v.id || v.videoId] = {
            title: v.title || "Untitled",
            views: Number(v.views) || 0,
            likes: Number(v.likes) || 0,
            comments: Number(v.comments) || 0
          };
        });
        setVideos(videoMap);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">Content Strategy Insights</h1>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Analyzing your content patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">Content Strategy Insights</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium">Unable to analyze content</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { nodes = [], edges = [], centrality = {} } = data || {};
  const { degree = {}, betweenness = {}, closeness = {} } = centrality;

  if (nodes.length === 0) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">Content Strategy Insights</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800 font-medium mb-2">Not enough data to analyze</p>
          <p className="text-yellow-700 text-sm">
            We need at least 2 videos with similar performance patterns to provide insights. Keep creating content!
          </p>
        </div>
      </div>
    );
  }

  // Analyze and categorize videos
  const videoInsights = nodes.map(nodeId => ({
    id: nodeId,
    title: videos[nodeId]?.title || nodeId,
    views: videos[nodeId]?.views || 0,
    likes: videos[nodeId]?.likes || 0,
    degree: degree[nodeId] || 0,
    betweenness: betweenness[nodeId] || 0,
    closeness: closeness[nodeId] || 0,
  }));

  // Find key videos
  const topConnected = [...videoInsights].sort((a, b) => b.degree - a.degree).slice(0, 3);
  const bridges = [...videoInsights].sort((a, b) => b.betweenness - a.betweenness).slice(0, 3);
  const coreVideos = [...videoInsights].sort((a, b) => b.closeness - a.closeness).slice(0, 3);

  // Calculate insights
  const avgConnections = nodes.length > 0 
    ? (Object.values(degree).reduce((a, b) => a + b, 0) / nodes.length * 100).toFixed(0)
    : 0;

  const hasStrongNetwork = edges.length > nodes.length * 0.5;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Content Strategy Insights</h1>
        <p className="text-sm text-slate-600">
          Discover which videos define your content strategy and how they connect to grow your channel
        </p>
      </div>

      {/* Key Insight Banner */}
      <div className={`rounded-xl p-6 mb-6 ${hasStrongNetwork ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-start gap-3">
          {hasStrongNetwork ? (
            <div className="bg-emerald-500 text-white p-2 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          ) : (
            <div className="bg-amber-500 text-white p-2 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1">
            <h3 className={`font-semibold mb-1 ${hasStrongNetwork ? 'text-emerald-900' : 'text-amber-900'}`}>
              {hasStrongNetwork 
                ? "Strong Content Consistency" 
                : "Diverse Content Strategy"}
            </h3>
            <p className={`text-sm ${hasStrongNetwork ? 'text-emerald-700' : 'text-amber-700'}`}>
              {hasStrongNetwork
                ? `Your videos are well-connected (${avgConnections}% avg similarity). This consistency helps build a loyal audience who knows what to expect.`
                : `Your content varies significantly (${avgConnections}% avg similarity). Consider identifying your most successful themes and creating more content in those areas.`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Pillar Content */}
        <InsightCard
          icon={<Award className="w-5 h-5" />}
          title="Pillar Content"
          subtitle="Your signature videos that define your brand"
          color="purple"
        >
          <VideoList videos={topConnected} showViews />
          <ActionText>
            💡 Create more content similar to these - they represent what your audience loves most
          </ActionText>
        </InsightCard>

        {/* Bridge Content */}
        <InsightCard
          icon={<Link2 className="w-5 h-5" />}
          title="Bridge Content"
          subtitle="Videos that connect different topics"
          color="blue"
        >
          <VideoList videos={bridges} showViews />
          <ActionText>
            💡 These videos help viewers discover different aspects of your content. Use them in playlists!
          </ActionText>
        </InsightCard>

        {/* Core Content */}
        <InsightCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Core Content"
          subtitle="Central to your content ecosystem"
          color="green"
        >
          <VideoList videos={coreVideos} showViews />
          <ActionText>
            💡 Reference these videos in your newer content to build a connected content library
          </ActionText>
        </InsightCard>
      </div>

      {/* Strategy Recommendations */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Recommended Actions
        </h2>
        <div className="space-y-3">
          {topConnected.length > 0 && (
            <RecommendationItem
              title="Double down on your winning formula"
              description={`"${topConnected[0].title}" represents your most consistent content style. Create 2-3 more videos in this format this month.`}
            />
          )}
          {bridges.length > 0 && bridges[0].betweenness > 0.1 && (
            <RecommendationItem
              title="Create a content series"
              description={`"${bridges[0].title}" connects different topics well. Build a series that explores these connections.`}
            />
          )}
          {edges.length < nodes.length * 0.3 && (
            <RecommendationItem
              title="Build content consistency"
              description="Your videos have diverse topics. Consider creating recurring segments or series to build anticipation with your audience."
            />
          )}
          <RecommendationItem
            title="Cross-promote your core videos"
            description="Add cards and end screens linking to your pillar content to help new viewers discover your best work."
          />
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard 
          label="Videos Analyzed" 
          value={nodes.length}
          description="Total videos in network"
        />
        <MetricCard 
          label="Content Connections" 
          value={edges.length}
          description="Similar performance patterns"
        />
        <MetricCard 
          label="Consistency Score" 
          value={`${avgConnections}%`}
          description="How similar your content performs"
        />
      </div>
    </div>
  );
}

// Helper Components
function InsightCard({ icon, title, subtitle, color, children }) {
  const colors = {
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className={`${colors[color]} text-white p-2 rounded-lg`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function VideoList({ videos, showViews }) {
  if (videos.length === 0) {
    return <p className="text-sm text-slate-400 mb-3">No data available</p>;
  }

  return (
    <ul className="space-y-2 mb-4">
      {videos.map((video, idx) => (
        <li key={video.id} className="text-sm">
          <div className="flex items-start gap-2">
            <span className="text-slate-400 font-semibold mt-0.5">#{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{video.title}</p>
              {showViews && (
                <p className="text-xs text-slate-500">{video.views.toLocaleString()} views</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ActionText({ children }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 leading-relaxed">
      {children}
    </div>
  );
}

function RecommendationItem({ title, description }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
      <div className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        ✓
      </div>
      <div>
        <p className="font-medium text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, description }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mb-1">{value}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}
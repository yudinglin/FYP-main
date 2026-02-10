// src/pages/Business/BusinessAnalyticsOverview.jsx
import { Link } from "react-router-dom";
import { 
  TrendingUp, 
  Users, 
  Target,
  BarChart3,
  Network,
  ThumbsUp,
  Eye,
  Award,
  Zap,
  Heart,
  MessageSquare,
  Star,
  Activity,
  PlayCircle
} from "lucide-react";

export default function BusinessAnalyticsOverview() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Business Analytics Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-3xl">
          Track your channel performance, understand your audience, and compare against competitors. Get actionable insights to grow your business.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* 1. Content Performance Insights */}
        <AnalyticsCard
          label="Audience Analysis"
          title="Content Performance Insights"
          badge="Deep dive"
          description={
            <>
              Analyze comment quality, viewer retention patterns, and competitive positioning. Understand where viewers drop off and discover content gaps in your market.
            </>
          }
          highlights={[
            "Measure comment depth and conversation quality beyond sentiment",
            "See exactly where viewers drop off with Estimated Audience Retention Heatmaps",
            "Find your optimal video length for maximum retention",
            "Discover content opportunities competitors are missing",
            "Identify areas where you dominate your competition",
          ]}
          link="/dashboard/business/centrality"
          visualType="performance"
        />

        {/* 2. Network & Competitive Analysis */}
        <AnalyticsCard
          label="Market Intelligence"
          title="Network & Competitive Analysis"
          badge="Visual insights"
          description={
            <>
              Visualize how your videos relate based on performance metrics. Discover which videos behave similarly and find content clusters using interactive network graphs.
            </>
          }
          highlights={[
            "Interactive network graph showing video correlations",
            "Visualize video similarity based on views, likes, and comments",
            "Compare performance across up to 5 linked channels",
            "Identify content clusters and performance patterns",
            "See which videos are connected by similar audience behavior",
          ]}
          link="/dashboard/business/network"
          visualType="network"
        />

        {/* 3. Growth Prediction & Planning */}
        <AnalyticsCard
          label="Strategic Planning"
          title="Growth Forecast & Analysis"
          badge="Plan for growth"
          description={
            <>
              Forecast subscriber growth for the next 3, 6, and 12 months. Compare your growth trajectory with competitors and track engagement trends over time.
            </>
          }
          highlights={[
            "Predict subscriber counts for 3, 6, and 12 months ahead",
            "See when you'll catch up to competitors based on current growth",
            "Track engagement rate trends and predictions",
            "Compare growth momentum with competitor channels",
            "Get confidence ratings based on your performance data",
          ]}
          link="/dashboard/business/forecasting"
          visualType="growth"
        />
      </div>
    </div>
  );
}

// ------------------------- Helper -------------------------

function AnalyticsCard({ label, title, badge, description, highlights, link, visualType }) {
  return (
    <Link
      to={link}
      className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 flex flex-col lg:flex-row gap-4 hover:shadow-lg transition group"
    >
      <div className="flex-1 min-w-[220px]">
        <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500">
          {label}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
            {badge}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {description}
        </p>

        <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
          {highlights?.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full lg:w-80 xl:w-96">
        <VisualPreview type={visualType} />
      </div>
    </Link>
  );
}

function VisualPreview({ type }) {
  if (type === "performance") {
    return (
      <div className="h-52 rounded-xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-emerald-300 transition-colors p-4">
        {/* Performance indicators */}
        <div className="w-full max-w-xs space-y-3">
          {/* Viral potential video */}
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-emerald-200">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="text-white" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 flex-1 bg-emerald-200 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                </div>
              </div>
              <p className="text-[9px] text-emerald-700 font-semibold">High Viral Potential</p>
            </div>
          </div>

          {/* High loyalty video */}
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-blue-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Heart className="text-white" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 flex-1 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-blue-400 to-blue-500"></div>
                </div>
              </div>
              <p className="text-[9px] text-blue-700 font-semibold">Strong Viewer Loyalty</p>
            </div>
          </div>

          {/* Good engagement */}
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-purple-200">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <ThumbsUp className="text-white" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 flex-1 bg-purple-200 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-purple-400 to-purple-500"></div>
                </div>
              </div>
              <p className="text-[9px] text-purple-700 font-semibold">Excellent Engagement</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[10px] text-slate-400 text-center px-4 mt-3 font-medium">
          Audience performance breakdown
        </p>
      </div>
    );
  }
  
  if (type === "network") {
    return (
      <div className="h-52 rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center relative overflow-hidden group-hover:border-indigo-300 transition-colors">
        {/* Competitive comparison visualization */}
        <div className="absolute inset-0 p-6 flex items-center justify-center">
          {/* Your channel (center, larger) */}
          <div className="absolute w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg flex items-center justify-center z-10">
            <div className="text-center">
              <Award className="text-white mx-auto mb-1" size={24} />
              <span className="text-[8px] text-white font-bold">You</span>
            </div>
          </div>
          
          {/* Competitor 1 (left) */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-lg bg-slate-300 opacity-60 flex items-center justify-center">
            <Users className="text-slate-600" size={16} />
          </div>

          {/* Competitor 2 (right) */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-lg bg-slate-300 opacity-60 flex items-center justify-center">
            <Users className="text-slate-600" size={16} />
          </div>

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <line x1="50%" y1="50%" x2="25%" y2="50%" stroke="#818cf8" strokeWidth="2" opacity="0.4" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="75%" y2="50%" stroke="#818cf8" strokeWidth="2" opacity="0.4" strokeDasharray="4 4" />
          </svg>

          {/* Metrics comparison bars */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-2 bg-indigo-500 rounded-full" style={{ width: '85%' }}></div>
              <div className="h-2 bg-slate-300 rounded-full opacity-60" style={{ width: '60%' }}></div>
              <div className="h-2 bg-slate-300 rounded-full opacity-60" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
        
        <p className="relative z-10 text-[10px] text-slate-400 text-center px-4 mt-32 font-medium">
          Competitive performance comparison
        </p>
      </div>
    );
  }
  
  if (type === "growth") {
    return (
      <div className="h-52 rounded-xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-blue-300 transition-colors p-4">
        {/* Growth forecast chart */}
        <div className="w-full h-32 relative flex items-end justify-around gap-1 px-4">
          {/* Historical bars (past 3 months) */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-12 bg-gradient-to-t from-slate-400 to-slate-500 rounded-t-lg opacity-70"></div>
            <span className="text-[7px] text-slate-400">-3M</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-16 bg-gradient-to-t from-slate-400 to-slate-500 rounded-t-lg opacity-80"></div>
            <span className="text-[7px] text-slate-400">-2M</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-20 bg-gradient-to-t from-slate-400 to-slate-500 rounded-t-lg opacity-90"></div>
            <span className="text-[7px] text-slate-400">-1M</span>
          </div>

          {/* Current month */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-24 bg-gradient-to-t from-indigo-500 to-indigo-600 rounded-t-lg shadow-lg relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-[7px] text-indigo-600 font-bold">Now</span>
          </div>

          {/* Future predictions (dashed) */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-28 bg-gradient-to-t from-blue-400 to-blue-500 rounded-t-lg opacity-70 border-2 border-dashed border-blue-600"></div>
            <span className="text-[7px] text-blue-600">+3M</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-32 bg-gradient-to-t from-blue-300 to-blue-400 rounded-t-lg opacity-60 border-2 border-dashed border-blue-500"></div>
            <span className="text-[7px] text-blue-500">+6M</span>
          </div>

          {/* Trend arrow */}
          <div className="absolute top-2 right-4">
            <TrendingUp className="text-blue-600" size={20} />
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <Target className="text-blue-600" size={14} />
          <p className="text-[10px] text-slate-500 font-medium">Growth forecast & targets</p>
        </div>
      </div>
    );
  }
  
  return null;
}
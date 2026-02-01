// src/pages/analytics/AnalyticsOverview.jsx
import { Link } from "react-router-dom";
import { 
  TrendingUp, 
  Award, 
  Sparkles, 
  BarChart3, 
  Users, 
  Target,
  MessageSquare,
  ThumbsUp,
  Calendar,
  Zap
} from "lucide-react";

export default function AnalyticsOverview() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Analytics Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-3xl">
          Get actionable insights about your YouTube channel. Understand what content works, predict future growth, and learn what your audience thinks.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
        {/* 1. Video Performance Analysis */}
        <AnalyticsCard
          label="Content Strategy"
          title="Video Performance Analysis"
          badge="Must-see insights"
          description={
            <>
              Discover which videos are winning and which need improvement. Get instant recommendations on how to boost your channel's performance with actionable quick wins.
            </>
          }
          highlights={[
            "See your best performing videos at a glance",
            "Find hidden gems with great engagement but low views",
            "Get specific action items to improve underperforming content",
            "Visualize how your videos compare using interactive network graphs",
            "Track overall channel health score and consistency",
          ]}
          link="/dashboard/network"
          visualType="performance"
        />

        {/* 2. Growth Prediction */}
        <AnalyticsCard
          label="Future Planning"
          title="Subscriber Growth Prediction"
          badge="Plan ahead"
          description={
            <>
              See where your channel is heading. Get predictions for future subscriber counts based on your current growth patterns and upload consistency.
            </>
          }
          highlights={[
            "Forecast subscriber count for the next 6 months",
            "See when you'll hit major milestones (100K, 1M, etc.)",
            "Track your monthly growth rate and velocity",
            "Understand what's driving subscriber gains",
            "Compare historical performance vs. predictions",
          ]}
          link="/dashboard/predictive"
          visualType="growth"
        />

        {/* 3. Sentiment Analysis */}
        <AnalyticsCard
          label="Audience Insights"
          title="Comment Sentiment Analysis"
          badge="Know your audience"
          description={
            <>
              Understand how viewers really feel about your content. Analyze comment sentiment across your videos to spot trends and improve audience connection.
            </>
          }
          highlights={[
            "See positive, neutral, and negative feedback at a glance",
            "Identify which videos get the best reception",
            "Track sentiment changes over time",
            "Find common themes in viewer feedback",
            "Get suggestions for responding to negative comments",
          ]}
          link="/dashboard/sentiment"
          visualType="sentiment"
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
        <p className="text-[11px] font-medium uppercase tracking-wide text-sky-500">
          {label}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100">
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
      <div className="h-52 rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center relative overflow-hidden group-hover:border-indigo-300 transition-colors">
        {/* Network nodes visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Center node (larger) */}
          <div className="absolute w-16 h-16 rounded-full bg-indigo-500 opacity-80 flex items-center justify-center shadow-lg">
            <Award className="text-white" size={28} />
          </div>
          
          {/* Surrounding nodes */}
          <div className="absolute top-8 left-12 w-10 h-10 rounded-full bg-green-400 opacity-70 flex items-center justify-center shadow-md">
            <Sparkles className="text-white" size={16} />
          </div>
          <div className="absolute top-8 right-12 w-10 h-10 rounded-full bg-green-400 opacity-70 flex items-center justify-center shadow-md">
            <TrendingUp className="text-white" size={16} />
          </div>
          <div className="absolute bottom-8 left-16 w-10 h-10 rounded-full bg-amber-400 opacity-70 flex items-center justify-center shadow-md">
            <BarChart3 className="text-white" size={16} />
          </div>
          <div className="absolute bottom-8 right-16 w-10 h-10 rounded-full bg-purple-400 opacity-70 flex items-center justify-center shadow-md">
            <Target className="text-white" size={16} />
          </div>
          
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="#818cf8" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="#818cf8" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="30%" y2="80%" stroke="#818cf8" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="70%" y2="80%" stroke="#818cf8" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
          </svg>
        </div>
        
        <p className="relative z-10 text-[10px] text-slate-400 text-center px-4 mt-32 font-medium">
          Interactive network visualization
        </p>
      </div>
    );
  }
  
  if (type === "growth") {
    return (
      <div className="h-52 rounded-xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-emerald-300 transition-colors p-4">
        {/* Growth chart visualization */}
        <div className="w-full h-32 relative flex items-end justify-around gap-1 px-4">
          {/* Bars representing growth */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-12 bg-gradient-to-t from-blue-400 to-blue-500 rounded-t-lg opacity-80"></div>
            <span className="text-[8px] text-slate-400">Jan</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-16 bg-gradient-to-t from-blue-400 to-blue-500 rounded-t-lg opacity-80"></div>
            <span className="text-[8px] text-slate-400">Feb</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-20 bg-gradient-to-t from-blue-400 to-blue-500 rounded-t-lg opacity-80"></div>
            <span className="text-[8px] text-slate-400">Mar</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-24 bg-gradient-to-t from-emerald-400 to-emerald-500 rounded-t-lg opacity-90 shadow-lg relative">
              <TrendingUp className="absolute -top-6 left-1/2 -translate-x-1/2 text-emerald-600" size={20} />
            </div>
            <span className="text-[8px] text-emerald-600 font-semibold">Apr</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-28 bg-gradient-to-t from-emerald-400 to-emerald-500 rounded-t-lg opacity-70 border-2 border-dashed border-emerald-600"></div>
            <span className="text-[8px] text-slate-400">May</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-32 bg-gradient-to-t from-emerald-300 to-emerald-400 rounded-t-lg opacity-50 border-2 border-dashed border-emerald-500"></div>
            <span className="text-[8px] text-slate-400">Jun</span>
          </div>
          
          {/* Trend line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path d="M 30 85 Q 80 70, 130 60 T 230 30" stroke="#10b981" strokeWidth="2" fill="none" opacity="0.6" />
          </svg>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <Users className="text-emerald-600" size={16} />
          <p className="text-[10px] text-slate-500 font-medium">Subscriber growth forecast</p>
        </div>
      </div>
    );
  }
  
  if (type === "sentiment") {
    return (
      <div className="h-52 rounded-xl border-2 border-dashed border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-rose-300 transition-colors p-6">
        {/* Sentiment pie chart visualization */}
        <div className="relative w-32 h-32">
          {/* Pie chart segments */}
          <div className="absolute inset-0 rounded-full overflow-hidden shadow-lg">
            {/* Positive segment (120 degrees - 33%) */}
            <div 
              className="absolute inset-0 bg-green-400 opacity-80"
              style={{
                clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)',
              }}
            ></div>
            {/* Neutral segment (144 degrees - 40%) */}
            <div 
              className="absolute inset-0 bg-amber-400 opacity-80"
              style={{
                clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 70% 100%)',
              }}
            ></div>
            {/* Negative segment (96 degrees - 27%) */}
            <div 
              className="absolute inset-0 bg-red-400 opacity-80"
              style={{
                clipPath: 'polygon(50% 50%, 70% 100%, 50% 100%, 0% 100%, 0% 0%, 50% 0%)',
              }}
            ></div>
          </div>
          
          {/* Center circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white shadow-inner flex items-center justify-center">
              <MessageSquare className="text-slate-600" size={24} />
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-[9px] text-slate-500 font-medium">Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <span className="text-[9px] text-slate-500 font-medium">Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <span className="text-[9px] text-slate-500 font-medium">Negative</span>
          </div>
        </div>
        
        <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
          Audience sentiment breakdown
        </p>
      </div>
    );
  }
  
  return null;
}
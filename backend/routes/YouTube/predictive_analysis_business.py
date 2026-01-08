# backend/routes/YouTube/predictive_analysis_business.py

from flask import Blueprint, request, jsonify
import math
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
)

predictive_bp = Blueprint("predictive_analysis", __name__, url_prefix="/api/youtube")


def calculate_engagement_rate(videos):
    """Calculate engagement rate from video statistics"""
    if not videos:
        return 0
    
    total_views = sum(v.get("views", 0) for v in videos)
    total_engagement = sum(v.get("likes", 0) + v.get("comments", 0) for v in videos)
    
    return total_engagement / total_views if total_views > 0 else 0


def calculate_upload_frequency(videos):
    """Calculate average uploads per month from video publish dates"""
    if not videos or len(videos) < 2:
        return 0
    
    from datetime import datetime
    
    dates = []
    for v in videos:
        pub = v.get("publishedAt")
        if pub:
            try:
                dates.append(datetime.fromisoformat(pub.replace("Z", "+00:00")))
            except:
                pass
    
    if len(dates) < 2:
        return 0
    
    dates.sort()
    days_span = (dates[-1] - dates[0]).days
    months_span = max(1, days_span / 30.44)
    
    return len(videos) / months_span


def calculate_audience_overlap(primary_videos, influencer_videos):
    """
    Estimate audience overlap between two channels based on video performance patterns.
    Uses correlation of engagement rates across similar time periods.
    """
    if not primary_videos or not influencer_videos:
        return 0.1  # Default minimal overlap
    
    # Get engagement rates
    primary_engagement = [
        (v.get("likes", 0) + v.get("comments", 0)) / max(1, v.get("views", 1))
        for v in primary_videos
    ]
    influencer_engagement = [
        (v.get("likes", 0) + v.get("comments", 0)) / max(1, v.get("views", 1))
        for v in influencer_videos
    ]
    
    # Calculate correlation coefficient (simplified)
    n = min(len(primary_engagement), len(influencer_engagement))
    if n < 2:
        return 0.15
    
    p_eng = primary_engagement[:n]
    i_eng = influencer_engagement[:n]
    
    p_mean = sum(p_eng) / n
    i_mean = sum(i_eng) / n
    
    numerator = sum((p_eng[i] - p_mean) * (i_eng[i] - i_mean) for i in range(n))
    p_var = sum((x - p_mean) ** 2 for x in p_eng)
    i_var = sum((x - i_mean) ** 2 for x in i_eng)
    
    denominator = math.sqrt(p_var * i_var)
    
    if denominator == 0:
        return 0.15
    
    correlation = numerator / denominator
    
    # Convert correlation to overlap percentage (0.2 to 0.8 range)
    overlap = 0.2 + (abs(correlation) * 0.6)
    return min(0.8, max(0.1, overlap))


def calculate_network_influence(channel_stats, all_channels_stats):
    """
    Calculate network influence metrics for a channel.
    Returns degree centrality and betweenness approximation.
    """
    if not all_channels_stats or len(all_channels_stats) < 2:
        return {"degree_centrality": 0.5, "betweenness": 0.5}
    
    # Degree centrality: based on relative subscriber count
    subscribers = [c.get("subscriberCount", 0) for c in all_channels_stats]
    max_subs = max(subscribers) if subscribers else 1
    current_subs = channel_stats.get("subscriberCount", 0)
    
    degree_centrality = current_subs / max_subs if max_subs > 0 else 0.5
    
    # Betweenness: based on engagement rate relative to others
    engagements = [c.get("engagement_rate", 0) for c in all_channels_stats]
    avg_engagement = sum(engagements) / len(engagements) if engagements else 0
    current_engagement = channel_stats.get("engagement_rate", 0)
    
    betweenness = current_engagement / avg_engagement if avg_engagement > 0 else 0.5
    betweenness = min(1.0, max(0.1, betweenness))
    
    return {
        "degree_centrality": round(degree_centrality, 3),
        "betweenness": round(betweenness, 3)
    }


def predict_campaign_reach(channel_data, network_metrics, audience_overlap):
    """
    Predict campaign reach for an influencer channel.
    
    Formula:
    base_reach = avg_views_per_video
    engagement_multiplier = 1 + (engagement_rate * 2)
    network_multiplier = 1 + (degree_centrality * 0.3) + (betweenness * 0.2)
    overlap_penalty = 1 - (audience_overlap * 0.4)
    
    predicted_reach = base_reach * engagement_multiplier * network_multiplier * overlap_penalty
    """
    avg_views = channel_data.get("avg_views", 0)
    engagement_rate = channel_data.get("engagement_rate", 0)
    degree = network_metrics.get("degree_centrality", 0.5)
    betweenness = network_metrics.get("betweenness", 0.5)
    
    # Base reach
    base_reach = avg_views
    
    # Engagement multiplier (high engagement = more viral potential)
    engagement_multiplier = 1 + (engagement_rate * 2)
    
    # Network influence multiplier
    network_multiplier = 1 + (degree * 0.3) + (betweenness * 0.2)
    
    # Overlap penalty (reduce reach for overlapping audiences)
    overlap_penalty = 1 - (audience_overlap * 0.4)
    
    predicted_reach = base_reach * engagement_multiplier * network_multiplier * overlap_penalty
    
    # Calculate confidence level based on data quality
    data_points = channel_data.get("num_videos", 0)
    if data_points >= 20 and avg_views > 1000:
        confidence = "high"
    elif data_points >= 10 and avg_views > 500:
        confidence = "medium"
    else:
        confidence = "low"
    
    return {
        "predicted_reach": round(predicted_reach),
        "base_reach": round(base_reach),
        "engagement_multiplier": round(engagement_multiplier, 2),
        "network_multiplier": round(network_multiplier, 2),
        "overlap_penalty": round(overlap_penalty, 2),
        "confidence": confidence
    }


def calculate_roi(predicted_reach, cost, ctr, conversion_rate, avg_order_value):
    """
    Calculate ROI for a campaign.
    
    Formula:
    impressions = predicted_reach
    clicks = impressions * ctr
    conversions = clicks * conversion_rate
    revenue = conversions * avg_order_value
    roi = ((revenue - cost) / cost) * 100
    """
    impressions = predicted_reach
    clicks = impressions * ctr
    conversions = clicks * conversion_rate
    revenue = conversions * avg_order_value
    
    roi_percentage = ((revenue - cost) / cost * 100) if cost > 0 else 0
    
    # Classify ROI
    if roi_percentage >= 150:
        roi_class = "highly_profitable"
    elif roi_percentage >= 50:
        roi_class = "profitable"
    elif roi_percentage >= 0:
        roi_class = "break_even"
    else:
        roi_class = "risky"
    
    return {
        "impressions": round(impressions),
        "clicks": round(clicks),
        "conversions": round(conversions, 1),
        "revenue": round(revenue, 2),
        "cost": round(cost, 2),
        "roi_percentage": round(roi_percentage, 1),
        "roi_class": roi_class
    }


def analyze_growth_trend(videos):
    """
    Analyze growth trend using linear regression on recent videos.
    Returns growth direction, stability score, and risk label.
    """
    if not videos or len(videos) < 5:
        return {
            "direction": "stable",
            "stability_score": 0.5,
            "risk_label": "medium"
        }
    
    from datetime import datetime
    
    # Sort by publish date
    dated_videos = []
    for v in videos:
        pub = v.get("publishedAt")
        if pub:
            try:
                date = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                dated_videos.append({
                    "date": date,
                    "views": v.get("views", 0),
                    "engagement": (v.get("likes", 0) + v.get("comments", 0)) / max(1, v.get("views", 1))
                })
            except:
                pass
    
    dated_videos.sort(key=lambda x: x["date"])
    
    # Take last 12 videos
    recent = dated_videos[-12:]
    
    if len(recent) < 3:
        return {
            "direction": "stable",
            "stability_score": 0.5,
            "risk_label": "medium"
        }
    
    # Linear trend on views
    n = len(recent)
    x = list(range(n))
    y = [v["views"] for v in recent]
    
    x_mean = sum(x) / n
    y_mean = sum(y) / n
    
    numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
    
    slope = numerator / denominator if denominator != 0 else 0
    
    # Determine direction
    if slope > y_mean * 0.05:  # Growing more than 5% per video
        direction = "growing"
    elif slope < -y_mean * 0.05:  # Declining more than 5% per video
        direction = "declining"
    else:
        direction = "stable"
    
    # Calculate stability (coefficient of variation)
    std_dev = math.sqrt(sum((v - y_mean) ** 2 for v in y) / n)
    cv = std_dev / y_mean if y_mean > 0 else 1
    stability_score = max(0, min(1, 1 - cv))
    
    # Risk label
    if direction == "growing" and stability_score > 0.6:
        risk_label = "low"
    elif direction == "declining" or stability_score < 0.3:
        risk_label = "high"
    else:
        risk_label = "medium"
    
    return {
        "direction": direction,
        "stability_score": round(stability_score, 2),
        "risk_label": risk_label,
        "trend_slope": round(slope, 2)
    }


def generate_competitive_insights(primary_data, influencer_predictions):
    """
    Generate insights comparing primary channel with competitors
    """
    insights = []
    
    # Ranking comparisons
    all_channels = [primary_data] + [inf for inf in influencer_predictions]
    
    # ROI Ranking
    roi_values = [(primary_data["roi_prediction"]["roi_percentage"], "Your Channel", True)] + \
                 [(inf["roi_prediction"]["roi_percentage"], inf.get("channel_name", "Competitor"), False) 
                  for inf in influencer_predictions]
    roi_values.sort(key=lambda x: x[0], reverse=True)
    primary_roi_rank = next(i for i, (_, name, is_primary) in enumerate(roi_values, 1) if is_primary)
    
    # Reach Ranking
    reach_values = [(primary_data["reach_prediction"]["predicted_reach"], "Your Channel", True)] + \
                   [(inf["reach_prediction"]["predicted_reach"], inf.get("channel_name", "Competitor"), False) 
                    for inf in influencer_predictions]
    reach_values.sort(key=lambda x: x[0], reverse=True)
    primary_reach_rank = next(i for i, (_, name, is_primary) in enumerate(reach_values, 1) if is_primary)
    
    # Engagement Ranking
    engagement_values = [(primary_data["engagement_rate"], "Your Channel", True)] + \
                       [(inf["channel_stats"]["engagement_rate"], inf.get("channel_name", "Competitor"), False) 
                        for inf in influencer_predictions]
    engagement_values.sort(key=lambda x: x[0], reverse=True)
    primary_engagement_rank = next(i for i, (_, name, is_primary) in enumerate(engagement_values, 1) if is_primary)
    
    total_channels = len(all_channels)
    
    # Generate insights based on rankings
    if primary_roi_rank == 1:
        insights.append({
            "type": "success",
            "category": "roi",
            "title": "🏆 Best ROI Performance",
            "message": f"Your channel ranks #1 in ROI among all {total_channels} channels with {primary_data['roi_prediction']['roi_percentage']:.1f}% return.",
            "action": "Consider running solo campaigns to maximize profit margins."
        })
    elif primary_roi_rank <= total_channels / 2:
        insights.append({
            "type": "info",
            "category": "roi",
            "title": f"Above Average ROI (Rank #{primary_roi_rank})",
            "message": f"Your channel performs better than {total_channels - primary_roi_rank} competitors in ROI efficiency.",
            "action": "Maintain current strategy while exploring high-performing competitor tactics."
        })
    else:
        best_roi_channel = roi_values[0]
        improvement_needed = best_roi_channel[0] - primary_data["roi_prediction"]["roi_percentage"]
        insights.append({
            "type": "warning",
            "category": "roi",
            "title": f"ROI Improvement Needed (Rank #{primary_roi_rank})",
            "message": f"Your channel ranks #{primary_roi_rank} in ROI. Top performer achieves {improvement_needed:.1f}% higher ROI.",
            "action": "Focus on improving engagement rates and consider partnering with high-ROI influencers."
        })
    
    # Reach insights
    if primary_reach_rank == 1:
        insights.append({
            "type": "success",
            "category": "reach",
            "title": "🎯 Largest Campaign Reach",
            "message": f"Your channel has the highest predicted reach of {primary_data['reach_prediction']['predicted_reach']:,} impressions.",
            "action": "Leverage your reach advantage for brand awareness campaigns."
        })
    else:
        top_reach = reach_values[0][0]
        reach_gap = top_reach - primary_data["reach_prediction"]["predicted_reach"]
        reach_gap_percent = (reach_gap / top_reach * 100)
        insights.append({
            "type": "info",
            "category": "reach",
            "title": f"Reach Potential (Rank #{primary_reach_rank})",
            "message": f"Your reach is {reach_gap_percent:.1f}% below the top channel. Gap: {reach_gap:,} impressions.",
            "action": "Collaborate with high-reach influencers to expand your audience base."
        })
    
    # Engagement insights
    if primary_engagement_rank == 1:
        insights.append({
            "type": "success",
            "category": "engagement",
            "title": "💫 Highest Engagement Rate",
            "message": f"Your channel leads in engagement at {primary_data['engagement_rate']*100:.2f}%.",
            "action": "Capitalize on high engagement with conversion-focused campaigns."
        })
    elif primary_engagement_rank > total_channels / 2:
        top_engagement = engagement_values[0][0]
        engagement_gap = (top_engagement - primary_data["engagement_rate"]) * 100
        insights.append({
            "type": "warning",
            "category": "engagement",
            "title": f"Engagement Below Average (Rank #{primary_engagement_rank})",
            "message": f"Your engagement is {engagement_gap:.2f}% below the top performer.",
            "action": "Improve content quality, call-to-actions, and audience interaction to boost engagement."
        })
    
    # Growth direction insights
    if primary_data["growth_analysis"]["direction"] == "growing":
        insights.append({
            "type": "success",
            "category": "growth",
            "title": "📈 Positive Growth Trend",
            "message": "Your channel is showing upward momentum with growing viewership.",
            "action": "Scale up marketing efforts to capitalize on growth trajectory."
        })
    elif primary_data["growth_analysis"]["direction"] == "declining":
        insights.append({
            "type": "warning",
            "category": "growth",
            "title": "📉 Declining Performance",
            "message": "Your channel views are trending downward. Immediate action recommended.",
            "action": "Refresh content strategy, analyze top-performing videos, and engage with audience feedback."
        })
    
    # Subscriber comparison
    primary_subs = primary_data.get("subscriberCount", 0)
    avg_competitor_subs = sum(inf["channel_stats"]["subscribers"] for inf in influencer_predictions) / len(influencer_predictions) if influencer_predictions else 0
    
    if primary_subs > avg_competitor_subs * 1.5:
        insights.append({
            "type": "success",
            "category": "audience",
            "title": "💪 Strong Audience Base",
            "message": f"Your {primary_subs:,} subscribers exceed competitor average by {((primary_subs/avg_competitor_subs - 1) * 100):.0f}%.",
            "action": "Focus on monetization strategies to maximize existing audience value."
        })
    elif primary_subs < avg_competitor_subs * 0.5:
        insights.append({
            "type": "info",
            "category": "audience",
            "title": "🎯 Audience Growth Opportunity",
            "message": f"Competitors have {((avg_competitor_subs/primary_subs - 1) * 100):.0f}% larger audiences on average.",
            "action": "Invest in audience acquisition campaigns and cross-promotion with established influencers."
        })
    
    return insights


@predictive_bp.route("/campaigns.predictiveAnalysis", methods=["GET"])
def predictive_analysis():
    """
    Main endpoint for predictive campaign analysis.
    
    Query params:
    - primary_url: URL of the primary (business) channel
    - influencer_urls: Comma-separated URLs of influencer channels
    - max_videos: Number of recent videos to analyze (default 25)
    - cost_per_influencer: Cost per influencer (default 1000)
    - ctr: Click-through rate (default 0.02)
    - conversion_rate: Conversion rate (default 0.05)
    - avg_order_value: Average order value (default 50)
    """
    primary_url = request.args.get("primary_url")
    influencer_urls_param = request.args.get("influencer_urls")
    
    if not primary_url or not influencer_urls_param:
        return jsonify({"error": "Missing primary_url or influencer_urls parameter"}), 400
    
    try:
        max_videos = int(request.args.get("maxVideos", "25"))
        cost_per_influencer = float(request.args.get("cost_per_influencer", "1000"))
        ctr = float(request.args.get("ctr", "0.02"))
        conversion_rate = float(request.args.get("conversion_rate", "0.05"))
        avg_order_value = float(request.args.get("avg_order_value", "50"))
    except ValueError:
        return jsonify({"error": "Invalid numeric parameters"}), 400
    
    influencer_urls = [url.strip() for url in influencer_urls_param.split(",") if url.strip()]
    
    if not influencer_urls:
        return jsonify({"error": "No valid influencer URLs provided"}), 400
    
    # Fetch primary channel data
    primary_id = extract_channel_id(primary_url)
    if not primary_id:
        return jsonify({"error": "Invalid primary channel URL"}), 400
    
    primary_basic = fetch_basic_channel_stats(primary_id)
    if not primary_basic:
        return jsonify({"error": "Failed to fetch primary channel data"}), 400
    
    primary_video_ids = fetch_video_ids(primary_basic["uploadsPlaylistId"], max_videos)
    primary_videos = fetch_video_stats(primary_video_ids, with_snippet=True)
    
    primary_avg_views = sum(v["views"] for v in primary_videos) / len(primary_videos) if primary_videos else 0
    primary_engagement = calculate_engagement_rate(primary_videos)
    
    primary_data = {
        "channel_id": primary_id,
        "channel_url": primary_url,
        "subscriberCount": primary_basic["subscriberCount"],
        "videoCount": len(primary_videos),
        "viewCount": primary_basic["viewCount"],
        "avg_views": primary_avg_views,
        "engagement_rate": primary_engagement,
        "upload_frequency": calculate_upload_frequency(primary_videos),
        "num_videos": len(primary_videos)
    }
    
    # Fetch all influencer data
    influencer_predictions = []
    all_channels_stats = [primary_data]
    
    for inf_url in influencer_urls:
        inf_id = extract_channel_id(inf_url)
        if not inf_id:
            continue
        
        inf_basic = fetch_basic_channel_stats(inf_id)
        if not inf_basic:
            continue
        
        inf_video_ids = fetch_video_ids(inf_basic["uploadsPlaylistId"], max_videos)
        inf_videos = fetch_video_stats(inf_video_ids, with_snippet=True)
        
        if not inf_videos:
            continue
        
        inf_data = {
            "channel_id": inf_id,
            "channel_url": inf_url,
            "subscriberCount": inf_basic["subscriberCount"],
            "videoCount": len(inf_videos),
            "viewCount": inf_basic["viewCount"],
            "avg_views": sum(v["views"] for v in inf_videos) / len(inf_videos),
            "engagement_rate": calculate_engagement_rate(inf_videos),
            "upload_frequency": calculate_upload_frequency(inf_videos),
            "num_videos": len(inf_videos)
        }
        
        all_channels_stats.append(inf_data)
        
        # Calculate metrics
        audience_overlap = calculate_audience_overlap(primary_videos, inf_videos)
        network_metrics = calculate_network_influence(inf_data, all_channels_stats)
        reach_prediction = predict_campaign_reach(inf_data, network_metrics, audience_overlap)
        roi_prediction = calculate_roi(
            reach_prediction["predicted_reach"],
            cost_per_influencer,
            ctr,
            conversion_rate,
            avg_order_value
        )
        growth_analysis = analyze_growth_trend(inf_videos)
        
        influencer_predictions.append({
            "channel_url": inf_url,
            "channel_id": inf_id,
            "channel_stats": {
                "subscribers": inf_data["subscriberCount"],
                "avg_views": round(inf_data["avg_views"]),
                "engagement_rate": round(inf_data["engagement_rate"], 4),
                "upload_frequency": round(inf_data["upload_frequency"], 1),
                "video_count": inf_data["videoCount"]
            },
            "network_metrics": network_metrics,
            "audience_overlap": round(audience_overlap, 2),
            "reach_prediction": reach_prediction,
            "roi_prediction": roi_prediction,
            "growth_analysis": growth_analysis
        })
    
    if not influencer_predictions:
        return jsonify({"error": "No valid influencer data found"}), 404
    
    # Calculate PRIMARY CHANNEL metrics (as if running a solo campaign)
    primary_network_metrics = calculate_network_influence(primary_data, all_channels_stats)
    primary_reach_prediction = predict_campaign_reach(
        primary_data, 
        primary_network_metrics, 
        audience_overlap=0  # No overlap with itself
    )
    primary_roi_prediction = calculate_roi(
        primary_reach_prediction["predicted_reach"],
        cost_per_influencer,  # Same cost assumption
        ctr,
        conversion_rate,
        avg_order_value
    )
    primary_growth_analysis = analyze_growth_trend(primary_videos)
    
    # Build complete primary data object
    primary_channel_complete = {
        "channel_url": primary_url,
        "channel_id": primary_id,
        "subscribers": primary_data["subscriberCount"],
        "videoCount": len(primary_videos), 
        "avg_views": round(primary_avg_views),
        "engagement_rate": round(primary_engagement, 4),
        "upload_frequency": round(primary_data["upload_frequency"], 1),
        "video_count": primary_data["videoCount"],
        "network_metrics": primary_network_metrics,
        "reach_prediction": primary_reach_prediction,
        "roi_prediction": primary_roi_prediction,
        "growth_analysis": primary_growth_analysis,
        "subscriberCount": primary_data["subscriberCount"]
    }
    
    # Calculate combined campaign metrics
    total_reach = sum(p["reach_prediction"]["predicted_reach"] for p in influencer_predictions)
    total_cost = cost_per_influencer * len(influencer_predictions)
    
    combined_roi = calculate_roi(
        total_reach,
        total_cost,
        ctr,
        conversion_rate,
        avg_order_value
    )
    
    # Generate competitive insights
    competitive_insights = generate_competitive_insights(primary_channel_complete, influencer_predictions)
    
    # Generate general recommendations
    recommendations = []
    
    # Sort by ROI
    best_roi_influencer = max(influencer_predictions, key=lambda x: x["roi_prediction"]["roi_percentage"])
    if best_roi_influencer["roi_prediction"]["roi_percentage"] > 50:
        recommendations.append({
            "type": "success",
            "title": "High ROI Opportunity",
            "description": f"Channel with {best_roi_influencer['channel_stats']['subscribers']:,} subscribers shows {best_roi_influencer['roi_prediction']['roi_percentage']:.1f}% projected ROI.",
            "action": "Prioritize this influencer in your campaign budget allocation."
        })
    
    # Check for risky influencers
    risky = [p for p in influencer_predictions if p["growth_analysis"]["risk_label"] == "high"]
    if risky:
        recommendations.append({
            "type": "warning",
            "title": "Performance Risk Detected",
            "description": f"{len(risky)} influencer(s) showing declining or unstable performance trends.",
            "action": "Consider negotiating performance-based payment terms or selecting alternative influencers."
        })
    
    # Check audience overlap
    high_overlap = [p for p in influencer_predictions if p["audience_overlap"] > 0.6]
    if len(high_overlap) >= 2:
        recommendations.append({
            "type": "info",
            "title": "Audience Overlap Detected",
            "description": f"{len(high_overlap)} influencers have significant audience overlap with your primary channel.",
            "action": "Consider diversifying influencer selection to reach new audiences."
        })
    
    return jsonify({
        "primary_channel": primary_channel_complete,
        "influencer_predictions": influencer_predictions,
        "combined_campaign": {
            "total_reach": round(total_reach),
            "total_cost": total_cost,
            "num_influencers": len(influencer_predictions),
            "roi_prediction": combined_roi
        },
        "campaign_assumptions": {
            "ctr": ctr,
            "conversion_rate": conversion_rate,
            "avg_order_value": avg_order_value,
            "cost_per_influencer": cost_per_influencer
        },
        "competitive_insights": competitive_insights,
        "recommendations": recommendations
    }), 200
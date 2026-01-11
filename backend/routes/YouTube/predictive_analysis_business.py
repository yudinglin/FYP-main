# backend/routes/YouTube/predictive_analysis_business.py

from flask import Blueprint, request, jsonify
import math
from datetime import datetime
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


def calculate_avg_views(videos):
    """Calculate average views per video"""
    if not videos:
        return 0
    return sum(v.get("views", 0) for v in videos) / len(videos)


def calculate_growth_momentum(videos):
    """
    Calculate if channel is growing, stable, or declining
    Returns: 'growing', 'stable', 'declining' and a score 0-100
    """
    if not videos or len(videos) < 5:
        return {"trend": "stable", "score": 50}
    
    dated_videos = []
    for v in videos:
        pub = v.get("publishedAt")
        if pub:
            try:
                date = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                dated_videos.append({"date": date, "views": v.get("views", 0)})
            except:
                pass
    
    if len(dated_videos) < 5:
        return {"trend": "stable", "score": 50}
    
    dated_videos.sort(key=lambda x: x["date"])
    recent = dated_videos[-10:]
    
    # Compare recent half vs older half
    mid = len(recent) // 2
    old_avg = sum(v["views"] for v in recent[:mid]) / mid if mid > 0 else 0
    new_avg = sum(v["views"] for v in recent[mid:]) / (len(recent) - mid) if len(recent) - mid > 0 else 0
    
    if old_avg == 0:
        return {"trend": "stable", "score": 50}
    
    change_percent = ((new_avg - old_avg) / old_avg) * 100
    
    if change_percent > 15:
        trend = "growing"
        score = min(100, 65 + change_percent)
    elif change_percent < -15:
        trend = "declining"
        score = max(0, 50 + change_percent)
    else:
        trend = "stable"
        score = 50 + change_percent
    
    return {"trend": trend, "score": int(score)}


def calculate_content_consistency(videos):
    """How consistent is the channel's performance"""
    if not videos or len(videos) < 3:
        return 50
    
    views = [v.get("views", 0) for v in videos]
    avg_views = sum(views) / len(views)
    
    if avg_views == 0:
        return 50
    
    variance = sum((v - avg_views) ** 2 for v in views) / len(views)
    std_dev = math.sqrt(variance)
    cv = std_dev / avg_views  # Coefficient of variation
    
    # Lower CV = more consistent (better)
    consistency_score = max(0, min(100, 100 - (cv * 100)))
    return int(consistency_score)


def predict_campaign_reach(channel_data, cost):
    """
    Predict how many people a campaign will reach
    Based on: avg views, engagement, and subscriber count
    """
    avg_views = channel_data.get("avg_views", 0)
    engagement_rate = channel_data.get("engagement_rate", 0)
    subscribers = channel_data.get("subscriberCount", 0)
    
    # Base reach from average views
    base_reach = avg_views
    
    # Engagement boost (engaged audiences share more)
    engagement_multiplier = 1 + (engagement_rate * 2)
    
    # Subscriber base boost (larger audience = more reach potential)
    if subscribers > 100000:
        sub_multiplier = 1.3
    elif subscribers > 50000:
        sub_multiplier = 1.2
    elif subscribers > 10000:
        sub_multiplier = 1.1
    else:
        sub_multiplier = 1.0
    
    predicted_reach = base_reach * engagement_multiplier * sub_multiplier
    
    # Confidence based on data quality
    video_count = channel_data.get("video_count", 0)
    if video_count >= 15 and avg_views > 1000:
        confidence = "high"
    elif video_count >= 8 and avg_views > 500:
        confidence = "medium"
    else:
        confidence = "low"
    
    return {
        "predicted_reach": int(predicted_reach),
        "confidence": confidence
    }


def calculate_roi_prediction(reach, cost, product_price, ctr=0.02, conversion_rate=0.05):
    """
    Calculate expected ROI from a campaign
    """
    clicks = reach * ctr
    sales = clicks * conversion_rate
    revenue = sales * product_price
    profit = revenue - cost
    roi_percentage = (profit / cost * 100) if cost > 0 else 0
    
    return {
        "reach": int(reach),
        "clicks": int(clicks),
        "sales": round(sales, 1),
        "revenue": round(revenue, 2),
        "cost": cost,
        "profit": round(profit, 2),
        "roi_percentage": round(roi_percentage, 1)
    }


def calculate_audience_quality_score(videos, subscribers):
    """
    Calculate how valuable the audience is (0-100)
    Based on engagement and subscriber ratio
    """
    if not videos:
        return 50
    
    engagement_rate = calculate_engagement_rate(videos)
    avg_views = calculate_avg_views(videos)
    
    # Engagement score (0-50 points)
    engagement_score = min(50, engagement_rate * 10000)
    
    # View-to-subscriber ratio (0-50 points)
    if subscribers > 0:
        view_ratio = avg_views / subscribers
        ratio_score = min(50, view_ratio * 100)
    else:
        ratio_score = 25
    
    total_score = engagement_score + ratio_score
    return int(total_score)


def generate_competitive_analysis(primary_data, competitor_data_list):
    """
    Compare primary channel with competitors on key metrics
    """
    all_channels = [primary_data] + competitor_data_list
    
    # Rankings
    roi_ranking = sorted(enumerate(all_channels), key=lambda x: x[1]["roi_prediction"]["roi_percentage"], reverse=True)
    reach_ranking = sorted(enumerate(all_channels), key=lambda x: x[1]["campaign_reach"]["predicted_reach"], reverse=True)
    quality_ranking = sorted(enumerate(all_channels), key=lambda x: x[1]["audience_quality"], reverse=True)
    growth_ranking = sorted(enumerate(all_channels), key=lambda x: x[1]["growth_momentum"]["score"], reverse=True)
    
    primary_roi_rank = next(i+1 for i, (idx, _) in enumerate(roi_ranking) if idx == 0)
    primary_reach_rank = next(i+1 for i, (idx, _) in enumerate(reach_ranking) if idx == 0)
    primary_quality_rank = next(i+1 for i, (idx, _) in enumerate(quality_ranking) if idx == 0)
    primary_growth_rank = next(i+1 for i, (idx, _) in enumerate(growth_ranking) if idx == 0)
    
    # Calculate averages
    avg_roi = sum(c["roi_prediction"]["roi_percentage"] for c in competitor_data_list) / len(competitor_data_list) if competitor_data_list else 0
    avg_reach = sum(c["campaign_reach"]["predicted_reach"] for c in competitor_data_list) / len(competitor_data_list) if competitor_data_list else 0
    avg_quality = sum(c["audience_quality"] for c in competitor_data_list) / len(competitor_data_list) if competitor_data_list else 0
    
    # Find strengths and weaknesses
    strengths = []
    weaknesses = []
    
    if primary_roi_rank == 1:
        strengths.append("Best ROI among all channels")
    elif primary_roi_rank <= len(all_channels) / 2:
        strengths.append(f"Above average ROI (ranked #{primary_roi_rank})")
    else:
        weaknesses.append(f"Below average ROI (ranked #{primary_roi_rank} out of {len(all_channels)})")
    
    if primary_reach_rank == 1:
        strengths.append("Largest potential reach")
    elif primary_reach_rank > len(all_channels) / 2:
        weaknesses.append(f"Limited reach compared to competitors")
    
    if primary_quality_rank <= len(all_channels) / 2:
        strengths.append("High quality engaged audience")
    else:
        weaknesses.append("Audience engagement could be improved")
    
    if primary_data["growth_momentum"]["trend"] == "growing":
        strengths.append("Channel is actively growing")
    elif primary_data["growth_momentum"]["trend"] == "declining":
        weaknesses.append("Channel performance is declining")
    
    return {
        "rankings": {
            "roi": primary_roi_rank,
            "reach": primary_reach_rank,
            "audience_quality": primary_quality_rank,
            "growth": primary_growth_rank,
            "total_channels": len(all_channels)
        },
        "vs_competitors": {
            "roi_difference": round(primary_data["roi_prediction"]["roi_percentage"] - avg_roi, 1),
            "reach_difference": int(primary_data["campaign_reach"]["predicted_reach"] - avg_reach),
            "quality_difference": int(primary_data["audience_quality"] - avg_quality)
        },
        "strengths": strengths,
        "weaknesses": weaknesses
    }


def generate_recommendations(primary_data, competitive_analysis):
    """
    Generate actionable recommendations based on analysis
    """
    recommendations = []
    
    roi = primary_data["roi_prediction"]["roi_percentage"]
    growth = primary_data["growth_momentum"]["trend"]
    roi_rank = competitive_analysis["rankings"]["roi"]
    total = competitive_analysis["rankings"]["total_channels"]
    
    # ROI-based recommendations
    if roi >= 100:
        recommendations.append({
            "type": "success",
            "category": "profitability",
            "title": "Excellent ROI Potential",
            "message": f"Your campaigns could return {roi:.0f}% - every $100 spent could make ${roi + 100:.0f}",
            "action": "Consider increasing marketing budget to scale profitable campaigns"
        })
    elif roi >= 50:
        recommendations.append({
            "type": "info",
            "category": "profitability",
            "title": "Good ROI Potential",
            "message": f"Your campaigns are profitable at {roi:.0f}% ROI",
            "action": "Test campaigns with small budgets before scaling"
        })
    else:
        recommendations.append({
            "type": "warning",
            "category": "profitability",
            "title": "Low ROI Warning",
            "message": f"Current ROI projection is only {roi:.0f}% - may not be profitable",
            "action": "Focus on growing your audience and engagement before heavy marketing spend"
        })
    
    # Growth-based recommendations
    if growth == "growing":
        recommendations.append({
            "type": "success",
            "category": "growth",
            "title": "Positive Growth Momentum",
            "message": "Your channel is trending upward - good time to invest",
            "action": "Capitalize on growth with consistent content and promotion"
        })
    elif growth == "declining":
        recommendations.append({
            "type": "warning",
            "category": "growth",
            "title": "Declining Performance",
            "message": "Your recent videos are getting fewer views than older ones",
            "action": "Review your content strategy and analyze what worked in successful videos"
        })
    
    # Competitive recommendations
    if roi_rank > total / 2:
        recommendations.append({
            "type": "info",
            "category": "competition",
            "title": "Learn from Top Performers",
            "message": f"You're ranked #{roi_rank} out of {total} channels",
            "action": "Study what the top-ranked channels are doing differently"
        })
    
    # Audience quality recommendations
    if primary_data["audience_quality"] < 40:
        recommendations.append({
            "type": "info",
            "category": "audience",
            "title": "Improve Audience Engagement",
            "message": "Your audience engagement metrics could be stronger",
            "action": "Encourage likes, comments, and shares in your videos"
        })
    
    return recommendations


@predictive_bp.route("/business.analysis", methods=["GET"])
def business_analysis():
    """
    Main endpoint for business channel analysis
    
    Query params:
    - primary_url: URL of the primary (business) channel
    - competitor_urls: Comma-separated URLs of competitor channels
    - campaign_budget: Marketing budget per campaign (default 1000)
    - product_price: Price of product/service (default 50)
    - ctr: Click-through rate (default 0.02)
    - conversion_rate: Conversion rate (default 0.05)
    """
    primary_url = request.args.get("primary_url")
    competitor_urls_param = request.args.get("competitor_urls")
    
    if not primary_url:
        return jsonify({"error": "Missing primary_url parameter"}), 400
    
    try:
        campaign_budget = float(request.args.get("campaign_budget", "1000"))
        product_price = float(request.args.get("product_price", "50"))
        ctr = float(request.args.get("ctr", "0.02"))
        conversion_rate = float(request.args.get("conversion_rate", "0.05"))
        max_videos = int(request.args.get("max_videos", "25"))
    except ValueError:
        return jsonify({"error": "Invalid numeric parameters"}), 400
    
    # Fetch primary channel
    primary_id = extract_channel_id(primary_url)
    if not primary_id:
        return jsonify({"error": "Invalid primary channel URL"}), 400
    
    primary_basic = fetch_basic_channel_stats(primary_id)
    if not primary_basic:
        return jsonify({"error": "Failed to fetch primary channel data"}), 400
    
    primary_video_ids = fetch_video_ids(primary_basic["uploadsPlaylistId"], max_videos)
    primary_videos = fetch_video_stats(primary_video_ids, with_snippet=True)
    
    # Calculate primary channel metrics
    primary_avg_views = calculate_avg_views(primary_videos)
    primary_engagement = calculate_engagement_rate(primary_videos)
    primary_growth = calculate_growth_momentum(primary_videos)
    primary_consistency = calculate_content_consistency(primary_videos)
    primary_audience_quality = calculate_audience_quality_score(primary_videos, primary_basic["subscriberCount"])
    
    primary_reach = predict_campaign_reach({
        "avg_views": primary_avg_views,
        "engagement_rate": primary_engagement,
        "subscriberCount": primary_basic["subscriberCount"],
        "video_count": len(primary_videos)
    }, campaign_budget)
    
    primary_roi = calculate_roi_prediction(
        primary_reach["predicted_reach"],
        campaign_budget,
        product_price,
        ctr,
        conversion_rate
    )
    
    primary_data = {
        "channel_id": primary_id,
        "channel_url": primary_url,
        "subscribers": primary_basic["subscriberCount"],
        "total_views": primary_basic["viewCount"],
        "video_count": len(primary_videos),
        "avg_views_per_video": int(primary_avg_views),
        "engagement_rate": round(primary_engagement, 4),
        "growth_momentum": primary_growth,
        "consistency_score": primary_consistency,
        "audience_quality": primary_audience_quality,
        "campaign_reach": primary_reach,
        "roi_prediction": primary_roi
    }
    
    # Fetch competitor channels
    competitor_data_list = []
    if competitor_urls_param:
        competitor_urls = [url.strip() for url in competitor_urls_param.split(",") if url.strip()]
        
        for comp_url in competitor_urls:
            comp_id = extract_channel_id(comp_url)
            if not comp_id:
                continue
            
            comp_basic = fetch_basic_channel_stats(comp_id)
            if not comp_basic:
                continue
            
            comp_video_ids = fetch_video_ids(comp_basic["uploadsPlaylistId"], max_videos)
            comp_videos = fetch_video_stats(comp_video_ids, with_snippet=True)
            
            if not comp_videos:
                continue
            
            comp_avg_views = calculate_avg_views(comp_videos)
            comp_engagement = calculate_engagement_rate(comp_videos)
            comp_growth = calculate_growth_momentum(comp_videos)
            comp_consistency = calculate_content_consistency(comp_videos)
            comp_audience_quality = calculate_audience_quality_score(comp_videos, comp_basic["subscriberCount"])
            
            comp_reach = predict_campaign_reach({
                "avg_views": comp_avg_views,
                "engagement_rate": comp_engagement,
                "subscriberCount": comp_basic["subscriberCount"],
                "video_count": len(comp_videos)
            }, campaign_budget)
            
            comp_roi = calculate_roi_prediction(
                comp_reach["predicted_reach"],
                campaign_budget,
                product_price,
                ctr,
                conversion_rate
            )
            
            competitor_data_list.append({
                "channel_id": comp_id,
                "channel_url": comp_url,
                "subscribers": comp_basic["subscriberCount"],
                "total_views": comp_basic["viewCount"],
                "video_count": len(comp_videos),
                "avg_views_per_video": int(comp_avg_views),
                "engagement_rate": round(comp_engagement, 4),
                "growth_momentum": comp_growth,
                "consistency_score": comp_consistency,
                "audience_quality": comp_audience_quality,
                "campaign_reach": comp_reach,
                "roi_prediction": comp_roi
            })
    
    # Generate competitive analysis and recommendations
    competitive_analysis = None
    recommendations = []
    
    if competitor_data_list:
        competitive_analysis = generate_competitive_analysis(primary_data, competitor_data_list)
        recommendations = generate_recommendations(primary_data, competitive_analysis)
    else:
        recommendations = generate_recommendations(primary_data, {
            "rankings": {"roi": 1, "reach": 1, "audience_quality": 1, "growth": 1, "total_channels": 1},
            "vs_competitors": {"roi_difference": 0, "reach_difference": 0, "quality_difference": 0},
            "strengths": [],
            "weaknesses": []
        })
    
    return jsonify({
        "primary_channel": primary_data,
        "competitors": competitor_data_list,
        "competitive_analysis": competitive_analysis,
        "recommendations": recommendations,
        "campaign_settings": {
            "budget": campaign_budget,
            "product_price": product_price,
            "ctr": ctr,
            "conversion_rate": conversion_rate
        }
    }), 200
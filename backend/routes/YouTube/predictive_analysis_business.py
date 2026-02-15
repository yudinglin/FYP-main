# backend/routes/YouTube/predictive_analysis_business.py

from flask import Blueprint, request, jsonify
import math
from datetime import datetime, timedelta
from utils.youtube_utils import (
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


def predict_subscriber_growth(videos, current_subscribers):
    """
    Predict subscriber growth for 3, 6, and 12 months
    Returns detailed growth predictions with confidence levels
    """
    if not videos or len(videos) < 3:
        return {
            "predicted_3_months": current_subscribers,
            "predicted_6_months": current_subscribers,
            "predicted_12_months": current_subscribers,
            "growth_3_months": 0,
            "growth_6_months": 0,
            "growth_12_months": 0,
            "monthly_avg_growth": 0,
            "growth_rate_6_months": 0,
            "confidence": "low",
            "trend_strength": 0,
            "monthly_growth_rate": 0
        }
    
    # Get videos with dates
    dated_videos = []
    for v in videos:
        pub = v.get("publishedAt")
        if pub:
            try:
                date = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                engagement = 0
                views = v.get("views", 0)
                if views > 0:
                    engagement = (v.get("likes", 0) + v.get("comments", 0)) / views
                dated_videos.append({
                    "date": date,
                    "views": views,
                    "engagement": engagement
                })
            except:
                pass
    
    if len(dated_videos) < 3:
        return {
            "predicted_3_months": current_subscribers,
            "predicted_6_months": current_subscribers,
            "predicted_12_months": current_subscribers,
            "growth_3_months": 0,
            "growth_6_months": 0,
            "growth_12_months": 0,
            "monthly_avg_growth": 0,
            "growth_rate_6_months": 0,
            "confidence": "low",
            "trend_strength": 0,
            "monthly_growth_rate": 0
        }
    
    dated_videos.sort(key=lambda x: x["date"])
    
    # Calculate time span
    first_date = dated_videos[0]["date"]
    last_date = dated_videos[-1]["date"]
    days_span = (last_date - first_date).days
    
    if days_span < 30:
        confidence = "low"
        months_of_data = days_span / 30
    elif days_span < 90:
        confidence = "medium"
        months_of_data = days_span / 30
    else:
        confidence = "high"
        months_of_data = days_span / 30
    
    # Calculate growth trend using linear regression on recent performance
    recent_videos = dated_videos[-15:] if len(dated_videos) > 15 else dated_videos
    
    # Estimate historical subscriber count based on view patterns
    avg_engagement = sum(v["engagement"] for v in recent_videos) / len(recent_videos)
    avg_views = sum(v["views"] for v in recent_videos) / len(recent_videos)
    
    # Estimate monthly growth rate based on video performance
    # Better engagement and views = higher growth rate
    base_growth_rate = 0.02  # 2% base monthly growth
    
    # Engagement boost (up to 3% additional)
    engagement_boost = min(avg_engagement * 100, 0.03)
    
    # Views boost (up to 2% additional based on view velocity)
    if avg_views > 100000:
        views_boost = 0.02
    elif avg_views > 50000:
        views_boost = 0.015
    elif avg_views > 10000:
        views_boost = 0.01
    elif avg_views > 1000:
        views_boost = 0.005
    else:
        views_boost = 0.002
    
    monthly_growth_rate = base_growth_rate + engagement_boost + views_boost
    
    # Calculate trend strength (0-100)
    recent_half = recent_videos[len(recent_videos)//2:]
    older_half = recent_videos[:len(recent_videos)//2]
    
    if len(recent_half) > 0 and len(older_half) > 0:
        recent_avg_views = sum(v["views"] for v in recent_half) / len(recent_half)
        older_avg_views = sum(v["views"] for v in older_half) / len(older_half)
        
        if older_avg_views > 0:
            trend_change = ((recent_avg_views - older_avg_views) / older_avg_views) * 100
            trend_strength = min(100, max(0, 50 + trend_change))
        else:
            trend_strength = 50
    else:
        trend_strength = 50
    
    # Adjust growth rate based on trend
    if trend_strength > 70:
        monthly_growth_rate *= 1.3  # Accelerating growth
    elif trend_strength < 30:
        monthly_growth_rate *= 0.7  # Declining growth
    
    # Calculate predictions using compound growth
    predicted_3_months = int(current_subscribers * ((1 + monthly_growth_rate) ** 3))
    predicted_6_months = int(current_subscribers * ((1 + monthly_growth_rate) ** 6))
    predicted_12_months = int(current_subscribers * ((1 + monthly_growth_rate) ** 12))
    
    growth_3_months = predicted_3_months - current_subscribers
    growth_6_months = predicted_6_months - current_subscribers
    growth_12_months = predicted_12_months - current_subscribers
    
    monthly_avg_growth = int(growth_6_months / 6)
    growth_rate_6_months = (growth_6_months / current_subscribers * 100) if current_subscribers > 0 else 0
    
    return {
        "predicted_3_months": predicted_3_months,
        "predicted_6_months": predicted_6_months,
        "predicted_12_months": predicted_12_months,
        "growth_3_months": growth_3_months,
        "growth_6_months": growth_6_months,
        "growth_12_months": growth_12_months,
        "monthly_avg_growth": monthly_avg_growth,
        "growth_rate_6_months": round(growth_rate_6_months, 2),
        "confidence": confidence,
        "trend_strength": int(trend_strength),
        "monthly_growth_rate": round(monthly_growth_rate * 100, 2)
    }


def predict_engagement_growth(videos, current_engagement):
    """
    Predict how engagement will change over the next 6 months
    """
    if not videos or len(videos) < 5:
        return {
            "current_engagement_rate": current_engagement,
            "predicted_6m_engagement": current_engagement,
            "engagement_change": 0,
            "engagement_change_percent": 0,
            "trend": "stable",
            "factors": []
        }
    
    # Get videos with dates and engagement
    dated_videos = []
    for v in videos:
        pub = v.get("publishedAt")
        if pub:
            try:
                date = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                views = v.get("views", 0)
                engagement = 0
                if views > 0:
                    engagement = (v.get("likes", 0) + v.get("comments", 0)) / views
                dated_videos.append({"date": date, "engagement": engagement})
            except:
                pass
    
    if len(dated_videos) < 5:
        return {
            "current_engagement_rate": current_engagement,
            "predicted_6m_engagement": current_engagement,
            "engagement_change": 0,
            "engagement_change_percent": 0,
            "trend": "stable",
            "factors": []
        }
    
    dated_videos.sort(key=lambda x: x["date"])
    
    # Split into thirds to analyze trend
    third = len(dated_videos) // 3
    old_third = dated_videos[:third]
    mid_third = dated_videos[third:2*third]
    recent_third = dated_videos[2*third:]
    
    avg_old = sum(v["engagement"] for v in old_third) / len(old_third) if old_third else 0
    avg_mid = sum(v["engagement"] for v in mid_third) / len(mid_third) if mid_third else 0
    avg_recent = sum(v["engagement"] for v in recent_third) / len(recent_third) if recent_third else 0
    
    # Calculate trend
    if avg_old > 0:
        change_to_mid = ((avg_mid - avg_old) / avg_old) if avg_old > 0 else 0
        change_to_recent = ((avg_recent - avg_mid) / avg_mid) if avg_mid > 0 else 0
        avg_change_rate = (change_to_mid + change_to_recent) / 2
    else:
        avg_change_rate = 0
    
    # Project 6 months forward (assuming trend continues)
    predicted_6m_engagement = current_engagement * (1 + avg_change_rate * 2)  # 2 periods forward
    predicted_6m_engagement = max(0, min(predicted_6m_engagement, current_engagement * 1.5))  # Cap at 50% increase
    
    engagement_change = predicted_6m_engagement - current_engagement
    
    # Determine trend
    if avg_change_rate > 0.1:
        trend = "improving"
    elif avg_change_rate < -0.1:
        trend = "declining"
    else:
        trend = "stable"
    
    # Identify factors
    factors = []
    if avg_recent > avg_mid and avg_mid > avg_old:
        factors.append("Consistent engagement improvement across recent videos")
    elif avg_recent < avg_mid:
        factors.append("Recent drop in engagement - review content strategy")
    
    if current_engagement > 0.03:
        factors.append("Above-average engagement - audience is highly engaged")
    elif current_engagement < 0.01:
        factors.append("Below-average engagement - opportunity to improve interaction")
    
    return {
        "current_engagement_rate": round(current_engagement, 4),
        "predicted_6m_engagement": round(predicted_6m_engagement, 4),
        "engagement_change": round(engagement_change, 4),
        "engagement_change_percent": round((engagement_change / current_engagement * 100) if current_engagement > 0 else 0, 2),
        "trend": trend,
        "factors": factors
    }


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


def compare_growth_timelines(primary_predictions, competitor_predictions_list, primary_name, competitor_names):
    """
    Compare when channels will reach specific subscriber milestones
    """
    comparisons = []
    
    primary_current = primary_predictions.get("current_subscribers", 0)
    primary_6m = primary_predictions.get("predicted_6_months", 0)
    primary_12m = primary_predictions.get("predicted_12_months", 0)
    primary_growth_rate = primary_predictions.get("monthly_growth_rate", 0)
    
    for i, comp_pred in enumerate(competitor_predictions_list):
        comp_name = competitor_names[i] if i < len(competitor_names) else f"Competitor {i+1}"
        comp_current = comp_pred.get("current_subscribers", 0)
        comp_6m = comp_pred.get("predicted_6_months", 0)
        comp_growth_rate = comp_pred.get("monthly_growth_rate", 0)
        
        # Find when primary will reach competitor's current size
        months_to_match_current = None
        if primary_current < comp_current and primary_growth_rate > 0:
            # Calculate months needed using compound growth formula
            # target = current * (1 + rate)^months
            # months = log(target/current) / log(1 + rate)
            try:
                months = math.log(comp_current / primary_current) / math.log(1 + primary_growth_rate / 100)
                if months > 0 and months < 60:  # Only if within 5 years
                    months_to_match_current = round(months, 1)
            except:
                pass
        
        # Find when competitor will reach primary's current size
        months_for_comp_to_match = None
        if comp_current < primary_current and comp_growth_rate > 0:
            try:
                months = math.log(primary_current / comp_current) / math.log(1 + comp_growth_rate / 100)
                if months > 0 and months < 60:
                    months_for_comp_to_match = round(months, 1)
            except:
                pass
        
        # Compare 6-month growth rates
        growth_diff = (primary_6m - primary_current) - (comp_6m - comp_current)
        
        # Determine who's growing faster
        if primary_growth_rate > comp_growth_rate * 1.2:
            growth_comparison = "significantly_faster"
        elif primary_growth_rate > comp_growth_rate * 1.05:
            growth_comparison = "faster"
        elif primary_growth_rate < comp_growth_rate * 0.8:
            growth_comparison = "significantly_slower"
        elif primary_growth_rate < comp_growth_rate * 0.95:
            growth_comparison = "slower"
        else:
            growth_comparison = "similar"
        
        comparisons.append({
            "competitor_name": comp_name,
            "competitor_index": i,
            "current_size_diff": primary_current - comp_current,
            "growth_rate_diff": round(primary_growth_rate - comp_growth_rate, 2),
            "6m_growth_diff": int(growth_diff),
            "months_to_match_their_size": months_to_match_current,
            "months_for_them_to_match_you": months_for_comp_to_match,
            "growth_comparison": growth_comparison,
            "is_ahead": primary_current > comp_current,
            "will_overtake_in_6m": primary_current < comp_current and primary_6m > comp_6m
        })
    
    return comparisons


def generate_competitive_insights(primary_data, competitor_data_list, growth_comparisons):
    """
    Generate actionable insights based on competitive analysis
    """
    insights = {
        "strengths": [],
        "opportunities": [],
        "action_items": []
    }
    
    primary_quality = primary_data.get("audience_quality", 50)
    primary_engagement = primary_data.get("engagement_rate", 0)
    primary_growth_rate = primary_data.get("subscriber_predictions", {}).get("monthly_growth_rate", 0)
    
    # Calculate averages
    if competitor_data_list:
        avg_comp_quality = sum(c.get("audience_quality", 50) for c in competitor_data_list) / len(competitor_data_list)
        avg_comp_engagement = sum(c.get("engagement_rate", 0) for c in competitor_data_list) / len(competitor_data_list)
        avg_comp_growth = sum(c.get("subscriber_predictions", {}).get("monthly_growth_rate", 0) for c in competitor_data_list) / len(competitor_data_list)
    else:
        avg_comp_quality = primary_quality
        avg_comp_engagement = primary_engagement
        avg_comp_growth = primary_growth_rate
    
    # Identify strengths
    if primary_quality > avg_comp_quality * 1.1:
        insights["strengths"].append({
            "area": "Audience Quality",
            "message": f"Your audience quality score ({primary_quality}) is {int((primary_quality/avg_comp_quality - 1) * 100)}% higher than competitors",
            "impact": "high"
        })
    
    if primary_engagement > avg_comp_engagement * 1.15:
        insights["strengths"].append({
            "area": "Engagement",
            "message": f"Your engagement rate is {int((primary_engagement/avg_comp_engagement - 1) * 100)}% above competitors",
            "impact": "high"
        })
    
    if primary_growth_rate > avg_comp_growth * 1.1:
        insights["strengths"].append({
            "area": "Growth Rate",
            "message": f"You're growing {int((primary_growth_rate/avg_comp_growth - 1) * 100)}% faster than average",
            "impact": "high"
        })
    
    # Identify opportunities
    if primary_quality < avg_comp_quality * 0.9:
        insights["opportunities"].append({
            "area": "Audience Quality",
            "message": f"Your audience quality is {int((1 - primary_quality/avg_comp_quality) * 100)}% below competitors",
            "impact": "medium",
            "action": "Focus on creating content that drives more likes and comments"
        })
    
    if primary_engagement < avg_comp_engagement * 0.85:
        insights["opportunities"].append({
            "area": "Engagement",
            "message": f"Your engagement is {int((1 - primary_engagement/avg_comp_engagement) * 100)}% below competitors",
            "impact": "high",
            "action": "Add clear calls-to-action in videos and respond to comments quickly"
        })
    
    if primary_growth_rate < avg_comp_growth * 0.9:
        insights["opportunities"].append({
            "area": "Growth Rate",
            "message": f"Your growth rate is {int((1 - primary_growth_rate/avg_comp_growth) * 100)}% slower than competitors",
            "impact": "high",
            "action": "Analyze competitor content strategies and increase upload frequency"
        })
    
    # Generate action items based on comparisons
    faster_growing = [gc for gc in growth_comparisons if gc["growth_comparison"] in ["faster", "significantly_faster"]]
    slower_growing = [gc for gc in growth_comparisons if gc["growth_comparison"] in ["slower", "significantly_slower"]]
    
    if len(slower_growing) > len(faster_growing):
        insights["action_items"].append({
            "priority": "high",
            "category": "growth",
            "title": "Accelerate Your Growth",
            "description": f"You're growing slower than {len(slower_growing)} out of {len(growth_comparisons)} competitors",
            "actions": [
                "Increase upload frequency to at least weekly",
                "Study what makes your competitors' top videos successful",
                "Optimize titles and thumbnails for higher click-through rates"
            ]
        })
    
    if primary_engagement < 0.02:
        insights["action_items"].append({
            "priority": "high",
            "category": "engagement",
            "title": "Boost Audience Interaction",
            "description": "Your engagement rate is below industry average",
            "actions": [
                "Ask questions in your videos to encourage comments",
                "Create community posts to keep viewers engaged between uploads",
                "Respond to comments within the first hour of posting"
            ]
        })
    
    # Find overtaking opportunities
    will_overtake = [gc for gc in growth_comparisons if gc.get("will_overtake_in_6m")]
    if will_overtake:
        insights["action_items"].append({
            "priority": "medium",
            "category": "growth",
            "title": "Overtaking Opportunity",
            "description": f"You're on track to surpass {len(will_overtake)} competitor(s) in the next 6 months",
            "actions": [
                "Maintain your current content quality and consistency",
                "Consider collaborations to accelerate growth",
                "Double down on your most successful content types"
            ]
        })
    
    return insights


@predictive_bp.route("/business.analysis", methods=["GET"])
def business_analysis():
    """
    Main endpoint for business channel analysis with predictive insights
    """
    primary_url = request.args.get("primary_url")
    competitor_urls_param = request.args.get("competitor_urls")
    
    if not primary_url:
        return jsonify({"error": "Missing primary_url parameter"}), 400
    
    try:
        max_videos = int(request.args.get("max_videos", "50"))
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
    
    # NEW: Subscriber predictions
    primary_sub_predictions = predict_subscriber_growth(primary_videos, primary_basic["subscriberCount"])
    primary_sub_predictions["current_subscribers"] = primary_basic["subscriberCount"]
    
    # NEW: Engagement predictions
    primary_engagement_predictions = predict_engagement_growth(primary_videos, primary_engagement)
    
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
        "subscriber_predictions": primary_sub_predictions,
        "engagement_predictions": primary_engagement_predictions
    }
    
    # Fetch competitor channels
    competitor_data_list = []
    competitor_names = []
    
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
            
            # NEW: Competitor predictions
            comp_sub_predictions = predict_subscriber_growth(comp_videos, comp_basic["subscriberCount"])
            comp_sub_predictions["current_subscribers"] = comp_basic["subscriberCount"]
            comp_engagement_predictions = predict_engagement_growth(comp_videos, comp_engagement)
            
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
                "subscriber_predictions": comp_sub_predictions,
                "engagement_predictions": comp_engagement_predictions
            })
            
            competitor_names.append(f"Competitor {len(competitor_names) + 1}")
    
    # NEW: Growth timeline comparisons
    growth_comparisons = []
    if competitor_data_list:
        competitor_predictions = [c["subscriber_predictions"] for c in competitor_data_list]
        growth_comparisons = compare_growth_timelines(
            primary_sub_predictions,
            competitor_predictions,
            "Your Channel",
            competitor_names
        )
    
    # NEW: Competitive insights
    competitive_insights = generate_competitive_insights(
        primary_data,
        competitor_data_list,
        growth_comparisons
    )
    
    return jsonify({
        "primary_channel": primary_data,
        "competitors": competitor_data_list,
        "growth_comparisons": growth_comparisons,
        "competitive_insights": competitive_insights
    }), 200

# backend/routes/YouTube/audience_resonance.py

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
    fetch_video_comments,
)
from collections import Counter, defaultdict
import re
from datetime import datetime, timedelta

bp = Blueprint("audience_resonance", __name__)


def analyze_engagement_patterns(videos):
    """
    Analyze engagement patterns across videos to identify what resonates.
    Returns engagement rate, comment sentiment indicators, and performance tiers.
    """
    if not videos:
        return {}

    engagement_data = []
    for v in videos:
        views = v.get("views", 0)
        likes = v.get("likes", 0)
        comments = v.get("comments", 0)
        
        if views > 0:
            engagement_rate = ((likes + comments * 2) / views) * 100
            like_rate = (likes / views) * 100
            comment_rate = (comments / views) * 100
        else:
            engagement_rate = 0
            like_rate = 0
            comment_rate = 0

        engagement_data.append({
            "id": v.get("id"),
            "title": v.get("title", ""),
            "thumbnail": v.get("thumbnail", ""),
            "views": views,
            "likes": likes,
            "comments": comments,
            "engagement_rate": engagement_rate,
            "like_rate": like_rate,
            "comment_rate": comment_rate,
            "publishedAt": v.get("publishedAt", ""),
        })

    # Sort by engagement rate
    engagement_data.sort(key=lambda x: x["engagement_rate"], reverse=True)

    # Categorize into performance tiers
    total = len(engagement_data)
    top_performers = engagement_data[:max(1, total // 5)]  # Top 20%
    solid_performers = engagement_data[max(1, total // 5):max(2, total // 2)]  # Next 30%
    underperformers = engagement_data[max(2, total // 2):]  # Bottom 50%

    avg_engagement = sum(v["engagement_rate"] for v in engagement_data) / len(engagement_data)
    avg_like_rate = sum(v["like_rate"] for v in engagement_data) / len(engagement_data)
    avg_comment_rate = sum(v["comment_rate"] for v in engagement_data) / len(engagement_data)

    return {
        "all_videos": engagement_data,
        "top_performers": top_performers,
        "solid_performers": solid_performers,
        "underperformers": underperformers,
        "averages": {
            "engagement_rate": avg_engagement,
            "like_rate": avg_like_rate,
            "comment_rate": avg_comment_rate,
        },
    }


def extract_content_themes(videos):
    """
    Extract common themes and patterns from video titles.
    Identifies trending topics and content categories.
    """
    if not videos:
        return {}

    # Common keywords to look for
    theme_keywords = {
        "tutorial": ["tutorial", "how to", "guide", "learn", "tips"],
        "review": ["review", "unboxing", "first look", "testing"],
        "vlog": ["vlog", "day in", "behind the scenes", "my day"],
        "challenge": ["challenge", "vs", "versus", "try"],
        "listicle": ["top", "best", "worst", "things"],
        "educational": ["explained", "why", "what is", "science"],
        "entertainment": ["funny", "comedy", "prank", "reaction"],
        "news": ["news", "update", "announcement", "latest"],
    }

    theme_counts = defaultdict(list)
    word_frequency = Counter()

    for v in videos:
        title = v.get("title", "").lower()
        
        # Check for theme keywords
        for theme, keywords in theme_keywords.items():
            if any(kw in title for kw in keywords):
                theme_counts[theme].append({
                    "id": v.get("id"),
                    "title": v.get("title"),
                    "thumbnail": v.get("thumbnail", ""),
                    "views": v.get("views", 0),
                    "engagement_rate": ((v.get("likes", 0) + v.get("comments", 0) * 2) / max(v.get("views", 1), 1)) * 100,
                })

        # Extract words for word cloud (filter common words)
        words = re.findall(r'\b[a-z]{4,}\b', title)
        common_words = {"with", "from", "this", "that", "have", "been", "were", "what", "when", "where"}
        for word in words:
            if word not in common_words:
                word_frequency[word] += 1

    # Get top themes by performance
    theme_performance = {}
    for theme, vids in theme_counts.items():
        if vids:
            avg_engagement = sum(v["engagement_rate"] for v in vids) / len(vids)
            avg_views = sum(v["views"] for v in vids) / len(vids)
            theme_performance[theme] = {
                "count": len(vids),
                "avg_engagement": avg_engagement,
                "avg_views": avg_views,
                "videos": sorted(vids, key=lambda x: x["engagement_rate"], reverse=True)[:3],
            }

    # Sort themes by engagement
    sorted_themes = sorted(
        theme_performance.items(),
        key=lambda x: x[1]["avg_engagement"],
        reverse=True
    )

    return {
        "themes": dict(sorted_themes),
        "top_keywords": dict(word_frequency.most_common(20)),
    }


def analyze_comment_sentiment(comments):
    """
    Simple sentiment analysis based on keyword matching.
    Returns positive/negative indicators and common phrases.
    """
    if not comments:
        return {}

    positive_keywords = [
        "love", "great", "awesome", "amazing", "best", "excellent", 
        "fantastic", "perfect", "thank", "helpful", "useful", "good"
    ]
    negative_keywords = [
        "hate", "bad", "worst", "terrible", "awful", "boring", 
        "useless", "waste", "disappointed", "poor", "stupid"
    ]
    question_keywords = ["how", "why", "what", "when", "where", "can you"]

    positive_count = 0
    negative_count = 0
    neutral_count = 0
    question_count = 0
    
    common_phrases = Counter()

    for comment in comments:
        text = comment.get("text", "").lower()
        
        has_positive = any(kw in text for kw in positive_keywords)
        has_negative = any(kw in text for kw in negative_keywords)
        has_question = any(kw in text for kw in question_keywords)

        if has_question:
            question_count += 1
        elif has_positive and not has_negative:
            positive_count += 1
        elif has_negative and not has_positive:
            negative_count += 1
        else:
            neutral_count += 1

        # Extract common phrases (3-4 word sequences)
        words = re.findall(r'\b[a-z]+\b', text)
        for i in range(len(words) - 2):
            phrase = " ".join(words[i:i+3])
            if len(phrase) > 10:  # Filter very short phrases
                common_phrases[phrase] += 1

    total = len(comments)
    sentiment_score = ((positive_count - negative_count) / max(total, 1)) * 100

    return {
        "total_comments": total,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "neutral_count": neutral_count,
        "question_count": question_count,
        "sentiment_score": sentiment_score,
        "positive_ratio": (positive_count / max(total, 1)) * 100,
        "common_phrases": dict(common_phrases.most_common(10)),
    }


def analyze_audience_retention_proxy(videos):
    """
    Proxy for audience retention based on engagement patterns.
    High comments + likes relative to views suggests strong retention.
    """
    if not videos:
        return {}
    
    retention_scores = []
    for v in videos:
        views = v.get("views", 0)
        likes = v.get("likes", 0)
        comments = v.get("comments", 0)
        
        if views > 0:
            # Retention proxy: (likes + comments*3) / views
            # Comments weighted higher as they indicate deeper engagement
            retention_score = ((likes + comments * 3) / views) * 100
        else:
            retention_score = 0
            
        retention_scores.append({
            "id": v.get("id"),
            "title": v.get("title", ""),
            "thumbnail": v.get("thumbnail", ""),
            "retention_score": retention_score,
            "views": views,
            "likes": likes,
            "comments": comments,
        })
    
    # Sort by retention score
    retention_scores.sort(key=lambda x: x["retention_score"], reverse=True)
    
    avg_retention = sum(v["retention_score"] for v in retention_scores) / len(retention_scores)
    high_retention = [v for v in retention_scores if v["retention_score"] > avg_retention * 1.5]
    
    return {
        "avg_retention_score": avg_retention,
        "high_retention_videos": high_retention[:5],
        "retention_distribution": retention_scores,
    }


def analyze_viral_potential(videos):
    """
    Identify videos with viral characteristics:
    - Exponential growth in engagement
    - High share potential (comments asking to share)
    - Above-average like-to-view ratio
    """
    if not videos:
        return {}
    
    viral_candidates = []
    for v in videos:
        views = v.get("views", 0)
        likes = v.get("likes", 0)
        comments = v.get("comments", 0)
        
        if views < 100:  # Skip very low view videos
            continue
            
        like_ratio = (likes / views) if views > 0 else 0
        comment_ratio = (comments / views) if views > 0 else 0
        
        # Viral score: weighted combination of engagement metrics
        viral_score = (like_ratio * 50) + (comment_ratio * 100) + (min(views / 10000, 10))
        
        if viral_score > 1:  # Threshold for viral potential
            viral_candidates.append({
                "id": v.get("id"),
                "title": v.get("title", ""),
                "thumbnail": v.get("thumbnail", ""),
                "viral_score": viral_score,
                "views": views,
                "likes": likes,
                "comments": comments,
                "like_ratio": like_ratio * 100,
                "comment_ratio": comment_ratio * 100,
            })
    
    viral_candidates.sort(key=lambda x: x["viral_score"], reverse=True)
    
    return {
        "viral_candidates": viral_candidates[:5],
        "total_viral_potential": len(viral_candidates),
    }


def analyze_content_timing(videos):
    """
    Analyze when content was published to identify optimal posting times.
    """
    if not videos:
        return {}
    
    day_performance = defaultdict(list)
    
    for v in videos:
        published = v.get("publishedAt", "")
        if not published:
            continue
            
        try:
            dt = datetime.fromisoformat(published.replace('Z', '+00:00'))
            day_name = dt.strftime("%A")
            
            views = v.get("views", 0)
            engagement = ((v.get("likes", 0) + v.get("comments", 0) * 2) / max(views, 1)) * 100
            
            day_performance[day_name].append({
                "views": views,
                "engagement": engagement,
            })
        except:
            continue
    
    # Calculate averages per day
    day_stats = {}
    for day, perf_list in day_performance.items():
        if perf_list:
            avg_views = sum(p["views"] for p in perf_list) / len(perf_list)
            avg_engagement = sum(p["engagement"] for p in perf_list) / len(perf_list)
            day_stats[day] = {
                "avg_views": avg_views,
                "avg_engagement": avg_engagement,
                "video_count": len(perf_list),
            }
    
    # Find best day
    best_day = None
    best_score = 0
    for day, stats in day_stats.items():
        score = stats["avg_engagement"] + (stats["avg_views"] / 1000)
        if score > best_score:
            best_score = score
            best_day = day
    
    return {
        "day_performance": day_stats,
        "best_day": best_day,
        "recommendation": f"Consider posting on {best_day}s for optimal engagement" if best_day else "Need more data",
    }


def calculate_sponsor_roi_potential(videos, channel_stats):
    """
    Calculate estimated ROI potential for sponsors based on:
    - Consistent viewership
    - High engagement rates
    - Audience loyalty (comment quality)
    """
    if not videos:
        return {}
    
    views_list = [v.get("views", 0) for v in videos if v.get("views", 0) > 0]
    if not views_list:
        return {}
    
    # Calculate view consistency (lower std dev = more consistent)
    avg_views = sum(views_list) / len(views_list)
    variance = sum((v - avg_views) ** 2 for v in views_list) / len(views_list)
    std_dev = variance ** 0.5
    consistency_score = max(0, 100 - (std_dev / max(avg_views, 1)) * 100)
    
    # Calculate average engagement
    avg_engagement = sum(
        ((v.get("likes", 0) + v.get("comments", 0) * 2) / max(v.get("views", 1), 1)) * 100
        for v in videos
    ) / len(videos)
    
    # Estimate CPM (cost per mille) based on engagement
    # Higher engagement = higher CPM potential
    estimated_cpm = 2 + (avg_engagement * 0.5)  # Base $2 + engagement boost
    
    # Calculate potential sponsorship value
    # Assumes 10% of subscribers watch sponsored content
    potential_reach = channel_stats.get("subscriberCount", 0) * 0.1
    estimated_sponsor_value = (potential_reach / 1000) * estimated_cpm
    
    return {
        "consistency_score": round(consistency_score, 2),
        "avg_engagement": round(avg_engagement, 2),
        "estimated_cpm": round(estimated_cpm, 2),
        "potential_reach": int(potential_reach),
        "estimated_sponsor_value": round(estimated_sponsor_value, 2),
        "roi_rating": "High" if consistency_score > 70 and avg_engagement > 2 else "Medium" if consistency_score > 50 else "Growing",
    }


def generate_sponsorship_insights(engagement_analysis, theme_analysis, videos, retention_analysis, viral_analysis):
    """
    Generate actionable sponsorship recommendations based on data.
    """
    insights = []
    recommendations = []

    top_performers = engagement_analysis.get("top_performers", [])
    themes = theme_analysis.get("themes", {})
    high_retention = retention_analysis.get("high_retention_videos", [])
    viral_candidates = viral_analysis.get("viral_candidates", [])
    
    # Insight 1: Best performing content type
    if themes:
        best_theme = max(themes.items(), key=lambda x: x[1]["avg_engagement"])
        insights.append({
            "type": "content_type",
            "title": "Highest Engagement Content Type",
            "value": best_theme[0].title(),
            "metric": f"{best_theme[1]['avg_engagement']:.2f}% avg engagement",
            "description": f"{best_theme[0].title()} content performs {best_theme[1]['avg_engagement'] / engagement_analysis['averages']['engagement_rate']:.1f}x better than average",
        })
        recommendations.append(f"Sponsor {best_theme[0]} content for maximum audience resonance")

    # Insight 2: Retention strength
    if high_retention:
        insights.append({
            "type": "retention",
            "title": "Strong Audience Retention",
            "value": f"{len(high_retention)} videos",
            "metric": f"{retention_analysis['avg_retention_score']:.2f}% avg retention score",
            "description": "Videos show high viewer retention with deep engagement",
        })
        recommendations.append("High retention videos are ideal for mid-roll sponsorships")

    # Insight 3: Viral potential
    if viral_candidates:
        insights.append({
            "type": "viral",
            "title": "Viral Growth Potential",
            "value": f"{len(viral_candidates)} videos",
            "metric": f"Top viral score: {viral_candidates[0]['viral_score']:.1f}",
            "description": "Content with exponential growth characteristics identified",
        })
        recommendations.append("Leverage viral-potential content for brand awareness campaigns")

    # Insight 4: Consistency analysis
    if len(top_performers) >= 3:
        recent_top = [v for v in top_performers if v.get("publishedAt")]
        if recent_top:
            insights.append({
                "type": "consistency",
                "title": "Top Performer Frequency",
                "value": f"{len(top_performers)} videos",
                "metric": f"{(len(top_performers) / len(videos)) * 100:.1f}% of content",
                "description": "This creator consistently produces high-engagement content",
            })
            recommendations.append("High consistency makes this creator a reliable sponsorship partner")

    # Insight 5: Engagement depth
    avg_comment_rate = engagement_analysis["averages"]["comment_rate"]
    if avg_comment_rate > 0.5:  # Above 0.5% is strong
        insights.append({
            "type": "engagement_depth",
            "title": "Comment Engagement",
            "value": "High",
            "metric": f"{avg_comment_rate:.2f}% comment rate",
            "description": "Audience actively engages beyond passive viewing",
        })
        recommendations.append("High comment rates indicate strong community - ideal for brand conversations")

    return {
        "insights": insights,
        "recommendations": recommendations,
    }


@bp.route("/api/youtube/audience.resonance", methods=["GET"])
def audience_resonance():
    """
    Main endpoint for audience resonance analysis.
    Provides actionable insights about content-audience fit.
    """
    try:
        url_or_id = request.args.get("url", "").strip()
        max_videos = int(request.args.get("maxVideos", 50))

        channel_id = extract_channel_id(url_or_id)
        if not channel_id:
            return jsonify({"error": "Invalid channel URL or ID"}), 400

        # Fetch channel stats
        channel_stats = fetch_basic_channel_stats(channel_id)
        if not channel_stats:
            return jsonify({"error": "Channel not found"}), 404

        # Fetch videos
        video_ids = fetch_video_ids(channel_stats["uploadsPlaylistId"], max_videos)
        if not video_ids:
            return jsonify({"error": "No videos found"}), 404

        videos = fetch_video_stats(video_ids, with_snippet=True)

        # Perform analyses
        engagement_analysis = analyze_engagement_patterns(videos)
        theme_analysis = extract_content_themes(videos)
        retention_analysis = analyze_audience_retention_proxy(videos)
        viral_analysis = analyze_viral_potential(videos)
        timing_analysis = analyze_content_timing(videos)
        roi_potential = calculate_sponsor_roi_potential(videos, channel_stats)
        
        # Fetch comments from top performers for sentiment analysis
        top_video_ids = [v["id"] for v in engagement_analysis["top_performers"][:5]]
        all_comments = []
        for vid in top_video_ids:
            comments = fetch_video_comments(vid, max_comments=30)
            all_comments.extend(comments)
        
        sentiment_analysis = analyze_comment_sentiment(all_comments)
        
        # Generate sponsorship insights
        sponsorship_data = generate_sponsorship_insights(
            engagement_analysis, theme_analysis, videos, retention_analysis, viral_analysis
        )

        return jsonify({
            "channel": {
                "id": channel_id,
                "subscribers": channel_stats["subscriberCount"],
                "total_views": channel_stats["viewCount"],
                "videos_analyzed": len(videos),
            },
            "engagement": {
                "averages": engagement_analysis["averages"],
                "top_performers": engagement_analysis["top_performers"][:10],
                "performance_distribution": {
                    "top_tier": len(engagement_analysis["top_performers"]),
                    "solid_tier": len(engagement_analysis["solid_performers"]),
                    "underperforming": len(engagement_analysis["underperformers"]),
                },
            },
            "content_themes": theme_analysis,
            "audience_sentiment": sentiment_analysis,
            "retention": retention_analysis,
            "viral_potential": viral_analysis,
            "timing": timing_analysis,
            "roi_potential": roi_potential,
            "sponsorship": sponsorship_data,
        })

    except ValueError as e:
        return jsonify({"error": f"Invalid parameter: {str(e)}"}), 400
    except Exception as e:
        print(f"Error in audience_resonance: {e}")
        return jsonify({"error": "Internal server error"}), 500
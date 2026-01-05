# backend/routes/YouTube/video_performance_comparison.py

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
)

performance_bp = Blueprint("video_performance", __name__, url_prefix="/api/youtube")


@performance_bp.route("/videos.performanceComparison", methods=["GET"])
def performance_comparison():
    """
    Compare channel performance against industry benchmarks.
    Accepts comma-separated channel URLs for business users with multiple channels.
    """
    urls_param = request.args.get("urls")  # Comma-separated URLs
    if not urls_param:
        return jsonify({"error": "Missing urls parameter"}), 400

    try:
        max_videos = int(request.args.get("maxVideos", "25"))
    except ValueError:
        max_videos = 25

    channel_urls = [url.strip() for url in urls_param.split(",") if url.strip()]
    
    if not channel_urls:
        return jsonify({"error": "No valid channel URLs provided"}), 400

    # Industry benchmark ranges (based on typical YouTube performance patterns)
    # These represent typical performance for channels in various size categories
    INDUSTRY_BENCHMARKS = {
        "engagement_rate": {
            "excellent": 0.05,  # 5%+
            "good": 0.02,       # 2-5%
            "average": 0.01,    # 1-2%
            "below_average": 0.005,  # 0.5-1%
        },
        "views_per_video": {
            "excellent": 50000,
            "good": 10000,
            "average": 3000,
            "below_average": 500,
        },
        "likes_per_1000_views": {
            "excellent": 50,    # 5%
            "good": 30,         # 3%
            "average": 20,      # 2%
            "below_average": 10,  # 1%
        },
        "comments_per_1000_views": {
            "excellent": 10,    # 1%
            "good": 5,          # 0.5%
            "average": 2,       # 0.2%
            "below_average": 1,  # 0.1%
        },
    }

    all_videos = []
    channel_metrics = []

    # Fetch data for each channel
    for channel_url in channel_urls:
        channel_id = extract_channel_id(channel_url)
        if not channel_id:
            continue

        basic = fetch_basic_channel_stats(channel_id)
        if not basic:
            continue

        playlist_id = basic["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, max_videos)
        
        if not video_ids:
            continue

        videos = fetch_video_stats(video_ids, with_snippet=True)
        
        if not videos:
            continue

        # Calculate metrics for this channel
        total_views = sum(v["views"] for v in videos)
        total_likes = sum(v["likes"] for v in videos)
        total_comments = sum(v["comments"] for v in videos)
        num_videos = len(videos)

        avg_views = total_views / num_videos if num_videos > 0 else 0
        avg_likes = total_likes / num_videos if num_videos > 0 else 0
        avg_comments = total_comments / num_videos if num_videos > 0 else 0

        # Calculate engagement rate
        engagement_rate = (total_likes + total_comments) / total_views if total_views > 0 else 0

        # Calculate likes and comments per 1000 views
        likes_per_1k = (total_likes / total_views * 1000) if total_views > 0 else 0
        comments_per_1k = (total_comments / total_views * 1000) if total_views > 0 else 0

        # Calculate percentile rankings for this channel
        def get_percentile(value, benchmark_key):
            benchmarks = INDUSTRY_BENCHMARKS[benchmark_key]
            if value >= benchmarks["excellent"]:
                return 90
            elif value >= benchmarks["good"]:
                return 75
            elif value >= benchmarks["average"]:
                return 50
            elif value >= benchmarks["below_average"]:
                return 25
            else:
                return 10

        engagement_percentile = get_percentile(engagement_rate, "engagement_rate")
        views_percentile = get_percentile(avg_views, "views_per_video")
        likes_percentile = get_percentile(likes_per_1k, "likes_per_1000_views")
        comments_percentile = get_percentile(comments_per_1k, "comments_per_1000_views")

        channel_metrics.append({
            "channel_url": channel_url,
            "channel_id": channel_id,
            "num_videos": num_videos,
            "avg_views": round(avg_views, 2),
            "avg_likes": round(avg_likes, 2),
            "avg_comments": round(avg_comments, 2),
            "engagement_rate": round(engagement_rate, 4),
            "likes_per_1k_views": round(likes_per_1k, 2),
            "comments_per_1k_views": round(comments_per_1k, 2),
            "total_views": total_views,
            "percentiles": {
                "engagement_rate": engagement_percentile,
                "avg_views": views_percentile,
                "likes_per_1k": likes_percentile,
                "comments_per_1k": comments_percentile,
            },
        })

        all_videos.extend(videos)

    if not all_videos:
        return jsonify({"error": "No video data found"}), 404

    # Calculate aggregate metrics across all channels
    total_views_all = sum(v["views"] for v in all_videos)
    total_likes_all = sum(v["likes"] for v in all_videos)
    total_comments_all = sum(v["comments"] for v in all_videos)
    num_videos_all = len(all_videos)

    avg_views_all = total_views_all / num_videos_all if num_videos_all > 0 else 0
    avg_engagement_all = (total_likes_all + total_comments_all) / total_views_all if total_views_all > 0 else 0
    avg_likes_per_1k = (total_likes_all / total_views_all * 1000) if total_views_all > 0 else 0
    avg_comments_per_1k = (total_comments_all / total_views_all * 1000) if total_views_all > 0 else 0

    # Calculate percentile rankings
    def get_percentile(value, benchmark_key):
        benchmarks = INDUSTRY_BENCHMARKS[benchmark_key]
        if value >= benchmarks["excellent"]:
            return 90
        elif value >= benchmarks["good"]:
            return 75
        elif value >= benchmarks["average"]:
            return 50
        elif value >= benchmarks["below_average"]:
            return 25
        else:
            return 10

    engagement_percentile = get_percentile(avg_engagement_all, "engagement_rate")
    views_percentile = get_percentile(avg_views_all, "views_per_video")
    likes_percentile = get_percentile(avg_likes_per_1k, "likes_per_1000_views")
    comments_percentile = get_percentile(avg_comments_per_1k, "comments_per_1000_views")

    # Generate insights
    insights = []
    
    if avg_engagement_all >= INDUSTRY_BENCHMARKS["engagement_rate"]["excellent"]:
        insights.append({
            "type": "positive",
            "title": "Excellent Engagement Rate",
            "description": f"Your engagement rate of {(avg_engagement_all * 100):.2f}% is in the top 10% of channels.",
            "recommendation": "Continue creating content that resonates with your audience. Consider doubling down on your best-performing video topics."
        })
    elif avg_engagement_all < INDUSTRY_BENCHMARKS["engagement_rate"]["average"]:
        insights.append({
            "type": "warning",
            "title": "Low Engagement Rate",
            "description": f"Your engagement rate of {(avg_engagement_all * 100):.2f}% is below the industry average.",
            "recommendation": "Focus on creating more engaging content. Ask questions in your videos, create compelling thumbnails, and encourage viewers to like and comment."
        })

    if avg_views_all >= INDUSTRY_BENCHMARKS["views_per_video"]["excellent"]:
        insights.append({
            "type": "positive",
            "title": "Strong View Performance",
            "description": f"Your average of {avg_views_all:,.0f} views per video is exceptional.",
            "recommendation": "Your content is reaching a wide audience. Consider optimizing upload frequency to maintain momentum."
        })
    elif avg_views_all < INDUSTRY_BENCHMARKS["views_per_video"]["average"]:
        insights.append({
            "type": "warning",
            "title": "Views Below Average",
            "description": f"Your average of {avg_views_all:,.0f} views per video is below industry standards.",
            "recommendation": "Improve video titles, thumbnails, and SEO. Consider collaborating with other creators or promoting your videos on other platforms."
        })

    if avg_comments_per_1k >= INDUSTRY_BENCHMARKS["comments_per_1000_views"]["good"]:
        insights.append({
            "type": "positive",
            "title": "Strong Community Engagement",
            "description": f"You're getting {avg_comments_per_1k:.1f} comments per 1,000 views, indicating active viewer participation.",
            "recommendation": "Keep engaging with comments to build a stronger community. Consider creating content that encourages discussion."
        })

    # Compare performance against benchmarks
    comparison = {
        "engagement_rate": {
            "your_value": round(avg_engagement_all, 4),
            "industry_avg": INDUSTRY_BENCHMARKS["engagement_rate"]["average"],
            "industry_excellent": INDUSTRY_BENCHMARKS["engagement_rate"]["excellent"],
            "percentile": engagement_percentile,
        },
        "avg_views": {
            "your_value": round(avg_views_all, 2),
            "industry_avg": INDUSTRY_BENCHMARKS["views_per_video"]["average"],
            "industry_excellent": INDUSTRY_BENCHMARKS["views_per_video"]["excellent"],
            "percentile": views_percentile,
        },
        "likes_per_1k": {
            "your_value": round(avg_likes_per_1k, 2),
            "industry_avg": INDUSTRY_BENCHMARKS["likes_per_1000_views"]["average"],
            "industry_excellent": INDUSTRY_BENCHMARKS["likes_per_1000_views"]["excellent"],
            "percentile": likes_percentile,
        },
        "comments_per_1k": {
            "your_value": round(avg_comments_per_1k, 2),
            "industry_avg": INDUSTRY_BENCHMARKS["comments_per_1000_views"]["average"],
            "industry_excellent": INDUSTRY_BENCHMARKS["comments_per_1000_views"]["excellent"],
            "percentile": comments_percentile,
        },
    }

    return jsonify({
        "aggregate_metrics": {
            "num_videos": num_videos_all,
            "total_views": total_views_all,
            "avg_views": round(avg_views_all, 2),
            "avg_likes": round(total_likes_all / num_videos_all, 2) if num_videos_all > 0 else 0,
            "avg_comments": round(total_comments_all / num_videos_all, 2) if num_videos_all > 0 else 0,
            "engagement_rate": round(avg_engagement_all, 4),
            "likes_per_1k_views": round(avg_likes_per_1k, 2),
            "comments_per_1k_views": round(avg_comments_per_1k, 2),
        },
        "channel_metrics": channel_metrics,
        "comparison": comparison,
        "insights": insights,
    }), 200


# backend/routes/YouTube/channel_performance_analyzer.py

from flask import Blueprint, request, jsonify
from collections import Counter, defaultdict
from datetime import datetime
import re
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
    fetch_video_comments,
)

performance_analyzer_bp = Blueprint("performance_analyzer", __name__, url_prefix="/api/youtube")


# ========================= IMPROVED RETENTION RATE OPTIMIZER =========================
@performance_analyzer_bp.route("/analyzer.retentionOptimizer", methods=["GET"])
def retention_optimizer():
    """
    Analyze video retention patterns using engagement metrics as proxy.
    Compare primary channel against competitor channels.
    """
    urls_param = request.args.get("urls")
    if not urls_param:
        return jsonify({"error": "Missing urls parameter"}), 400

    try:
        max_videos = int(request.args.get("maxVideos", "50"))
    except ValueError:
        max_videos = 50

    channel_urls = [url.strip() for url in urls_param.split(",") if url.strip()]
    
    if not channel_urls:
        return jsonify({"error": "No valid channel URLs provided"}), 400

    all_channel_data = []

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

        all_channel_data.append({
            "channel_url": channel_url,
            "channel_id": channel_id,
            "channel_name": basic.get("title", "Channel"),
            "videos": videos
        })

    if not all_channel_data:
        return jsonify({"error": "No video data found"}), 404

    primary_channel = all_channel_data[0]
    competitor_channels = all_channel_data[1:] if len(all_channel_data) > 1 else []

    # Calculate engagement rate (proxy for retention)
    def calculate_engagement_rate(video):
        views = video.get("views", 0)
        if views == 0:
            return 0
        likes = video.get("likes", 0)
        comments = video.get("comments", 0)
        return (likes + comments) / views

    # Analyze content types based on title/description
    def classify_content_type(video):
        """Classify video by content type"""
        title = video.get("title", "").lower()
        
        # Tutorial/Educational
        if any(word in title for word in ["how to", "tutorial", "guide", "learn", "explained"]):
            return "tutorial"
        # Entertainment
        elif any(word in title for word in ["funny", "challenge", "prank", "reaction", "vlog"]):
            return "entertainment"
        # Review/Analysis
        elif any(word in title for word in ["review", "vs", "comparison", "best", "top"]):
            return "review"
        # News/Updates
        elif any(word in title for word in ["news", "update", "announcement", "2024", "2025", "2026"]):
            return "news"
        else:
            return "other"

    # Video pacing analysis (based on title indicators)
    def analyze_video_pacing(video):
        """Determine if video appears fast-paced or slow-paced"""
        title = video.get("title", "").lower()
        
        fast_indicators = ["quick", "fast", "rapid", "speed", "minute", "seconds"]
        slow_indicators = ["deep dive", "detailed", "comprehensive", "complete", "full"]
        
        has_fast = any(word in title for word in fast_indicators)
        has_slow = any(word in title for word in slow_indicators)
        
        if has_fast and not has_slow:
            return "fast_paced"
        elif has_slow and not has_fast:
            return "deep_dive"
        else:
            return "balanced"

    # Hook effectiveness (analyze first impression potential)
    def analyze_hook_strength(video):
        """Rate hook strength based on title characteristics"""
        title = video.get("title", "")
        score = 0
        
        # Question format is engaging
        if "?" in title:
            score += 20
        
        # Numbers are attention-grabbing
        if any(char.isdigit() for char in title):
            score += 15
        
        # Urgency/scarcity words
        urgency_words = ["now", "today", "must", "never", "always", "urgent", "breaking"]
        if any(word in title.lower() for word in urgency_words):
            score += 20
        
        # Power words
        power_words = ["secret", "hidden", "shocking", "amazing", "ultimate", "proven"]
        if any(word in title.lower() for word in power_words):
            score += 15
        
        # All caps words (but not entire title)
        caps_words = [w for w in title.split() if w.isupper() and len(w) > 1]
        if 1 <= len(caps_words) <= 3:
            score += 10
        
        # Title length (50-70 chars is ideal)
        if 50 <= len(title) <= 70:
            score += 20
        elif 30 <= len(title) < 50 or 70 < len(title) <= 90:
            score += 10
        
        return min(100, score)

    # ANALYZE PRIMARY CHANNEL
    content_performance = defaultdict(list)
    pacing_performance = defaultdict(list)
    all_primary_videos = []
    
    for video in primary_channel["videos"]:
        engagement = calculate_engagement_rate(video)
        content_type = classify_content_type(video)
        pacing = analyze_video_pacing(video)
        hook_score = analyze_hook_strength(video)
        
        video_data = {
            "id": video.get("id", ""),
            "title": video.get("title", ""),
            "thumbnail": video.get("thumbnail", ""),
            "views": video.get("views", 0),
            "likes": video.get("likes", 0),
            "comments": video.get("comments", 0),
            "engagement": engagement,
            "content_type": content_type,
            "pacing": pacing,
            "hook_score": hook_score
        }
        all_primary_videos.append(video_data)
        
        content_performance[content_type].append(video_data)
        pacing_performance[pacing].append(video_data)

    # Calculate stats for content types
    content_stats = {}
    for content_type, videos in content_performance.items():
        if videos:
            content_stats[content_type] = {
                "avg_engagement": sum(v["engagement"] for v in videos) / len(videos),
                "avg_views": sum(v["views"] for v in videos) / len(videos),
                "video_count": len(videos),
                "top_video": max(videos, key=lambda v: v["engagement"])
            }

    # Calculate stats for pacing
    pacing_stats = {}
    for pacing, videos in pacing_performance.items():
        if videos:
            pacing_stats[pacing] = {
                "avg_engagement": sum(v["engagement"] for v in videos) / len(videos),
                "avg_views": sum(v["views"] for v in videos) / len(videos),
                "avg_hook_score": sum(v["hook_score"] for v in videos) / len(videos),
                "video_count": len(videos),
                "top_videos": sorted(videos, key=lambda v: v["engagement"], reverse=True)[:3]
            }

    # ANALYZE COMPETITOR CHANNELS
    all_competitor_videos = []
    competitor_summaries = []
    
    for channel in competitor_channels:
        channel_videos = []
        for video in channel["videos"]:
            engagement = calculate_engagement_rate(video)
            hook_score = analyze_hook_strength(video)
            
            channel_videos.append({
                "id": video.get("id", ""),
                "title": video.get("title", ""),
                "thumbnail": video.get("thumbnail", ""),
                "views": video.get("views", 0),
                "likes": video.get("likes", 0),
                "comments": video.get("comments", 0),
                "engagement": engagement,
                "hook_score": hook_score,
                "channel_name": channel["channel_name"]
            })
        
        all_competitor_videos.extend(channel_videos)
        
        # Summary for this competitor
        if channel_videos:
            competitor_summaries.append({
                "channel_name": channel["channel_name"],
                "avg_engagement": sum(v["engagement"] for v in channel_videos) / len(channel_videos),
                "avg_hook_score": sum(v["hook_score"] for v in channel_videos) / len(channel_videos),
                "video_count": len(channel_videos),
                "top_video": max(channel_videos, key=lambda v: v["engagement"])
            })

    competitor_avg_engagement = (
        sum(v["engagement"] for v in all_competitor_videos) / len(all_competitor_videos) 
        if all_competitor_videos else 0
    )
    
    competitor_avg_hook = (
        sum(v["hook_score"] for v in all_competitor_videos) / len(all_competitor_videos)
        if all_competitor_videos else 0
    )

    # Top videos comparison
    top_primary = sorted(all_primary_videos, key=lambda v: v["engagement"], reverse=True)[:5]
    top_competitors = sorted(all_competitor_videos, key=lambda v: v["engagement"], reverse=True)[:5]

    # Engagement distribution
    engagement_buckets = {"0-2%": 0, "2-4%": 0, "4-6%": 0, "6-8%": 0, "8%+": 0}
    for video in all_primary_videos:
        eng_pct = video["engagement"] * 100
        if eng_pct < 2:
            engagement_buckets["0-2%"] += 1
        elif eng_pct < 4:
            engagement_buckets["2-4%"] += 1
        elif eng_pct < 6:
            engagement_buckets["4-6%"] += 1
        elif eng_pct < 8:
            engagement_buckets["6-8%"] += 1
        else:
            engagement_buckets["8%+"] += 1

    primary_avg_engagement = sum(v["engagement"] for v in all_primary_videos) / len(all_primary_videos) if all_primary_videos else 0
    primary_avg_hook = sum(v["hook_score"] for v in all_primary_videos) / len(all_primary_videos) if all_primary_videos else 0

    # GENERATE RECOMMENDATIONS
    recommendations = []

    # Content type recommendation
    if content_stats:
        best_content = max(content_stats.items(), key=lambda x: x[1]["avg_engagement"])
        worst_content = min(content_stats.items(), key=lambda x: x[1]["avg_engagement"]) if len(content_stats) > 1 else None
        
        recommendations.append({
            "type": "content_type",
            "title": f"Your {best_content[0].title()} Content Performs Best",
            "description": f"{best_content[0].title()} videos get {(best_content[1]['avg_engagement'] * 100):.2f}% engagement with {best_content[1]['video_count']} videos analyzed.",
            "action": f"Create more {best_content[0]} content. Your top performer: '{best_content[1]['top_video']['title'][:60]}...'",
            "impact": "high",
            "metric_improvement": f"+{((best_content[1]['avg_engagement'] - primary_avg_engagement) / primary_avg_engagement * 100):.0f}% vs your average" if primary_avg_engagement > 0 else "High potential"
        })
        
        if worst_content and worst_content[1]["avg_engagement"] < primary_avg_engagement * 0.6:
            recommendations.append({
                "type": "content_avoid",
                "title": f"Consider Reducing {worst_content[0].title()} Content",
                "description": f"{worst_content[0].title()} videos underperform with only {(worst_content[1]['avg_engagement'] * 100):.2f}% engagement.",
                "action": f"These videos aren't resonating. Shift focus to your stronger content types.",
                "impact": "medium",
                "metric_improvement": f"{((worst_content[1]['avg_engagement'] - primary_avg_engagement) / primary_avg_engagement * 100):.0f}% below average"
            })

    # Pacing recommendation
    if pacing_stats:
        best_pacing = max(pacing_stats.items(), key=lambda x: x[1]["avg_engagement"])
        pacing_name = best_pacing[0].replace("_", " ").title()
        
        recommendations.append({
            "type": "pacing",
            "title": f"{pacing_name} Videos Keep Viewers Engaged",
            "description": f"{pacing_name} content has {(best_pacing[1]['avg_engagement'] * 100):.2f}% engagement rate.",
            "action": f"Your audience prefers {pacing_name.lower()} content. Adjust your video pacing accordingly.",
            "impact": "high",
            "metric_improvement": f"Used in {best_pacing[1]['video_count']} successful videos"
        })

    # Hook comparison
    hook_gap = primary_avg_hook - competitor_avg_hook
    if hook_gap < -10:
        recommendations.append({
            "type": "hooks",
            "title": "Your Titles Need Stronger Hooks",
            "description": f"Your average hook score is {primary_avg_hook:.0f}/100 vs competitors' {competitor_avg_hook:.0f}/100.",
            "action": "Use questions, numbers, or power words in titles. Study competitor titles that perform well.",
            "impact": "critical",
            "metric_improvement": f"{abs(hook_gap):.0f} points behind competitors"
        })
    elif hook_gap > 10:
        recommendations.append({
            "type": "hooks",
            "title": "Your Titles Outperform Competitors!",
            "description": f"Your hook score of {primary_avg_hook:.0f}/100 beats competitors' {competitor_avg_hook:.0f}/100.",
            "action": "Keep using this winning title formula across all your videos.",
            "impact": "low",
            "metric_improvement": f"{hook_gap:.0f} points ahead"
        })

    # Overall engagement comparison
    engagement_gap = primary_avg_engagement - competitor_avg_engagement
    if engagement_gap < -0.01:  # More than 1% behind
        recommendations.append({
            "type": "engagement",
            "title": "Close the Engagement Gap",
            "description": f"Your {(primary_avg_engagement * 100):.2f}% engagement trails competitors' {(competitor_avg_engagement * 100):.2f}%.",
            "action": "Focus on the first 30 seconds - use pattern interrupts, tease payoffs, and create curiosity gaps to hook viewers immediately.",
            "impact": "critical",
            "metric_improvement": f"{abs(engagement_gap * 100):.1f}% gap to close"
        })
    else:
        recommendations.append({
            "type": "engagement",
            "title": "You're Beating the Competition!",
            "description": f"Your {(primary_avg_engagement * 100):.2f}% engagement beats competitors' {(competitor_avg_engagement * 100):.2f}%.",
            "action": "Document what makes your content engaging and maintain this standard.",
            "impact": "low",
            "metric_improvement": f"+{(engagement_gap * 100):.1f}% ahead"
        })

    # Consistency recommendation
    high_performers = sum(1 for v in all_primary_videos if v["engagement"] > primary_avg_engagement)
    consistency_rate = high_performers / len(all_primary_videos) if all_primary_videos else 0
    
    if consistency_rate < 0.4:
        recommendations.append({
            "type": "consistency",
            "title": "Improve Content Consistency",
            "description": f"Only {high_performers}/{len(all_primary_videos)} videos exceed your average - too much variance.",
            "action": "Create a content checklist based on your top performers. Every video should hit those benchmarks.",
            "impact": "high",
            "metric_improvement": f"{(consistency_rate * 100):.0f}% consistency rate"
        })

    return jsonify({
        "content_type_performance": content_stats,
        "pacing_performance": pacing_stats,
        "your_avg_engagement": round(primary_avg_engagement, 4),
        "your_avg_hook_score": round(primary_avg_hook, 1),
        "competitor_avg_engagement": round(competitor_avg_engagement, 4),
        "competitor_avg_hook_score": round(competitor_avg_hook, 1),
        "competitor_summaries": competitor_summaries,
        "recommendations": recommendations,
        "analyzed_videos": len(primary_channel["videos"]),
        "top_primary_videos": top_primary,
        "top_competitor_videos": top_competitors,
        "engagement_distribution": engagement_buckets,
        "primary_channel_name": primary_channel["channel_name"]
    }), 200


# ========================= THUMBNAIL A/B TEST SIMULATOR =========================
@performance_analyzer_bp.route("/analyzer.thumbnailAnalyzer", methods=["POST"])
def thumbnail_analyzer():
    """
    Analyze uploaded thumbnail images and predict performance.
    Uses image analysis to score thumbnails based on best practices.
    """
    from flask import request
    import base64
    from io import BytesIO
    from PIL import Image, ImageStat
    import re
    import random
    
    try:
        data = request.get_json()
        thumbnails = data.get("thumbnails", [])  # List of base64 images
        
        if not thumbnails:
            return jsonify({"error": "No thumbnails provided"}), 400

        results = []
        
        for idx, thumb_data in enumerate(thumbnails):
            try:
                # Decode base64 image
                image_data = re.sub('^data:image/.+;base64,', '', thumb_data)
                image_bytes = base64.b64decode(image_data)
                image = Image.open(BytesIO(image_bytes))
                
                # Convert to RGB if needed
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Analyze image properties
                width, height = image.size
                
                # Color analysis - calculate brightness and contrast
                stat = ImageStat.Stat(image)
                brightness = sum(stat.mean) / 3  # Average brightness
                
                # Calculate color variance (proxy for contrast)
                r_std, g_std, b_std = stat.stddev
                color_variance = (r_std + g_std + b_std) / 3
                
                # Analyze color distribution for contrast score
                contrast_score = min(100, (color_variance / 50) * 100)
                
                # Check if image has good brightness (not too dark, not too bright)
                brightness_score = 100 - abs(brightness - 127) / 1.27
                
                # Detect if there are bright, saturated areas (text or faces)
                # Simple heuristic: check for areas with high saturation
                hsv_image = image.convert('HSV')
                hsv_stat = ImageStat.Stat(hsv_image)
                saturation = hsv_stat.mean[1]
                
                # Text readability proxy: higher saturation + good contrast
                text_score = min(100, (saturation / 2.55 + contrast_score) / 2)
                
                # Face detection proxy: look for skin-tone pixels
                # Skin tones are typically in RGB range (95-255, 40-185, 20-135)
                pixels = list(image.getdata())
                skin_pixels = sum(1 for r, g, b in pixels if 95 <= r <= 255 and 40 <= g <= 185 and 20 <= b <= 135)
                face_likelihood = min(100, (skin_pixels / len(pixels)) * 500)
                
                # Clutter score: inverse of color variance (less variance = cleaner)
                # But not too low (that would be boring)
                clutter_score = 100 - min(50, abs(color_variance - 40))
                
                # Emotional appeal: combination of saturation and brightness
                emotional_score = min(100, (saturation / 2.55 * 0.6 + brightness_score * 0.4))
                
                # Overall score (weighted average)
                overall = (
                    contrast_score * 0.25 +
                    face_likelihood * 0.25 +
                    text_score * 0.20 +
                    emotional_score * 0.15 +
                    clutter_score * 0.15
                )
                
                # CTR prediction based on overall score
                base_ctr = 2.5
                ctr = base_ctr + (overall / 100) * 4  # Range: 2.5% to 6.5%
                
                # Generate recommendations
                recommendations = []
                if contrast_score < 60:
                    recommendations.append("Increase color contrast for better visibility")
                else:
                    recommendations.append("Good color contrast - thumbnail stands out")
                
                if face_likelihood < 30:
                    recommendations.append("Consider adding human element (faces perform 30% better)")
                elif face_likelihood > 60:
                    recommendations.append("Strong human presence - great for connection")
                else:
                    recommendations.append("Some human element detected - consider making it more prominent")
                
                if text_score < 50:
                    recommendations.append("Text may be hard to read - use bolder fonts with high contrast")
                else:
                    recommendations.append("Text appears readable at thumbnail size")
                
                if brightness < 100:
                    recommendations.append("Image is quite dark - brighten it for mobile visibility")
                elif brightness > 180:
                    recommendations.append("Image may be too bright - could appear washed out")
                
                score = {
                    "thumbnail_id": idx + 1,
                    "overall_score": round(overall, 1),
                    "ctr_prediction": f"{ctr:.1f}%",
                    "scores": {
                        "face_presence": round(face_likelihood, 1),
                        "color_contrast": round(contrast_score, 1),
                        "text_readability": round(text_score, 1),
                        "emotional_appeal": round(emotional_score, 1),
                        "clutter_score": round(clutter_score, 1)
                    },
                    "recommendations": recommendations[:3],  # Top 3 recommendations
                    "best_practices": {
                        "has_face": face_likelihood > 40,
                        "high_contrast": contrast_score > 60,
                        "readable_text": text_score > 50,
                        "good_brightness": 100 <= brightness <= 180,
                        "uncluttered": clutter_score > 60
                    },
                    "image_properties": {
                        "width": width,
                        "height": height,
                        "brightness": round(brightness, 1),
                        "color_variance": round(color_variance, 1)
                    }
                }
                results.append(score)
                
            except Exception as img_error:
                # If image processing fails, add error result
                results.append({
                    "thumbnail_id": idx + 1,
                    "error": f"Failed to process image: {str(img_error)}",
                    "overall_score": 0,
                    "ctr_prediction": "0%",
                    "scores": {
                        "face_presence": 0,
                        "color_contrast": 0,
                        "text_readability": 0,
                        "emotional_appeal": 0,
                        "clutter_score": 0
                    },
                    "recommendations": ["Image processing failed - check file format"],
                    "best_practices": {}
                })
        
        # Sort by overall score
        results.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
        
        if results and results[0].get("overall_score", 0) > 0:
            winner = results[0]["thumbnail_id"]
            recommendation = f"Thumbnail #{results[0]['thumbnail_id']} has the highest predicted CTR of {results[0]['ctr_prediction']}"
        else:
            winner = 1
            recommendation = "Unable to determine winner - check thumbnail quality"
        
        return jsonify({
            "thumbnails_analyzed": len(thumbnails),
            "results": results,
            "winner": winner,
            "recommendation": recommendation
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========================= IMPROVED COMMENT SENTIMENT ANALYZER =========================
@performance_analyzer_bp.route("/analyzer.commentSentiment", methods=["GET"])
def comment_sentiment():
    """
    Analyze comment sentiment with cross-channel comparison.
    When multiple channels are provided, show how primary channel compares to others.
    """
    urls_param = request.args.get("urls")
    if not urls_param:
        return jsonify({"error": "Missing urls parameter"}), 400

    try:
        max_videos = int(request.args.get("maxVideos", "30"))
        max_comments_per_video = int(request.args.get("maxComments", "50"))
    except ValueError:
        max_videos = 30
        max_comments_per_video = 50

    channel_urls = [url.strip() for url in urls_param.split(",") if url.strip()]
    
    if not channel_urls:
        return jsonify({"error": "No valid channel URL provided"}), 400

    # Sentiment analysis helpers
    positive_words = {
        "love", "great", "awesome", "amazing", "excellent", "perfect", "best",
        "fantastic", "wonderful", "incredible", "brilliant", "thanks", "thank",
        "appreciate", "helpful", "useful", "informative", "inspiring", "beautiful",
        "nice", "good", "better", "enjoyed", "loved", "outstanding", "superb"
    }
    
    negative_words = {
        "bad", "terrible", "awful", "horrible", "worst", "hate", "disappointed",
        "disappointing", "poor", "useless", "waste", "boring", "confusing", "wrong",
        "misleading", "clickbait", "dislike", "annoying", "stupid", "sucks", "trash"
    }

    def analyze_sentiment(text):
        """Classify sentiment of a comment"""
        text_lower = text.lower()
        words = set(text_lower.split())
        
        pos_count = len(words & positive_words)
        neg_count = len(words & negative_words)
        
        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        else:
            return "neutral"

    # Analyze each channel separately
    all_channels_data = []

    for idx, channel_url in enumerate(channel_urls):
        is_primary = (idx == 0)
        channel_id = extract_channel_id(channel_url)
        
        if not channel_id:
            continue

        basic = fetch_basic_channel_stats(channel_id)
        if not basic:
            continue

        channel_name = basic.get("title", f"Channel {idx + 1}")
        playlist_id = basic["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, max_videos)
        
        if not video_ids:
            continue

        videos = fetch_video_stats(video_ids, with_snippet=True)
        
        # Fetch comments for each video
        all_comments = []
        
        for video_id, video in zip(video_ids[:max_videos], videos):
            comments = fetch_video_comments(video_id, max_comments_per_video)
            
            # Add video info to each comment
            for comment in comments:
                comment["video_id"] = video_id
                comment["video_title"] = video.get("title", "")
                comment["video_published"] = video.get("publishedAt", "")
            
            all_comments.extend(comments)

        if not all_comments:
            continue

        # Categorize comments
        categorized_comments = []
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        topics_mentioned = Counter()
        
        for comment in all_comments:
            text = comment.get("text", "")
            sentiment = analyze_sentiment(text)
            
            sentiment_counts[sentiment] += 1
            
            categorized_comments.append({
                "text": text,
                "publishedAt": comment.get("publishedAt", ""),
                "video_id": comment.get("video_id", ""),
                "video_title": comment.get("video_title", ""),
                "sentiment": sentiment
            })
            
            # Extract topics (words > 4 chars, not stop words)
            stop_words = {
                "this", "that", "these", "those", "with", "from", "have", "been",
                "were", "their", "would", "there", "about", "could", "other", "which",
                "your", "really", "just", "like", "think", "know", "make", "want"
            }
            words = set(text.lower().split())
            for word in words:
                if len(word) > 4 and word not in stop_words and word.isalpha():
                    topics_mentioned[word] += 1

        # Calculate sentiment percentages
        total = sum(sentiment_counts.values())
        sentiment_percentages = {
            k: round((v / total * 100), 1) if total > 0 else 0 
            for k, v in sentiment_counts.items()
        }

        # Timeline data - group by month
        timeline_data = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})
        
        for comment in categorized_comments:
            pub_date = comment.get("publishedAt", "")
            if pub_date:
                try:
                    dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                    month_key = dt.strftime("%Y-%m")
                    timeline_data[month_key][comment["sentiment"]] += 1
                except:
                    pass
        
        # Convert timeline to list and sort
        timeline = []
        for month, counts in sorted(timeline_data.items()):
            total_month = sum(counts.values())
            timeline.append({
                "month": month,
                "positive": counts["positive"],
                "negative": counts["negative"],
                "neutral": counts["neutral"],
                "positive_percent": round((counts["positive"] / total_month * 100), 1) if total_month > 0 else 0,
                "negative_percent": round((counts["negative"] / total_month * 100), 1) if total_month > 0 else 0,
                "neutral_percent": round((counts["neutral"] / total_month * 100), 1) if total_month > 0 else 0
            })

        # Trending topics
        top_topics = [
            {"topic": topic, "mentions": count}
            for topic, count in topics_mentioned.most_common(15)
        ]

        all_channels_data.append({
            "channel_url": channel_url,
            "channel_id": channel_id,
            "channel_name": channel_name,
            "is_primary": is_primary,
            "total_comments": len(all_comments),
            "videos_analyzed": len(videos),
            "sentiment_distribution": sentiment_percentages,
            "sentiment_counts": sentiment_counts,
            "categorized_comments": categorized_comments,
            "timeline": timeline,
            "trending_topics": top_topics
        })

    if not all_channels_data:
        return jsonify({"error": "No comment data found"}), 404

    # GENERATE COMPARISON INSIGHTS (if multiple channels)
    comparison_insights = []
    
    if len(all_channels_data) > 1:
        primary = all_channels_data[0]
        competitors = all_channels_data[1:]
        
        # Calculate competitor averages
        avg_competitor_positive = sum(c["sentiment_distribution"]["positive"] for c in competitors) / len(competitors)
        avg_competitor_negative = sum(c["sentiment_distribution"]["negative"] for c in competitors) / len(competitors)
        
        primary_positive = primary["sentiment_distribution"]["positive"]
        primary_negative = primary["sentiment_distribution"]["negative"]
        
        # Positive sentiment comparison
        positive_gap = primary_positive - avg_competitor_positive
        if positive_gap > 10:
            comparison_insights.append({
                "type": "positive_lead",
                "title": "Your Audience Is More Positive! 🎉",
                "description": f"Your channel has {primary_positive:.1f}% positive sentiment vs {avg_competitor_positive:.1f}% average across other channels.",
                "action": "Your content resonates better. Document what makes your approach different and double down on it.",
                "impact": "positive",
                "metric": f"+{positive_gap:.1f}% ahead"
            })
        elif positive_gap < -10:
            comparison_insights.append({
                "type": "positive_lag",
                "title": "Other Channels Have More Positive Sentiment",
                "description": f"Your {primary_positive:.1f}% positive sentiment trails the {avg_competitor_positive:.1f}% average.",
                "action": "Review top videos from other channels. What are they doing differently to earn better sentiment?",
                "impact": "needs_improvement",
                "metric": f"{abs(positive_gap):.1f}% gap"
            })
        
        # Negative sentiment comparison
        negative_gap = primary_negative - avg_competitor_negative
        if negative_gap > 10:
            comparison_insights.append({
                "type": "negative_high",
                "title": "You Have More Negative Comments Than Others",
                "description": f"Your {primary_negative:.1f}% negative sentiment is higher than the {avg_competitor_negative:.1f}% average.",
                "action": "Read your negative comments carefully. Are there common complaints you can address in future content?",
                "impact": "critical",
                "metric": f"+{negative_gap:.1f}% more negative"
            })
        elif negative_gap < -5:
            comparison_insights.append({
                "type": "negative_low",
                "title": "You Have Fewer Negative Comments! ✅",
                "description": f"Your {primary_negative:.1f}% negative sentiment beats the {avg_competitor_negative:.1f}% average.",
                "action": "Your audience is more satisfied. Keep maintaining these quality standards.",
                "impact": "positive",
                "metric": f"{abs(negative_gap):.1f}% less negative"
            })
        
        # Engagement volume comparison
        avg_comments_per_video = primary["total_comments"] / primary["videos_analyzed"]
        competitor_avg_comments = sum(c["total_comments"] / c["videos_analyzed"] for c in competitors) / len(competitors)
        
        comment_gap = avg_comments_per_video - competitor_avg_comments
        if comment_gap > 10:
            comparison_insights.append({
                "type": "engagement_high",
                "title": "Your Videos Spark More Discussion",
                "description": f"You average {avg_comments_per_video:.0f} comments per video vs {competitor_avg_comments:.0f} for others.",
                "action": "Your content prompts conversation. Keep asking questions and creating discussion-worthy content.",
                "impact": "positive",
                "metric": f"+{comment_gap:.0f} more comments/video"
            })
        elif comment_gap < -10:
            comparison_insights.append({
                "type": "engagement_low",
                "title": "Your Videos Get Fewer Comments",
                "description": f"You average {avg_comments_per_video:.0f} comments per video vs {competitor_avg_comments:.0f} for others.",
                "action": "Ask questions, create polls, and encourage discussion to boost comment engagement.",
                "impact": "needs_improvement",
                "metric": f"{abs(comment_gap):.0f} fewer comments/video"
            })
        
        # Topic diversity
        primary_unique_topics = len(primary["trending_topics"])
        avg_competitor_topics = sum(len(c["trending_topics"]) for c in competitors) / len(competitors)
        
        if primary_unique_topics > avg_competitor_topics * 1.2:
            comparison_insights.append({
                "type": "topic_diversity",
                "title": "Your Audience Discusses More Diverse Topics",
                "description": f"Your comments cover {primary_unique_topics} topics vs {avg_competitor_topics:.0f} average for others.",
                "action": "Varied discussions indicate broad appeal. This is a strength to maintain.",
                "impact": "positive",
                "metric": f"{primary_unique_topics} unique topics"
            })

    # Individual channel insights (for primary channel)
    if all_channels_data:
        primary = all_channels_data[0]
        insights = []
        
        if primary["sentiment_distribution"]["positive"] > 70:
            insights.append({
                "type": "positive_sentiment",
                "title": "Strong Positive Reception",
                "description": f"{primary['sentiment_distribution']['positive']}% of your comments are positive. Your audience is very satisfied.",
                "action": "Keep this momentum going! Your content strategy is working."
            })
        elif primary["sentiment_distribution"]["negative"] > 30:
            insights.append({
                "type": "negative_sentiment",
                "title": "Watch Out - Negative Sentiment Detected",
                "description": f"{primary['sentiment_distribution']['negative']}% of your comments show dissatisfaction.",
                "action": "Review negative comments to identify and address common concerns."
            })
        
        # Timeline trend
        if len(primary["timeline"]) >= 3:
            recent_positive = primary["timeline"][-1]["positive_percent"]
            old_positive = primary["timeline"][0]["positive_percent"]
            
            if recent_positive > old_positive + 10:
                insights.append({
                    "type": "improving_sentiment",
                    "title": "Your Sentiment Is Improving Over Time! 📈",
                    "description": f"Positive comments increased from {old_positive}% to {recent_positive}%.",
                    "action": "Your recent content changes are working. Continue this direction!"
                })
            elif recent_positive < old_positive - 10:
                insights.append({
                    "type": "declining_sentiment",
                    "title": "Your Sentiment Is Declining - Take Action",
                    "description": f"Positive comments dropped from {old_positive}% to {recent_positive}%.",
                    "action": "Review what changed in your recent videos. Check for patterns in negative feedback."
                })

        if primary["trending_topics"]:
            insights.append({
                "type": "trending_topics",
                "title": f"Your Top Discussion Topic: '{primary['trending_topics'][0]['topic'].title()}'",
                "description": f"Mentioned {primary['trending_topics'][0]['mentions']} times in your comments.",
                "action": f"Your audience is talking about {', '.join([t['topic'] for t in primary['trending_topics'][:3]])}. Use this for content ideas!"
            })
        
        all_channels_data[0]["insights"] = insights

    return jsonify({
        "channels": all_channels_data,
        "comparison_insights": comparison_insights,
        "has_comparison": len(all_channels_data) > 1
    }), 200


# ========================= TRENDING CONTENT ANALYZER =========================
@performance_analyzer_bp.route("/analyzer.trendingContent", methods=["GET"])
def trending_content():
    """
    Analyze top performing videos across channels with actionable insights.
    Shows what's working and why.
    """
    urls_param = request.args.get("urls")
    if not urls_param:
        return jsonify({"error": "Missing urls parameter"}), 400

    try:
        max_videos = int(request.args.get("maxVideos", "50"))
    except ValueError:
        max_videos = 50

    channel_urls = [url.strip() for url in urls_param.split(",") if url.strip()]
    
    if not channel_urls:
        return jsonify({"error": "No valid channel URLs provided"}), 400

    all_videos_data = []

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
        
        # Add channel info and metrics to each video
        for video in videos:
            video["channel_url"] = channel_url
            video["channel_id"] = channel_id
            
            # Calculate engagement rate
            views = video.get("views", 0)
            likes = video.get("likes", 0)
            comments = video.get("comments", 0)
            video["engagement_rate"] = (likes + comments) / views if views > 0 else 0
            
            # Calculate performance score
            video["performance_score"] = views * 0.4 + likes * 0.3 + comments * 30 * 0.3
            
        all_videos_data.extend(videos)

    if not all_videos_data:
        return jsonify({"error": "No video data found"}), 404

    # Sort by different metrics
    top_by_views = sorted(all_videos_data, key=lambda v: v.get("views", 0), reverse=True)[:10]
    top_by_engagement = sorted(all_videos_data, key=lambda v: v.get("engagement_rate", 0), reverse=True)[:10]
    top_by_performance = sorted(all_videos_data, key=lambda v: v.get("performance_score", 0), reverse=True)[:10]

    # Analyze patterns in top performers
    def extract_title_patterns(videos):
        """Find common patterns in successful video titles"""
        patterns = {
            "how_to": 0,
            "list_format": 0,
            "question": 0,
            "ultimate": 0,
            "vs_comparison": 0,
            "year_specific": 0,
            "beginner": 0,
            "advanced": 0,
            "quick": 0,
            "complete": 0
        }
        
        for video in videos:
            title = video.get("title", "").lower()
            
            if "how to" in title or "how-to" in title:
                patterns["how_to"] += 1
            if any(word in title for word in ["top", "best", "ways", "tips", "things"]):
                patterns["list_format"] += 1
            if "?" in title:
                patterns["question"] += 1
            if "ultimate" in title or "complete" in title:
                patterns["ultimate"] += 1
            if " vs " in title or " versus " in title:
                patterns["vs_comparison"] += 1
            if "2024" in title or "2025" in title or "2026" in title:
                patterns["year_specific"] += 1
            if "beginner" in title or "basics" in title:
                patterns["beginner"] += 1
            if "advanced" in title or "pro" in title:
                patterns["advanced"] += 1
            if "quick" in title or "fast" in title or "minute" in title:
                patterns["quick"] += 1
            if "complete" in title or "full" in title or "entire" in title:
                patterns["complete"] += 1
        
        return patterns

    title_patterns = extract_title_patterns(top_by_performance)
    
    most_effective_pattern = max(title_patterns.items(), key=lambda x: x[1])

    # Analyze video length preferences (from title indicators)
    length_distribution = {"short": 0, "medium": 0, "long": 0}
    for video in top_by_performance:
        title = video.get("title", "").lower()
        if "short" in title or "#short" in title:
            length_distribution["short"] += 1
        elif any(word in title for word in ["full", "complete", "entire", "long"]):
            length_distribution["long"] += 1
        else:
            length_distribution["medium"] += 1

    # Extract trending topics
    all_title_words = " ".join([v.get("title", "") for v in top_by_performance]).lower().split()
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "been", "be",
        "have", "has", "had", "do", "does", "did", "will", "would", "should",
        "can", "could", "may", "might", "this", "that", "these", "those",
        "what", "which", "who", "when", "where", "why", "how", "my", "your"
    }
    
    topic_words = [w for w in all_title_words if len(w) > 4 and w not in stop_words and w.isalpha()]
    trending_topics = Counter(topic_words).most_common(10)

    # Generate insights
    insights = []

    if most_effective_pattern[1] > 0:
        pattern_name = most_effective_pattern[0].replace("_", " ").title()
        insights.append({
            "type": "title_pattern",
            "title": f"{pattern_name} Format Performs Best",
            "description": f"{most_effective_pattern[1]} out of your top 10 videos use {pattern_name.lower()} in titles.",
            "action": f"Create more videos with {pattern_name.lower()} titles. Examples: {', '.join([v['title'][:40] for v in top_by_performance[:2]])}...",
            "impact": "high"
        })

    preferred_length = max(length_distribution.items(), key=lambda x: x[1])
    if preferred_length[1] > 3:
        insights.append({
            "type": "video_length",
            "title": f"{preferred_length[0].title()}-Form Content Dominates",
            "description": f"{preferred_length[1]} of top performers are {preferred_length[0]} videos.",
            "action": f"Focus on creating more {preferred_length[0]}-length content for maximum performance.",
            "impact": "high"
        })

    avg_engagement_top = sum(v.get("engagement_rate", 0) for v in top_by_engagement[:10]) / 10
    avg_engagement_all = sum(v.get("engagement_rate", 0) for v in all_videos_data) / len(all_videos_data)
    
    if avg_engagement_top > avg_engagement_all * 1.5:
        insights.append({
            "type": "engagement_gap",
            "title": "Big Engagement Gap Between Best and Average",
            "description": f"Top videos have {(avg_engagement_top * 100):.2f}% engagement vs {(avg_engagement_all * 100):.2f}% average.",
            "action": "Study your top performers closely. What hooks, thumbnails, or topics made them stand out?",
            "impact": "critical"
        })

    if trending_topics:
        insights.append({
            "type": "trending_topics",
            "title": f"'{trending_topics[0][0].title()}' is Your Hottest Topic",
            "description": f"This appears in {trending_topics[0][1]} top video titles.",
            "action": f"Double down on content about {', '.join([t[0] for t in trending_topics[:3]])}. These topics resonate with your audience.",
            "impact": "high"
        })

    total_views = sum(v.get("views", 0) for v in all_videos_data)
    total_engagement = sum(v.get("likes", 0) + v.get("comments", 0) for v in all_videos_data)
    avg_views_per_video = total_views / len(all_videos_data)
    
    above_average = len([v for v in all_videos_data if v.get("views", 0) > avg_views_per_video])
    below_average = len(all_videos_data) - above_average
    
    insights.append({
        "type": "consistency",
        "title": f"Performance Consistency: {above_average}/{len(all_videos_data)} Videos Above Average",
        "description": f"{(above_average / len(all_videos_data) * 100):.0f}% of videos exceed your channel average.",
        "action": "Good consistency!" if above_average > len(all_videos_data) * 0.4 else "Work on consistency - too many underperformers.",
        "impact": "medium"
    })

    return jsonify({
        "top_by_views": [
            {
                "id": v["id"],
                "title": v["title"],
                "thumbnail": v.get("thumbnail", ""),
                "views": v["views"],
                "likes": v["likes"],
                "comments": v["comments"],
                "engagement_rate": round(v["engagement_rate"], 4),
                "channel_url": v["channel_url"]
            }
            for v in top_by_views
        ],
        "top_by_engagement": [
            {
                "id": v["id"],
                "title": v["title"],
                "thumbnail": v.get("thumbnail", ""),
                "views": v["views"],
                "likes": v["likes"],
                "comments": v["comments"],
                "engagement_rate": round(v["engagement_rate"], 4),
                "channel_url": v["channel_url"]
            }
            for v in top_by_engagement
        ],
        "title_patterns": title_patterns,
        "length_distribution": length_distribution,
        "trending_topics": [{"topic": t[0], "count": t[1]} for t in trending_topics],
        "insights": insights,
        "channel_metrics": {
            "total_videos_analyzed": len(all_videos_data),
            "total_views": total_views,
            "total_engagement": total_engagement,
            "avg_views_per_video": round(avg_views_per_video, 0),
            "above_average_count": above_average,
            "below_average_count": below_average
        }
    }), 200
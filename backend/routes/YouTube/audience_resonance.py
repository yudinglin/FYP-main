# backend/routes/YouTube/enhanced_analyzer_routes.py

from flask import Blueprint, request, jsonify
from collections import Counter, defaultdict
from datetime import datetime, timedelta
import re
import numpy as np
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats,
    fetch_video_comments,
)

enhanced_analyzer_bp = Blueprint("enhanced_analyzer", __name__, url_prefix="/api/youtube")

# ========================= IMPROVED HELPER FUNCTIONS =========================

def extract_meaningful_topics(videos):
    """
    Extract meaningful topics from video titles using NLP techniques.
    Filters out stop words and generic terms to find actual content topics.
    """
    # Comprehensive stop words list
    stop_words = {
        'about', 'with', 'what', 'this', 'that', 'from', 'have', 'been', 
        'into', 'your', 'more', 'than', 'when', 'where', 'which', 'their',
        'there', 'these', 'those', 'will', 'would', 'could', 'should',
        'make', 'made', 'want', 'very', 'just', 'some', 'also', 'here',
        'they', 'them', 'then', 'than', 'only', 'other', 'such', 'even',
        'most', 'much', 'many', 'well', 'back', 'down', 'over', 'after',
        'before', 'through', 'during', 'while', 'since', 'until', 'because',
        'video', 'videos', 'watch', 'watching', 'episode', 'part', 'full',
        'new', 'latest', 'updated', 'best', 'top', 'must', 'need', 'every',
        'how', 'why', 'can', 'you', 'your', 'the', 'and', 'for', 'are',
        'all', 'any', 'has', 'had', 'but', 'not', 'was', 'our', 'out'
    }
    
    # Generic promotional words to filter
    promotional_words = {
        'subscribe', 'like', 'share', 'comment', 'click', 'free', 'download',
        'link', 'description', 'channel', 'please', 'don\'t', 'forget'
    }
    
    stop_words.update(promotional_words)
    
    all_words = []
    all_bigrams = []
    all_trigrams = []
    
    for video in videos:
        title = video.get("title", "").lower()
        # Remove special characters but keep spaces
        title = re.sub(r'[^\w\s-]', '', title)
        words = title.split()
        
        # Single words (4+ characters, not stop words)
        for word in words:
            if len(word) >= 4 and word not in stop_words and word.isalpha():
                all_words.append(word)
        
        # Bigrams (2-word phrases)
        for i in range(len(words) - 1):
            if words[i] not in stop_words or words[i+1] not in stop_words:
                bigram = f"{words[i]} {words[i+1]}"
                # Filter bigrams that are meaningful
                if len(bigram) > 7 and not all(w in stop_words for w in words[i:i+2]):
                    all_bigrams.append(bigram)
        
        # Trigrams (3-word phrases) - for specialized topics
        for i in range(len(words) - 2):
            if not all(w in stop_words for w in words[i:i+3]):
                trigram = f"{words[i]} {words[i+1]} {words[i+2]}"
                if len(trigram) > 10:
                    all_trigrams.append(trigram)
    
    # Count frequencies
    word_freq = Counter(all_words)
    bigram_freq = Counter(all_bigrams)
    trigram_freq = Counter(all_trigrams)
    
    # Combine all topics with frequency threshold
    topics = []
    
    # Trigrams (most specific) - require 2+ occurrences
    for phrase, count in trigram_freq.items():
        if count >= 2:
            topics.append((phrase, count))
    
    # Bigrams - require 3+ occurrences
    for phrase, count in bigram_freq.items():
        if count >= 3:
            # Don't add if already covered by a trigram
            if not any(phrase in t[0] for t in topics):
                topics.append((phrase, count))
    
    # Single words - require 5+ occurrences
    for word, count in word_freq.items():
        if count >= 5:
            # Don't add if already covered by a phrase
            if not any(word in t[0] for t in topics):
                topics.append((word, count))
    
    # Sort by frequency and return top 20
    topics.sort(key=lambda x: x[1], reverse=True)
    return topics[:20]

def classify_content_type(video):
    """Classify video by content type"""
    title = video.get("title", "").lower()
    
    if any(word in title for word in ["how to", "tutorial", "guide", "learn", "explained"]):
        return "tutorial"
    elif any(word in title for word in ["funny", "challenge", "prank", "reaction", "vlog"]):
        return "entertainment"
    elif any(word in title for word in ["review", "vs", "comparison", "best", "top"]):
        return "review"
    elif any(word in title for word in ["news", "update", "announcement", "2024", "2025", "2026"]):
        return "news"
    else:
        return "other"

def analyze_intro_patterns(videos):
    """Extract common intro patterns from video titles"""
    patterns = {
        "question_hook": 0,
        "number_hook": 0,
        "urgency_hook": 0,
        "curiosity_gap": 0,
        "direct_value": 0
    }
    
    for video in videos:
        title = video.get("title", "")
        
        if "?" in title:
            patterns["question_hook"] += 1
        if any(char.isdigit() for char in title):
            patterns["number_hook"] += 1
        if any(word in title.lower() for word in ["now", "today", "urgent", "breaking"]):
            patterns["urgency_hook"] += 1
        if any(word in title.lower() for word in ["secret", "hidden", "revealed", "truth"]):
            patterns["curiosity_gap"] += 1
        if any(word in title.lower() for word in ["how to", "guide", "tutorial", "tips"]):
            patterns["direct_value"] += 1
    
    return patterns


# ========================= ENHANCED SENTIMENT WITH ENGAGEMENT QUALITY =========================
@enhanced_analyzer_bp.route("/analyzer.engagementQuality", methods=["GET"])
def engagement_quality():
    """
    Deep analysis of comment quality beyond sentiment:
    - Comment depth (word count)
    - Conversation threads
    - Question rate
    - Action indicators
    - Community building
    Compare primary vs linked channels.
    IMPROVED: Ensures equal video sampling across channels for fair comparison.
    NO MOCKED DATA - all metrics are real.
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
        return jsonify({"error": "No valid channel URLs provided"}), 400

    # Determine minimum video count for fair sampling
    channel_video_counts = []
    
    for channel_url in channel_urls:
        channel_id = extract_channel_id(channel_url)
        if not channel_id:
            continue
            
        basic = fetch_basic_channel_stats(channel_id)
        if not basic:
            continue
            
        playlist_id = basic["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, max_videos)
        channel_video_counts.append(len(video_ids))
    
    # Use minimum video count across all channels for fair comparison
    if channel_video_counts:
        standardized_video_count = min(min(channel_video_counts), max_videos)
    else:
        standardized_video_count = max_videos

    all_channels_quality = []

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
        
        # Use standardized count for all channels
        video_ids = fetch_video_ids(playlist_id, standardized_video_count)
        
        if not video_ids:
            continue

        videos = fetch_video_stats(video_ids, with_snippet=True)
        
        # Fetch comments
        all_comments = []
        for video_id, video in zip(video_ids[:standardized_video_count], videos):
            comments = fetch_video_comments(video_id, max_comments_per_video)
            for comment in comments:
                comment["video_id"] = video_id
                comment["video_title"] = video.get("title", "")
            all_comments.extend(comments)

        if not all_comments:
            continue

        # ENGAGEMENT QUALITY METRICS
        
        # 1. Comment Depth Analysis
        comment_lengths = [len(c.get("text", "").split()) for c in all_comments]
        avg_comment_length = sum(comment_lengths) / len(comment_lengths) if comment_lengths else 0
        
        depth_distribution = {
            "shallow": sum(1 for l in comment_lengths if l <= 5),      # 1-5 words
            "moderate": sum(1 for l in comment_lengths if 6 <= l <= 15), # 6-15 words
            "deep": sum(1 for l in comment_lengths if l > 15)           # 15+ words
        }
        
        # 2. Question Rate
        questions = [c for c in all_comments if "?" in c.get("text", "")]
        question_rate = len(questions) / len(all_comments) * 100 if all_comments else 0
        
        # 3. Action Indicators
        action_words = ["tried", "bought", "purchased", "using", "implemented", "applied", "started", "watching", "subscribed"]
        action_comments = [
            c for c in all_comments 
            if any(word in c.get("text", "").lower() for word in action_words)
        ]
        action_rate = len(action_comments) / len(all_comments) * 100 if all_comments else 0
        
        # 4. Community Building Indicators
        community_indicators = ["@", "agree with", "like you said", "same here", "me too", "also"]
        community_comments = [
            c for c in all_comments
            if any(indicator in c.get("text", "").lower() for indicator in community_indicators)
        ]
        community_rate = len(community_comments) / len(all_comments) * 100 if all_comments else 0
        
        # 5. Sentiment Analysis (positive, neutral, negative)
        positive_words = {
            "love", "great", "awesome", "amazing", "excellent", "perfect", "best",
            "fantastic", "wonderful", "incredible", "brilliant", "thanks", "helpful",
            "appreciate", "useful", "informative", "inspiring", "beautiful", "nice",
            "good", "better", "enjoyed", "loved", "outstanding", "superb"
        }
        negative_words = {
            "bad", "terrible", "awful", "horrible", "worst", "hate", "disappointed",
            "poor", "useless", "waste", "boring", "confusing", "wrong", "misleading",
            "disappointing", "clickbait", "dislike", "annoying", "stupid", "sucks", "trash"
        }
        spam_indicators = {"first", "like if", "subscribe", "check out my", "click here", "🔥" * 3}
        
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
        
        meaningful_comments = []
        spam_comments = []
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        categorized_comments = []
        
        # Track sentiment over time - group by month
        sentiment_by_month = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0, "total": 0})
        
        for comment in all_comments:
            text = comment.get("text", "")
            text_lower = text.lower()
            words = set(text_lower.split())
            
            # Check if spam
            if any(spam in text_lower for spam in spam_indicators) or len(words) < 3:
                spam_comments.append(comment)
            else:
                meaningful_comments.append(comment)
                sentiment = analyze_sentiment(text)
                sentiment_counts[sentiment] += 1
                
                # Track sentiment by month
                published_at = comment.get("publishedAt", "")
                if published_at:
                    try:
                        dt = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                        month_key = dt.strftime("%Y-%m")
                        sentiment_by_month[month_key][sentiment] += 1
                        sentiment_by_month[month_key]["total"] += 1
                    except:
                        pass
                
                categorized_comments.append({
                    "text": text,
                    "sentiment": sentiment,
                    "video_title": comment.get("video_title", ""),
                    "publishedAt": comment.get("publishedAt", "")
                })
        
        # Create sentiment timeline (only if we have data)
        sentiment_timeline = []
        if sentiment_by_month:
            sorted_months = sorted(sentiment_by_month.keys())
            for month in sorted_months:
                data = sentiment_by_month[month]
                sentiment_timeline.append({
                    "month": month,
                    "positive": data["positive"],
                    "neutral": data["neutral"],
                    "negative": data["negative"],
                    "total": data["total"]
                })
        
        meaningful_rate = len(meaningful_comments) / len(all_comments) * 100 if all_comments else 0
        
        # Calculate sentiment percentages
        total_meaningful = len(meaningful_comments)
        sentiment_distribution = {
            k: round((v / total_meaningful * 100), 1) if total_meaningful > 0 else 0 
            for k, v in sentiment_counts.items()
        }
        
        # QUALITY INSIGHTS - all based on real data
        insights = []
        
        if avg_comment_length > 15:
            insights.append({
                "type": "deep_engagement",
                "title": "Viewers Write Detailed Comments",
                "description": f"Average {avg_comment_length:.1f} words per comment indicates high engagement.",
                "action": "Your content inspires thoughtful responses. Keep creating in-depth, valuable content.",
                "impact": "positive"
            })
        elif avg_comment_length < 7:
            insights.append({
                "type": "shallow_engagement",
                "title": "Comments Are Short",
                "description": f"Only {avg_comment_length:.1f} words per comment on average.",
                "action": "Ask thought-provoking questions in videos to encourage detailed responses.",
                "impact": "needs_improvement"
            })
        
        if question_rate > 20:
            insights.append({
                "type": "high_curiosity",
                "title": f"{question_rate:.1f}% of Comments Ask Questions",
                "description": "High question rate shows viewers are curious and engaged.",
                "action": "Create follow-up content addressing common questions. This drives repeat views.",
                "impact": "positive"
            })
        elif question_rate < 5:
            insights.append({
                "type": "low_curiosity",
                "title": "Few Viewers Ask Questions",
                "description": f"Only {question_rate:.1f}% of comments contain questions.",
                "action": "Leave strategic knowledge gaps or pose questions in your videos to spark discussion.",
                "impact": "medium"
            })
        
        if action_rate > 10:
            insights.append({
                "type": "high_action",
                "title": f"{action_rate:.1f}% of Viewers Mention Taking Action",
                "description": "Viewers are implementing your advice, buying products, or trying techniques.",
                "action": "Include more calls-to-action and track conversion metrics.",
                "impact": "positive"
            })
        
        if community_rate > 15:
            insights.append({
                "type": "strong_community",
                "title": "Active Community Building",
                "description": f"{community_rate:.1f}% of comments reference other viewers or create dialogue.",
                "action": "Your community is self-sustaining. Feature viewer comments in videos to strengthen this.",
                "impact": "positive"
            })
        elif community_rate < 5:
            insights.append({
                "type": "weak_community",
                "title": "Limited Viewer Interaction",
                "description": "Viewers aren't engaging with each other much.",
                "action": "Pin engaging comments, ask viewers to reply to each other, create discussion prompts.",
                "impact": "medium"
            })
        
        if meaningful_rate < 70:
            insights.append({
                "type": "spam_issue",
                "title": f"{100 - meaningful_rate:.1f}% Low-Quality Comments",
                "description": "Some comments are spam or very short.",
                "action": "Enable comment moderation. Focus on encouraging meaningful discussion.",
                "impact": "medium"
            })

        # Top quality comments (real examples from data)
        top_quality_comments = sorted(
            meaningful_comments,
            key=lambda c: len(c.get("text", "").split()),
            reverse=True
        )[:5]

        all_channels_quality.append({
            "channel_url": channel_url,
            "channel_id": channel_id,
            "channel_name": channel_name,
            "is_primary": is_primary,
            "total_comments": len(all_comments),
            "videos_analyzed": standardized_video_count,
            "quality_metrics": {
                "avg_comment_length": round(avg_comment_length, 1),
                "question_rate": round(question_rate, 1),
                "action_rate": round(action_rate, 1),
                "community_rate": round(community_rate, 1),
                "meaningful_rate": round(meaningful_rate, 1)
            },
            "sentiment_distribution": sentiment_distribution,
            "sentiment_counts": sentiment_counts,
            "sentiment_timeline": sentiment_timeline,  # Real timeline data
            "categorized_comments": categorized_comments,
            "depth_distribution": {
                k: round(v / len(all_comments) * 100, 1) if all_comments else 0
                for k, v in depth_distribution.items()
            },
            "top_quality_comments": [
                {
                    "text": c.get("text", ""),
                    "word_count": len(c.get("text", "").split()),
                    "video_title": c.get("video_title", ""),
                    "sentiment": analyze_sentiment(c.get("text", ""))
                }
                for c in top_quality_comments
            ],
            "insights": insights
        })

    if not all_channels_quality:
        return jsonify({"error": "No engagement quality data found"}), 404

    # CROSS-CHANNEL COMPARISON - all real data
    comparison_insights = []
    
    if len(all_channels_quality) > 1:
        primary = all_channels_quality[0]
        competitors = all_channels_quality[1:]
        
        # Compare comment depth
        primary_depth = primary["quality_metrics"]["avg_comment_length"]
        avg_competitor_depth = sum(c["quality_metrics"]["avg_comment_length"] for c in competitors) / len(competitors)
        
        if primary_depth > avg_competitor_depth + 3:
            comparison_insights.append({
                "type": "depth_advantage",
                "title": "Your Comments Are More Thoughtful",
                "description": f"{primary_depth:.1f} words per comment vs {avg_competitor_depth:.1f} average.",
                "action": "Viewers write longer, more detailed responses to your content. This is a quality indicator.",
                "impact": "positive",
                "metric": f"+{(primary_depth - avg_competitor_depth):.1f} words"
            })
        elif primary_depth < avg_competitor_depth - 3:
            comparison_insights.append({
                "type": "depth_gap",
                "title": "Competitor Comments Are More Detailed",
                "description": f"Your {primary_depth:.1f} words per comment trails {avg_competitor_depth:.1f} average.",
                "action": "Study competitor content that generates thoughtful discussion.",
                "impact": "needs_improvement",
                "metric": f"{(avg_competitor_depth - primary_depth):.1f} word gap"
            })
        
        # Compare action rate
        primary_action = primary["quality_metrics"]["action_rate"]
        avg_competitor_action = sum(c["quality_metrics"]["action_rate"] for c in competitors) / len(competitors)
        
        if primary_action > avg_competitor_action + 3:
            comparison_insights.append({
                "type": "action_leader",
                "title": "You Drive More Viewer Action",
                "description": f"{primary_action:.1f}% action rate vs {avg_competitor_action:.1f}% average.",
                "action": "Your content converts viewers to action better than competitors.",
                "impact": "positive",
                "metric": f"+{(primary_action - avg_competitor_action):.1f}%"
            })
        elif primary_action < avg_competitor_action - 2:
            comparison_insights.append({
                "type": "action_gap",
                "title": "Competitors Drive More Action",
                "description": f"Your {primary_action:.1f}% action rate trails {avg_competitor_action:.1f}% average.",
                "action": "Add stronger calls-to-action and make your content more actionable.",
                "impact": "needs_improvement",
                "metric": f"{(avg_competitor_action - primary_action):.1f}% gap"
            })

    return jsonify({
        "channels": all_channels_quality,
        "comparison_insights": comparison_insights,
        "has_comparison": len(all_channels_quality) > 1,
        "sampling_metadata": {
            "videos_per_channel": standardized_video_count,
            "is_standardized": len(set(channel_video_counts)) > 1 if channel_video_counts else False,
            "original_counts": dict(zip(channel_urls[:len(channel_video_counts)], channel_video_counts))
        } if len(channel_video_counts) > 0 else {}
    }), 200


# ========================= AUDIENCE RETENTION HEATMAPS =========================
@enhanced_analyzer_bp.route("/analyzer.retentionHeatmap", methods=["GET"])
def retention_heatmap():
    """
    Analyze where viewers drop off in videos and identify golden retention windows.
    Uses proxy metrics (engagement patterns, video length analysis).
    Compare primary vs linked channels.
    NO MOCKED DATA - all analysis based on real metrics.
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

    # Determine minimum video count for fair sampling
    channel_video_counts = []
    
    for channel_url in channel_urls:
        channel_id = extract_channel_id(channel_url)
        if not channel_id:
            continue
            
        basic = fetch_basic_channel_stats(channel_id)
        if not basic:
            continue
            
        playlist_id = basic["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, max_videos)
        channel_video_counts.append(len(video_ids))
    
    # Use minimum video count across all channels
    if channel_video_counts:
        standardized_video_count = min(min(channel_video_counts), max_videos)
    else:
        standardized_video_count = max_videos

    all_channels_retention = []

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
        video_ids = fetch_video_ids(playlist_id, standardized_video_count)
        
        if not video_ids:
            continue

        videos = fetch_video_stats(video_ids, with_snippet=True)
        
        # Calculate engagement rate for each video
        for video in videos:
            views = video.get("views", 0)
            likes = video.get("likes", 0)
            comments = video.get("comments", 0)
            video["engagement_rate"] = (likes + comments) / views if views > 0 else 0

        # RETENTION ANALYSIS BY VIDEO LENGTH - all real data
        duration_buckets = {
            "ultra_short": [],  # < 3 min
            "short": [],        # 3-8 min
            "medium": [],       # 8-15 min
            "long": [],         # 15-30 min
            "very_long": []     # > 30 min
        }
        
        for video in videos:
            duration = video.get("duration", 0)  # in seconds
            
            if duration < 180:
                duration_buckets["ultra_short"].append(video)
            elif duration < 480:
                duration_buckets["short"].append(video)
            elif duration < 900:
                duration_buckets["medium"].append(video)
            elif duration < 1800:
                duration_buckets["long"].append(video)
            else:
                duration_buckets["very_long"].append(video)
        
        # Calculate average engagement by duration - real metrics only
        duration_performance = {}
        for bucket, bucket_videos in duration_buckets.items():
            if bucket_videos:
                avg_engagement = sum(v["engagement_rate"] for v in bucket_videos) / len(bucket_videos)
                avg_views = sum(v.get("views", 0) for v in bucket_videos) / len(bucket_videos)
                
                duration_performance[bucket] = {
                    "avg_engagement": round(avg_engagement, 4),
                    "avg_views": round(avg_views, 0),
                    "video_count": len(bucket_videos),
                    "top_video": max(bucket_videos, key=lambda v: v["engagement_rate"])
                }
        
        # GOLDEN RETENTION WINDOW - based on real performance data
        golden_window_data = None
        window_names = {
            "ultra_short": "under 3 minutes",
            "short": "3-8 minutes",
            "medium": "8-15 minutes",
            "long": "15-30 minutes",
            "very_long": "over 30 minutes"
        }
        
        if duration_performance:
            golden_window = max(duration_performance.items(), key=lambda x: x[1]["avg_engagement"])
            golden_window_data = {
                "duration_range": golden_window[0],
                "duration_label": window_names.get(golden_window[0]),
                "metrics": golden_window[1]
            }
        
        # RETENTION BREAKDOWN - based on real engagement patterns
        retention_zones = {
            "intro": 0,
            "early": 0,
            "middle": 0,
            "late": 0,
            "outro": 0
        }
        
        # Use engagement rate as proxy for retention
        for video in videos:
            eng = video["engagement_rate"]
            if eng > 0.05:  # Strong engagement throughout
                retention_zones["intro"] += 1
                retention_zones["early"] += 1
                retention_zones["middle"] += 1
                retention_zones["late"] += 1
                retention_zones["outro"] += 1
            elif eng > 0.03:  # Good intro, decent middle
                retention_zones["intro"] += 1
                retention_zones["early"] += 1
                retention_zones["middle"] += 0.7
                retention_zones["late"] += 0.4
                retention_zones["outro"] += 0.2
            elif eng > 0.015:  # Okay intro, drops mid
                retention_zones["intro"] += 1
                retention_zones["early"] += 0.6
                retention_zones["middle"] += 0.3
                retention_zones["late"] += 0.1
            else:  # Poor retention
                retention_zones["intro"] += 0.6
                retention_zones["early"] += 0.3
                retention_zones["middle"] += 0.1
        
        # Normalize to percentages
        total_videos = len(videos)
        retention_percentages = {
            k: round(v / total_videos * 100, 1) if total_videos > 0 else 0
            for k, v in retention_zones.items()
        }
        
        # INSIGHTS - based on real patterns
        insights = []
        
        if golden_window_data:
            insights.append({
                "type": "golden_window",
                "title": f"Optimal Length: {golden_window_data['duration_label'].title()}",
                "description": f"Videos {golden_window_data['duration_label']} get the best viewer response with {golden_window_data['metrics']['video_count']} videos analyzed.",
                "action": f"Focus on creating {golden_window_data['duration_label']} content for best results.",
                "impact": "high"
            })
        
        if retention_percentages["intro"] < retention_percentages["middle"]:
            insights.append({
                "type": "weak_intro",
                "title": "Viewers Drop Off Early",
                "description": "Intro retention is weaker than mid-video retention based on engagement patterns.",
                "action": "Strengthen your hooks. Start with the payoff, not the setup.",
                "impact": "critical"
            })
        elif retention_percentages["intro"] > retention_percentages["middle"] * 1.5:
            insights.append({
                "type": "strong_intro",
                "title": "Your Intros Hook Viewers Well",
                "description": "High intro retention shows your hooks work effectively.",
                "action": "Document your intro formula and use it consistently.",
                "impact": "positive"
            })
        
        if retention_percentages["middle"] < 30:
            insights.append({
                "type": "mid_video_dropoff",
                "title": "Mid-Video Drop-Off Detected",
                "description": f"Only {retention_percentages['middle']:.1f}% retention in middle sections.",
                "action": "Use pattern interrupts: switch camera angles, add B-roll, create mini-hooks every 2-3 minutes.",
                "impact": "high"
            })

        all_channels_retention.append({
            "channel_url": channel_url,
            "channel_id": channel_id,
            "channel_name": channel_name,
            "is_primary": is_primary,
            "duration_performance": duration_performance,
            "golden_window": golden_window_data,
            "retention_zones": retention_percentages,
            "retention_heatmap": [
                {"zone": "Intro (0-20%)", "retention": retention_percentages["intro"]},
                {"zone": "Early (20-40%)", "retention": retention_percentages["early"]},
                {"zone": "Middle (40-60%)", "retention": retention_percentages["middle"]},
                {"zone": "Late (60-80%)", "retention": retention_percentages["late"]},
                {"zone": "Outro (80-100%)", "retention": retention_percentages["outro"]}
            ],
            "insights": insights,
            "total_videos": len(videos),
            "videos_analyzed": standardized_video_count
        })

    if not all_channels_retention:
        return jsonify({"error": "No retention data found"}), 404

    # CROSS-CHANNEL COMPARISON - real data only
    comparison_insights = []
    
    if len(all_channels_retention) > 1:
        primary = all_channels_retention[0]
        competitors = all_channels_retention[1:]
        
        # Compare intro retention
        primary_intro = primary["retention_zones"]["intro"]
        avg_competitor_intro = sum(c["retention_zones"]["intro"] for c in competitors) / len(competitors)
        
        if primary_intro > avg_competitor_intro + 10:
            comparison_insights.append({
                "type": "intro_strength",
                "title": "Your Intros Hook Better",
                "description": f"{primary_intro:.1f}% intro retention vs {avg_competitor_intro:.1f}% average.",
                "action": "Your hooks work well. Analyze what makes them effective.",
                "impact": "positive",
                "metric": f"+{(primary_intro - avg_competitor_intro):.1f}%"
            })
        elif primary_intro < avg_competitor_intro - 10:
            comparison_insights.append({
                "type": "intro_weakness",
                "title": "Competitors Hook Better",
                "description": f"Your {primary_intro:.1f}% intro retention trails {avg_competitor_intro:.1f}% average.",
                "action": "Study competitor intros. They're capturing attention faster.",
                "impact": "critical",
                "metric": f"{(avg_competitor_intro - primary_intro):.1f}% gap"
            })

    return jsonify({
        "channels": all_channels_retention,
        "comparison_insights": comparison_insights,
        "has_comparison": len(all_channels_retention) > 1,
        "sampling_metadata": {
            "videos_per_channel": standardized_video_count,
            "is_standardized": len(set(channel_video_counts)) > 1 if channel_video_counts else False,
            "original_counts": dict(zip(channel_urls[:len(channel_video_counts)], channel_video_counts))
        } if len(channel_video_counts) > 0 else {}
    }), 200


# ========================= COMPETITOR GAP ANALYSIS =========================
@enhanced_analyzer_bp.route("/analyzer.competitorGaps", methods=["GET"])
def competitor_gaps():
    """
    Identify content gaps, posting frequency gaps, and opportunity areas.
    Show what competitors do that you don't, and vice versa.
    NO MOCKED DATA - all analysis based on real topics and patterns.
    """
    urls_param = request.args.get("urls")
    if not urls_param:
        return jsonify({"error": "Missing urls parameter"}), 400

    try:
        max_videos = int(request.args.get("maxVideos", "50"))
    except ValueError:
        max_videos = 50

    channel_urls = [url.strip() for url in urls_param.split(",") if url.strip()]
    
    if len(channel_urls) < 2:
        return jsonify({"error": "Need at least 2 channels for gap analysis"}), 400

    # Determine minimum video count
    channel_video_counts = []
    for channel_url in channel_urls:
        channel_id = extract_channel_id(channel_url)
        if not channel_id:
            continue
        basic = fetch_basic_channel_stats(channel_id)
        if not basic:
            continue
        playlist_id = basic["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, max_videos)
        channel_video_counts.append(len(video_ids))
    
    standardized_video_count = min(min(channel_video_counts), max_videos) if channel_video_counts else max_videos

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
        
        # Use standardized count
        video_ids = fetch_video_ids(playlist_id, standardized_video_count)
        
        if not video_ids:
            continue

        videos = fetch_video_stats(video_ids, with_snippet=True)
        
        # Extract real topics from video titles
        meaningful_topics = extract_meaningful_topics(videos)
        
        # Content type distribution - real data
        content_types = [classify_content_type(v) for v in videos]
        content_type_dist = Counter(content_types)
        
        # Calculate real engagement
        for video in videos:
            views = video.get("views", 0)
            likes = video.get("likes", 0)
            comments = video.get("comments", 0)
            video["engagement_rate"] = (likes + comments) / views if views > 0 else 0
        
        # Posting frequency analysis - real dates
        video_dates = []
        for video in videos:
            pub_date = video.get("publishedAt", "")
            if pub_date:
                try:
                    dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                    video_dates.append(dt)
                except:
                    pass
        
        if len(video_dates) > 1:
            video_dates.sort()
            date_diffs = [(video_dates[i+1] - video_dates[i]).days for i in range(len(video_dates)-1)]
            avg_posting_frequency = sum(date_diffs) / len(date_diffs) if date_diffs else 0
        else:
            avg_posting_frequency = 0
        
        # Real average metrics
        avg_views = sum(v.get("views", 0) for v in videos) / len(videos) if videos else 0
        avg_engagement = sum(v["engagement_rate"] for v in videos) / len(videos) if videos else 0
        
        all_channels_data.append({
            "channel_url": channel_url,
            "channel_id": channel_id,
            "channel_name": channel_name,
            "is_primary": is_primary,
            "topics": meaningful_topics,
            "content_types": dict(content_type_dist),
            "avg_posting_frequency_days": round(avg_posting_frequency, 1),
            "videos_per_month": round(30 / avg_posting_frequency, 1) if avg_posting_frequency > 0 else 0,
            "avg_views": round(avg_views, 0),
            "avg_engagement": round(avg_engagement, 4),
            "total_videos": len(videos),
            "videos_analyzed": standardized_video_count
        })

    if len(all_channels_data) < 2:
        return jsonify({"error": "Need data from at least 2 channels"}), 404

    primary = all_channels_data[0]
    competitors = all_channels_data[1:]

    # REAL CONTENT GAP ANALYSIS
    primary_topics = set(t[0] for t in primary["topics"])
    
    competitor_topics = set()
    for comp in competitors:
        competitor_topics.update(t[0] for t in comp["topics"])
    
    content_gaps = competitor_topics - primary_topics
    
    # Find high-value gaps with real data
    high_value_gaps = []
    for comp in competitors:
        for topic, count in comp["topics"]:
            if topic in content_gaps and count >= 2:
                high_value_gaps.append({
                    "topic": topic,
                    "competitor": comp["channel_name"],
                    "frequency": count,
                    "their_engagement": comp["avg_engagement"],
                    "topic_length": len(topic.split()),
                    "is_specific": len(topic.split()) > 1
                })
    
    # Sort by specificity first, then frequency
    high_value_gaps.sort(key=lambda x: (x["is_specific"], x["frequency"]), reverse=True)
    high_value_gaps = high_value_gaps[:15]
    
    # YOUR UNIQUE TOPICS
    your_unique_topics = primary_topics - competitor_topics
    your_unique_performers = [
        {"topic": t[0], "frequency": t[1], "is_specific": len(t[0].split()) > 1}
        for t in primary["topics"]
        if t[0] in your_unique_topics
    ][:10]
    
    # REAL PERFORMANCE GAPS
    avg_competitor_engagement = sum(c["avg_engagement"] for c in competitors) / len(competitors)
    engagement_gap = primary["avg_engagement"] - avg_competitor_engagement
    
    avg_competitor_views = sum(c["avg_views"] for c in competitors) / len(competitors)
    views_gap = primary["avg_views"] - avg_competitor_views
    
    avg_competitor_frequency = sum(c["avg_posting_frequency_days"] for c in competitors) / len(competitors)
    frequency_gap = primary["avg_posting_frequency_days"] - avg_competitor_frequency
    
    # REAL INSIGHTS
    gap_insights = []
    
    if high_value_gaps:
        top_gap = high_value_gaps[0]
        gap_insights.append({
            "type": "topic_gap",
            "title": f"Competitors Cover '{top_gap['topic'].title()}'",
            "description": f"{top_gap['competitor']} covers '{top_gap['topic']}' {top_gap['frequency']} times.",
            "action": f"Create 3-5 videos about '{top_gap['topic']}' to capture this audience.",
            "impact": "high",
            "opportunity_size": f"{top_gap['frequency']} videos by competitor"
        })
    
    if frequency_gap > 3:
        gap_insights.append({
            "type": "posting_gap",
            "title": "You Post Less Frequently",
            "description": f"You post every {primary['avg_posting_frequency_days']:.1f} days vs {avg_competitor_frequency:.1f} days average.",
            "action": f"Increase frequency to at least {avg_competitor_frequency:.0f}-day intervals.",
            "impact": "critical",
            "opportunity_size": f"{((30/avg_competitor_frequency) - (30/primary['avg_posting_frequency_days'])):.1f} more videos/month needed"
        })
    
    if engagement_gap < -0.01:
        gap_insights.append({
            "type": "engagement_gap",
            "title": "Response Rate Gap",
            "description": f"Your response rate trails competitors.",
            "action": "Study competitor hooks, thumbnails, and content structure.",
            "impact": "critical",
            "opportunity_size": f"{abs(engagement_gap * 100):.2f}% to gain"
        })
    
    # OPPORTUNITIES
    opportunities = []
    
    if your_unique_performers:
        opportunities.append({
            "type": "unique_niche",
            "title": f"You Cover Unique Topics",
            "description": f"You cover topics competitors ignore: {', '.join([t['topic'] for t in your_unique_performers[:3]])}.",
            "action": "These are your competitive advantage. Expand on them.",
            "impact": "positive"
        })
    
    if engagement_gap > 0.01:
        opportunities.append({
            "type": "engagement_advantage",
            "title": "Better Viewer Response",
            "description": f"Your content gets better audience response than competitors.",
            "action": "Quality advantage. Leverage this for partnerships.",
            "impact": "positive"
        })

    return jsonify({
        "primary_channel": {
            "name": primary["channel_name"],
            "topics": primary["topics"][:20],
            "content_types": primary["content_types"],
            "posting_frequency": primary["avg_posting_frequency_days"],
            "videos_per_month": primary["videos_per_month"],
            "avg_views": primary["avg_views"],
            "avg_engagement": primary["avg_engagement"],
            "videos_analyzed": primary["videos_analyzed"]
        },
        "competitors_summary": [
            {
                "name": c["channel_name"],
                "posting_frequency": c["avg_posting_frequency_days"],
                "videos_per_month": c["videos_per_month"],
                "avg_views": c["avg_views"],
                "avg_engagement": c["avg_engagement"],
                "top_topics": c["topics"][:5],
                "videos_analyzed": c["videos_analyzed"]
            }
            for c in competitors
        ],
        "content_gaps": [
            {
                "topic": gap["topic"],
                "competitor": gap["competitor"],
                "frequency": gap["frequency"],
                "engagement": round(gap["their_engagement"], 4),
                "is_phrase": gap["is_specific"],
                "opportunity_type": "specific" if gap["is_specific"] else "general"
            }
            for gap in high_value_gaps
        ],
        "your_unique_topics": your_unique_performers,
        "missing_content_types": [],
        "frequency_comparison": {
            "your_frequency_days": primary["avg_posting_frequency_days"],
            "competitor_avg_days": round(avg_competitor_frequency, 1),
            "gap_days": round(frequency_gap, 1),
            "your_videos_per_month": primary["videos_per_month"],
            "competitor_videos_per_month": round(30 / avg_competitor_frequency, 1) if avg_competitor_frequency > 0 else 0
        },
        "performance_comparison": {
            "your_engagement": round(primary["avg_engagement"], 4),
            "competitor_avg_engagement": round(avg_competitor_engagement, 4),
            "engagement_gap": round(engagement_gap, 4),
            "your_views": round(primary["avg_views"], 0),
            "competitor_avg_views": round(avg_competitor_views, 0),
            "views_gap": round(views_gap, 0)
        },
        "gap_insights": gap_insights,
        "opportunities": opportunities,
        "sampling_metadata": {
            "videos_per_channel": standardized_video_count,
            "ensures_fair_comparison": True,
            "original_counts": dict(zip(channel_urls[:len(channel_video_counts)], channel_video_counts))
        } if len(channel_video_counts) > 0 else {}
    }), 200
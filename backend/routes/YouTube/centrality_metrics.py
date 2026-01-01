from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_basic_channel_stats,
    fetch_video_ids,
    fetch_video_stats
)
import pandas as pd
from collections import defaultdict
import re

centrality_bp = Blueprint("video_centrality", __name__, url_prefix="/api/youtube")


def calculate_performance_score(video):
    """
    Calculate a 0-100 performance score for a video based on multiple factors.
    """
    views = float(video.get('views', 0))
    likes = float(video.get('likes', 0))
    comments = float(video.get('comments', 0))
    
    if views == 0:
        return 0
    
    # Engagement rate (40% weight)
    engagement_rate = (likes + comments) / views
    engagement_score = min(engagement_rate * 1000, 40)  # Cap at 40
    
    # View count relative score (30% weight) - logarithmic scale
    view_score = min((views / 10000) * 30, 30) if views > 0 else 0
    
    # Like ratio (20% weight)
    like_ratio = likes / views if views > 0 else 0
    like_score = min(like_ratio * 200, 20)  # Cap at 20
    
    # Comment rate (10% weight)
    comment_rate = comments / views if views > 0 else 0
    comment_score = min(comment_rate * 100, 10)  # Cap at 10
    
    total_score = engagement_score + view_score + like_score + comment_score
    return round(min(total_score, 100), 1)


def categorize_videos(videos):
    """
    Categorize videos into Winners, Hidden Gems, and Needs Work.
    """
    if not videos:
        return {'winners': [], 'hidden_gems': [], 'needs_work': []}
    
    # Calculate scores for all videos
    for video in videos:
        video['performance_score'] = calculate_performance_score(video)
    
    # Sort by performance score
    sorted_videos = sorted(videos, key=lambda x: x['performance_score'], reverse=True)
    
    # Calculate percentiles
    total = len(sorted_videos)
    
    winners = []
    hidden_gems = []
    needs_work = []
    
    for idx, video in enumerate(sorted_videos):
        percentile = (idx / total) * 100
        views = float(video.get('views', 0))
        score = video['performance_score']
        
        # Winners: Top 30% OR high score
        if percentile < 30 or score >= 70:
            winners.append(video)
        # Hidden Gems: Good engagement but low views
        elif score >= 50 and views < (sum(v.get('views', 0) for v in videos) / len(videos)):
            hidden_gems.append(video)
        # Needs Work: Bottom 30%
        elif percentile >= 70 or score < 40:
            needs_work.append(video)
        else:
            # Middle ground - could go either way
            if len(hidden_gems) < len(winners) // 2:
                hidden_gems.append(video)
            else:
                needs_work.append(video)
    
    return {
        'winners': winners[:10],  # Top 10 winners
        'hidden_gems': hidden_gems[:5],  # Top 5 hidden gems
        'needs_work': needs_work[:10]  # Bottom 10 needing work
    }


def identify_improvement_opportunities(video):
    """
    Identify specific areas where a video can be improved.
    """
    views = float(video.get('views', 0))
    likes = float(video.get('likes', 0))
    comments = float(video.get('comments', 0))
    
    opportunities = []
    
    if views == 0:
        return [{
            'issue': 'No views yet',
            'action': 'Promote this video on social media and in your community',
            'priority': 'high'
        }]
    
    # Check engagement rate
    engagement_rate = (likes + comments) / views if views > 0 else 0
    if engagement_rate < 0.02:
        opportunities.append({
            'issue': 'Low engagement rate',
            'action': 'Add a clear call-to-action asking viewers to like and comment',
            'priority': 'high'
        })
    
    # Check like ratio
    like_ratio = likes / views if views > 0 else 0
    if like_ratio < 0.015:
        opportunities.append({
            'issue': 'Low like ratio',
            'action': 'Improve content quality or add more value to encourage likes',
            'priority': 'medium'
        })
    
    # Check comment activity
    comment_rate = comments / views if views > 0 else 0
    if comment_rate < 0.005:
        opportunities.append({
            'issue': 'Not enough comments',
            'action': 'Ask a question in the video to encourage viewers to comment',
            'priority': 'medium'
        })
    
    # Check if view count is low
    if views < 1000:
        opportunities.append({
            'issue': 'Low view count',
            'action': 'Improve thumbnail and title for better click-through rate',
            'priority': 'high'
        })
    
    if not opportunities:
        opportunities.append({
            'issue': 'Video is performing well',
            'action': 'Use this as a template for future content',
            'priority': 'low'
        })
    
    return opportunities


def generate_quick_wins(categorized_videos):
    """
    Generate actionable quick wins based on video analysis.
    """
    quick_wins = []
    
    needs_work = categorized_videos['needs_work']
    hidden_gems = categorized_videos['hidden_gems']
    
    # Low-hanging fruit: Videos with potential
    low_engagement_videos = [v for v in needs_work if float(v.get('views', 0)) > 1000]
    if low_engagement_videos:
        quick_wins.append({
            'title': 'Boost engagement on existing traffic',
            'description': f'{len(low_engagement_videos)} videos are getting views but low engagement',
            'action': 'Add calls-to-action and engaging questions to these videos',
            'impact': 'high',
            'effort': 'low',
            'video_count': len(low_engagement_videos)
        })
    
    # Hidden gems that need promotion
    if hidden_gems:
        quick_wins.append({
            'title': 'Promote your hidden gems',
            'description': f'{len(hidden_gems)} videos have great engagement but low visibility',
            'action': 'Share these videos on social media and link to them from popular videos',
            'impact': 'high',
            'effort': 'low',
            'video_count': len(hidden_gems)
        })
    
    # Thumbnail/title opportunities
    poor_ctr_videos = [v for v in needs_work if float(v.get('views', 0)) < 500][:5]
    if poor_ctr_videos:
        quick_wins.append({
            'title': 'Improve thumbnails and titles',
            'description': f'{len(poor_ctr_videos)} videos likely have poor click-through rates',
            'action': 'Update thumbnails with bright colors and clear text',
            'impact': 'medium',
            'effort': 'medium',
            'video_count': len(poor_ctr_videos)
        })
    
    # Content duplication opportunity
    winners = categorized_videos['winners']
    if len(winners) >= 3:
        quick_wins.append({
            'title': 'Double down on what works',
            'description': f'Your top {min(len(winners), 5)} videos show a clear winning formula',
            'action': 'Create more content similar to your best performers',
            'impact': 'high',
            'effort': 'high',
            'video_count': min(len(winners), 5)
        })
    
    return quick_wins


def calculate_channel_health(videos):
    """
    Calculate overall channel health metrics.
    """
    if not videos:
        return {
            'overall_score': 0,
            'health_label': 'Unknown',
            'consistency': 0,
            'engagement_trend': 'neutral'
        }
    
    # Calculate average performance score
    avg_score = sum(v.get('performance_score', 0) for v in videos) / len(videos)
    
    # Calculate consistency (standard deviation of scores)
    scores = [v.get('performance_score', 0) for v in videos]
    mean_score = sum(scores) / len(scores)
    variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
    std_dev = variance ** 0.5
    consistency = max(0, 100 - std_dev)  # Lower std dev = higher consistency
    
    # Determine health label
    if avg_score >= 70:
        health_label = 'Excellent'
    elif avg_score >= 50:
        health_label = 'Good'
    elif avg_score >= 30:
        health_label = 'Fair'
    else:
        health_label = 'Needs Improvement'
    
    return {
        'overall_score': round(avg_score, 1),
        'health_label': health_label,
        'consistency': round(consistency, 1),
        'engagement_trend': 'improving' if avg_score > 50 else 'declining'
    }


@centrality_bp.route("/videos.centralityMetrics", methods=["GET"])
def centrality_metrics():
    url_or_id = request.args.get("url")
    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    try:
        # Fetch videos
        basic = fetch_basic_channel_stats(channel_id)
        playlist_id = basic["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, 50)
        videos = fetch_video_stats(video_ids, with_snippet=True)

        if len(videos) < 2:
            return jsonify({
                "categorized_videos": {
                    'winners': [],
                    'hidden_gems': [],
                    'needs_work': []
                },
                "quick_wins": [{
                    'title': 'Keep creating content',
                    'description': 'You need more videos to analyze performance patterns',
                    'action': 'Upload at least 5-10 videos to get meaningful insights',
                    'impact': 'high',
                    'effort': 'high',
                    'video_count': 0
                }],
                "channel_health": {
                    'overall_score': 0,
                    'health_label': 'Getting Started',
                    'consistency': 0,
                    'engagement_trend': 'neutral'
                },
                "summary": {
                    "total_videos": len(videos),
                    "analyzed_videos": 0
                }
            })

        # Categorize videos
        categorized = categorize_videos(videos)
        
        # Add improvement opportunities for needs_work videos
        for video in categorized['needs_work']:
            video['improvements'] = identify_improvement_opportunities(video)
        
        # Generate quick wins
        quick_wins = generate_quick_wins(categorized)
        
        # Calculate channel health
        channel_health = calculate_channel_health(videos)
        
        return jsonify({
            "categorized_videos": categorized,
            "quick_wins": quick_wins,
            "channel_health": channel_health,
            "summary": {
                "total_videos": len(videos),
                "analyzed_videos": len(videos),
                "winners_count": len(categorized['winners']),
                "hidden_gems_count": len(categorized['hidden_gems']),
                "needs_work_count": len(categorized['needs_work'])
            }
        })

    except Exception as e:
        import traceback
        print("Error in centrality_metrics:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
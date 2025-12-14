from flask import Blueprint, request, jsonify
from .youtube_utils import extract_channel_id, fetch_video_ids, fetch_video_comments, fetch_basic_channel_stats, fetch_video_title
from textblob import TextBlob
import pandas as pd

sentiment_bp = Blueprint("video_sentiment", __name__, url_prefix="/api/youtube")

@sentiment_bp.route("/videos.sentimentAnalysis", methods=["GET"])
def sentiment_analysis():
    """
    Analyze sentiment of comments for a channel's videos
    """
    url_or_id = request.args.get("url")
    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    try:
        max_videos = int(request.args.get("maxVideos", 20))
    except ValueError:
        max_videos = 20

    try:
        # Step 1: Fetch videos
        playlist_id = fetch_basic_channel_stats(channel_id)["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, max_videos)

        if not video_ids:
            return jsonify({"error": "No videos found"}), 200

        # Step 2: Fetch comments
        all_comments = []
        for vid in video_ids:
            comments = fetch_video_comments(vid, max_comments=50)  # fetch latest 50 comments per video
            title = fetch_video_title(vid) or vid
            all_comments.extend([{"videoId": vid, "videoTitle": title, "text": c} for c in comments])
            
        if not all_comments:
            return jsonify({"error": "No comments found"}), 200

        # Step 3: Sentiment analysis
        for c in all_comments:
            blob = TextBlob(c["text"])
            polarity = blob.sentiment.polarity
            c["sentiment"] = "positive" if polarity > 0 else "negative" if polarity < 0 else "neutral"
            c["polarity_score"] = round(polarity, 3)

        df = pd.DataFrame(all_comments)

        sentiment_summary = df.groupby("sentiment").size().to_dict()
        sentiment_summary["totalComments"] = len(df)

        return jsonify({
            "summary": sentiment_summary,
            "comments": all_comments[:100]  # limit first 100 for frontend
        }), 200

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

from flask import Blueprint, request, jsonify
from .youtube_utils import (
    extract_channel_id,
    fetch_video_ids,
    fetch_video_comments,
    fetch_basic_channel_stats,
    fetch_video_title,
    fetch_video_stats,
)
from textblob import TextBlob
import pandas as pd
import traceback

sentiment_bp = Blueprint("video_sentiment", __name__, url_prefix="/api/youtube")


@sentiment_bp.route("/videos.sentimentAnalysis", methods=["GET"])
def sentiment_analysis():
    """
    Analyze sentiment of comments for a channel's videos
    Includes comment upload date and MONTH-based sentiment timeline.
    """
    url_or_id = request.args.get("url")
    video_ids_param = request.args.get("videoIds", "")

    if not url_or_id and not video_ids_param:
        return jsonify({"error": "Missing url or videoIds"}), 400

    channel_id = extract_channel_id(url_or_id) if url_or_id else None
    if url_or_id and not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    try:
        max_videos = int(request.args.get("maxVideos", 20))
    except ValueError:
        max_videos = 20

    try:
        # --------------------------------------------------
        # 1. Determine video IDs
        # --------------------------------------------------
        if video_ids_param:
            video_ids = [vid.strip() for vid in video_ids_param.split(",") if vid.strip()]
        else:
            playlist_id = fetch_basic_channel_stats(channel_id)["uploadsPlaylistId"]
            video_ids = fetch_video_ids(playlist_id, max_videos)

        if not video_ids:
            return jsonify({"error": "No videos found"}), 200

        # --------------------------------------------------
        # 2. Fetch comments (WITH publishedAt)
        # --------------------------------------------------
        all_comments = []

        for vid in video_ids:
            comments = fetch_video_comments(vid, max_comments=300)
            title = fetch_video_title(vid) or vid

            for c in comments:
                all_comments.append({
                    "videoId": vid,
                    "videoTitle": title,
                    "text": c["text"],
                    "publishedAt": c["publishedAt"]
                })

        if not all_comments:
            return jsonify({"error": "No comments found"}), 200

        # --------------------------------------------------
        # 3. Sentiment analysis
        # --------------------------------------------------
        for c in all_comments:
            blob = TextBlob(c["text"])
            polarity = blob.sentiment.polarity
            c["sentiment"] = (
                "positive" if polarity > 0 else
                "negative" if polarity < 0 else
                "neutral"
            )
            c["polarity_score"] = round(polarity, 3)

        # --------------------------------------------------
        # 4. DataFrame + MONTH processing
        # --------------------------------------------------
        df = pd.DataFrame(all_comments)

        df["publishedAt"] = pd.to_datetime(df["publishedAt"], errors="coerce")
        df = df.dropna(subset=["publishedAt"])

        # 👉 YEAR-MONTH key (e.g. 2025-01)
        df["month"] = df["publishedAt"].dt.to_period("M").astype(str)

        # --------------------------------------------------
        # 5. Summary counts
        # --------------------------------------------------
        sentiment_summary = df.groupby("sentiment").size().to_dict()
        sentiment_summary["totalComments"] = len(df)

        # --------------------------------------------------
        # 6. Sentiment timeline (BY MONTH)
        # --------------------------------------------------
        sentiment_by_month = (
            df.groupby(["month", "sentiment"])
              .size()
              .unstack(fill_value=0)
              .reset_index()
              .sort_values("month")
              .to_dict(orient="records")
        )

        # --------------------------------------------------
        # 7. Response
        # --------------------------------------------------
        return jsonify({
            "summary": sentiment_summary,
            "comments": all_comments[:100],
            "sentimentByMonth": sentiment_by_month
        }), 200

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@sentiment_bp.route("/videos.sentimentVideos", methods=["GET"])
def sentiment_video_titles():
    """
    Return a lightweight list of video IDs and titles for sentiment selection
    """
    url_or_id = request.args.get("url")
    if not url_or_id:
        return jsonify({"error": "Missing url"}), 400

    channel_id = extract_channel_id(url_or_id)
    if not channel_id:
        return jsonify({"error": "Invalid channel URL or ID"}), 400

    try:
        try:
            max_videos = int(request.args.get("maxVideos", 100))
        except ValueError:
            max_videos = 50

        playlist_id = fetch_basic_channel_stats(channel_id)["uploadsPlaylistId"]
        video_ids = fetch_video_ids(playlist_id, max_videos)

        if not video_ids:
            return jsonify({"videos": []}), 200

        videos = fetch_video_stats(video_ids, with_snippet=True)

        simplified = [
            {
                "id": v["id"],
                "title": v.get("title") or v["id"]
            }
            for v in videos
        ]

        return jsonify({"videos": simplified}), 200

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

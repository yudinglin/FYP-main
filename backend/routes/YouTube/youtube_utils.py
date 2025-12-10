# backend/routes/YouTube/youtube_utils.py

import os
import requests
from urllib.parse import urlparse

API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


# All controllers should access the YouTube API through this function.
def youtube_get(endpoint: str, params: dict, timeout: int = 10):
    params = dict(params)  # Make a copy to prevent the dictionary from being modified when it is sent in from outside
    params["key"] = API_KEY
    url = f"{YOUTUBE_API_BASE}/{endpoint}"

    resp = requests.get(url, params=params, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


# got channelId (- Directly upload channelId (starting with UC)  / Upload YouTube Channel URL)
def extract_channel_id(url_or_id: str):
    if not url_or_id:
        return None

    url_or_id = url_or_id.strip()

    # if is channelId start with UC
    if url_or_id.startswith("UC"):
        return url_or_id

    # if channelID is URL
    try:
        parsed = urlparse(url_or_id)
        parts = parsed.path.strip("/").split("/")
        if "channel" in parts:
            idx = parts.index("channel")
            return parts[idx + 1]
    except Exception:
        pass

    return None


#  channel basic information（subscriberCount / viewCount / uploadsPlaylistId）

def fetch_basic_channel_stats(channel_id: str):
    params = {
        "part": "statistics,contentDetails",
        "id": channel_id,
        "maxResults": 1,
    }

    data = youtube_get("channels", params)
    items = data.get("items", [])
    if not items:
        return None

    item = items[0]
    stats = item["statistics"]
    uploads_playlist = item["contentDetails"]["relatedPlaylists"]["uploads"]

    return {
        "subscriberCount": int(stats.get("subscriberCount", 0)),
        "viewCount": int(stats.get("viewCount", 0)),
        "uploadsPlaylistId": uploads_playlist,
    }


# tablee video ID from uploads playlist

def fetch_video_ids(playlist_id: str, max_videos: int = 50):
    params = {
        "part": "contentDetails",
        "playlistId": playlist_id,
        "maxResults": max_videos,
    }

    pl_data = youtube_get("playlistItems", params)
    return [
        item["contentDetails"]["videoId"]
        for item in pl_data.get("items", [])
    ]


# Retrieve statistical information based on videoIds (shared with videos.list and similarity analysis)

def fetch_video_stats(video_ids, with_snippet: bool = False):
    if not video_ids:
        return []

    # YouTube allows a maximum of 50 IDs at a time, so here's a simple breakdown.
    all_videos = []
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i: i + 50]
        part = "statistics,snippet" if with_snippet else "statistics"

        params = {
            "part": part,
            "id": ",".join(batch),
            "maxResults": 50,
        }

        data = youtube_get("videos", params)

        for item in data.get("items", []):
            st = item.get("statistics", {})
            sn = item.get("snippet", {}) if with_snippet else {}

            def safe_int(x):
                try:
                    return int(x)
                except Exception:
                    return 0

            video = {
                "id": item["id"],
                "views": safe_int(st.get("viewCount")),
                "likes": safe_int(st.get("likeCount")),
                "comments": safe_int(st.get("commentCount")),
            }

            if with_snippet:
                video["title"] = sn.get("title", "")
                video["publishedAt"] = sn.get("publishedAt", "")

            all_videos.append(video)

    return all_videos


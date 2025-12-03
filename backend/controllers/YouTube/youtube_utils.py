# backend/Controller/YouTube/youtube_utils.py

import os
import requests
# Python has a built-in module specifically for handling URLs.
# What urlparse does: Breaks down a URL into: Protocol (http/https)，Domain (netloc)，Path (path)，Query parameters, etc.
from urllib.parse import urlparse

API_KEY = os.getenv("YOUTUBE_API_KEY")


def extract_channel_id(url_or_id: str):
    if not url_or_id:
        return None

# String methods to remove leading and trailing whitespace characters（ can remove)
    url_or_id = url_or_id.strip()

# .startswith("UC"): Checks if a string starts with "UC".
    if url_or_id.startswith("UC"):
        return url_or_id

    try:
        parsed = urlparse(url_or_id)
# Converting the URL path into a list of strings makes it easier for us to find the channel location.
        parts = parsed.path.strip("/").split("/")
        if "channel" in parts:
            idx = parts.index("channel")
            return parts[idx + 1]
    except:
        pass

    return None


def fetch_basic_channel_stats(channel_id: str):
    yt_url = "https://www.googleapis.com/youtube/v3/channels"
    params = {
        "part": "statistics,contentDetails",
        "id": channel_id,
        "key": API_KEY,
    }

# access yourube api
    resp = requests.get(yt_url, params=params, timeout=10)
    resp.raise_for_status()

# Parse the returned JSON data
    data = resp.json()
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


def fetch_video_ids(playlist_id: str, max_videos: int = 50):
    url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "part": "contentDetails",
        "playlistId": playlist_id,
        "maxResults": max_videos,
        "key": API_KEY,
    }

    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()

    pl_data = resp.json()
    return [
        item["contentDetails"]["videoId"]
        for item in pl_data.get("items", [])
    ]

# backend/utils/youtube_utils.py

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


#  channel basic information（subscriberCount / viewCount / uploadsPlaylistId / channelName）

def fetch_basic_channel_stats(channel_id: str):
    params = {
        "part": "statistics,contentDetails,snippet",
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
    snippet = item.get("snippet", {})

    return {
        "subscriberCount": int(stats.get("subscriberCount", 0)),
        "viewCount": int(stats.get("viewCount", 0)),
        "uploadsPlaylistId": uploads_playlist,
        "channelName": snippet.get("title", ""),
    }


# tablee video ID from uploads playlist

def fetch_video_ids(playlist_id: str, max_videos: int = 50):
    """Fetch up to max_videos videoIds from a channel uploads playlist.

    NOTE: YouTube Data API playlistItems maxResults is 50, so we must paginate.
    """
    if not playlist_id:
        return []

    try:
        max_videos = int(max_videos)
    except Exception:
        max_videos = 50

    if max_videos <= 0:
        return []

    video_ids = []
    page_token = None

    while len(video_ids) < max_videos:
        remaining = max_videos - len(video_ids)
        params = {
            "part": "contentDetails",
            "playlistId": playlist_id,
            "maxResults": min(50, remaining),
        }
        if page_token:
            params["pageToken"] = page_token

        pl_data = youtube_get("playlistItems", params)

        for item in pl_data.get("items", []):
            vid = item.get("contentDetails", {}).get("videoId")
            if vid:
                video_ids.append(vid)
            if len(video_ids) >= max_videos:
                break

        page_token = pl_data.get("nextPageToken")
        if not page_token:
            break

    return video_ids


# Retrieve statistical information based on videoIds (shared with videos.list and similarity analysis)
# UPDATED: Now includes thumbnail support

def fetch_video_stats(video_ids, with_snippet: bool = True, with_duration: bool = False):
    if not video_ids:
        return []

    # YouTube allows a maximum of 50 IDs at a time, so here's a simple breakdown.
    all_videos = []
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i: i + 50]
        
        # Build parts list based on what's needed
        parts = ["statistics"]
        if with_snippet:
            parts.append("snippet")
        if with_duration:
            parts.append("contentDetails")
        
        part = ",".join(parts)

        params = {
            "part": part,
            "id": ",".join(batch),
            "maxResults": 50,
        }

        data = youtube_get("videos", params)

        for item in data.get("items", []):
            st = item.get("statistics", {})
            sn = item.get("snippet", {}) if with_snippet else {}
            cd = item.get("contentDetails", {}) if with_duration else {}

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
                
                # Add thumbnail support
                thumbnails = sn.get("thumbnails", {})
                thumbnail_url = ""
                if "medium" in thumbnails:
                    thumbnail_url = thumbnails["medium"]["url"]
                elif "default" in thumbnails:
                    thumbnail_url = thumbnails["default"]["url"]
                elif "high" in thumbnails:
                    thumbnail_url = thumbnails["high"]["url"]
                
                video["thumbnail"] = thumbnail_url
            
            if with_duration:
                # Parse ISO 8601 duration (e.g., "PT15M33S" = 15 minutes 33 seconds)
                duration_str = cd.get("duration", "PT0S")
                video["duration"] = parse_iso8601_duration(duration_str)

            all_videos.append(video)

    return all_videos


def parse_iso8601_duration(duration_str):
    """
    Parse ISO 8601 duration format (PT#H#M#S) to seconds.
    Examples: PT15M33S = 933 seconds, PT1H2M10S = 3730 seconds
    """
    import re
    
    if not duration_str or duration_str == "PT0S":
        return 0
    
    # Match hours, minutes, seconds
    pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
    match = re.match(pattern, duration_str)
    
    if not match:
        return 0
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    return hours * 3600 + minutes * 60 + seconds

# Retrieve top-level comments for a given video
def fetch_video_comments(video_id: str, max_comments: int = 50):
    """
    Fetch top-level comments from a video.
    Returns a list of dicts with text + publishedAt.
    """
    comments = []
    try:
        params = {
            "part": "snippet",
            "videoId": video_id,
            "maxResults": min(max_comments, 100),
            "textFormat": "plainText",
        }

        data = youtube_get("commentThreads", params)

        for item in data.get("items", []):
            snippet = (
                item.get("snippet", {})
                    .get("topLevelComment", {})
                    .get("snippet", {})
            )

            text = snippet.get("textDisplay")
            published_at = snippet.get("publishedAt")

            if text and published_at:
                comments.append({
                    "text": text,
                    "publishedAt": published_at
                })

    except Exception as e:
        print(f"Error fetching comments for video {video_id}: {e}")

    return comments


def fetch_video_title(video_id: str):
    """
    Fetch the title of a single video by ID.
    """
    try:
        params = {
            "part": "snippet",
            "id": video_id,
            "maxResults": 1
        }
        data = youtube_get("videos", params)
        items = data.get("items", [])
        if not items:
            return None
        snippet = items[0].get("snippet", {})
        return snippet.get("title", None)
    except Exception as e:
        print(f"Error fetching title for video {video_id}: {e}")
        return None

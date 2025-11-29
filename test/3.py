import requests

API_KEY = "AIzaSyCZDWbaXjBZxBAHZBkFAyczbUeJstrdvHU"
playlist_id = "PLBCF2DAC6FFB574DE"  # 示例播放列表
url = "https://www.googleapis.com/youtube/v3/playlistItems"

params = {
    "part": "snippet",
    "playlistId": playlist_id,
    "maxResults": 5,
    "key": API_KEY
}

response = requests.get(url, params=params)
data = response.json()

for item in data["items"]:
    snippet = item["snippet"]
    print("Video title:", snippet["title"])
    print("Published:", snippet["publishedAt"])
    print("Link:", f"https://www.youtube.com/watch?v={snippet['resourceId']['videoId']}")
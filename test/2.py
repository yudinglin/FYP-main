import requests

API_KEY = "AIzaSyCZDWbaXjBZxBAHZBkFAyczbUeJstrdvHU"
video_id = "dQw4w9WgXcQ"
url = "https://www.googleapis.com/youtube/v3/commentThreads"

params = {
    "part": "snippet",
    "videoId": video_id,
    "maxResults": 5,
    "key": API_KEY
}

response = requests.get(url, params=params)
data = response.json()

for item in data["items"]:
    comment = item["snippet"]["topLevelComment"]["snippet"]
    print("Author:", comment["authorDisplayName"])
    print("Comment:", comment["textDisplay"])
    print("Likes:", comment["likeCount"])
    print("-" * 50)

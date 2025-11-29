import requests

API_KEY = "AIzaSyCZDWbaXjBZxBAHZBkFAyczbUeJstrdvHU"

# search url(v3 youtube and parameter)
url = "https://www.googleapis.com/youtube/v3/search"
params = {
    "part": "snippet",
    "q": "mrbeast",  
    "type": "video",
    "maxResults": 5,          
    "key": API_KEY
}

response = requests.get(url, params=params)
data = response.json()

for item in data["items"]:
    print("Topic:", item["snippet"]["title"])
    print("Channel:", item["snippet"]["channelTitle"])
    print("time:", item["snippet"]["publishedAt"])
    print("link:", f"https://www.youtube.com/watch?v={item['id']['videoId']}")
    print("-" * 50)

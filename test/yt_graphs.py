# yt_graphs.py
import json, time, requests, math
import pandas as pd
import numpy as np
import networkx as nx

# ====== parameter ======
API_KEY    = "AIzaSyCZDWbaXjBZxBAHZBkFAyczbUeJstrdvHU"
CHANNEL_ID = "UCX6OQ3DkcsbYNE6H8uQQuVA"
MAX_VIDEOS_FOR_COMMENTS = 12   
CORR_THRESHOLD = 0.7           
# ===================

BASE = "https://www.googleapis.com/youtube/v3"

def yt_get(endpoint, params, sleep=0.0):
    url = f"{BASE}/{endpoint}"
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    if sleep: time.sleep(sleep)
    return r.json()

def get_uploads_playlist_id(channel_id):
    data = yt_get("channels", {
        "part": "contentDetails",
        "id": channel_id,
        "key": API_KEY
    })
    items = data.get("items", [])
    if not items:
        raise RuntimeError("channel not found")
    return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

def get_all_video_ids(uploads_playlist_id):
    ids, page = [], None
    while True:
        data = yt_get("playlistItems", {
            "part": "contentDetails",
            "playlistId": uploads_playlist_id,
            "maxResults": 50,
            "pageToken": page or "",
            "key": API_KEY
        })
        for it in data.get("items", []):
            ids.append(it["contentDetails"]["videoId"])
        page = data.get("nextPageToken")
        if not page: break
    return ids

def chunks(lst, n=50):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]

def get_videos_stats(video_ids):
    rows = []
    for chunk in chunks(video_ids, 50):
        data = yt_get("videos", {
            "part": "snippet,statistics",
            "id": ",".join(chunk),
            "key": API_KEY
        }, sleep=0.05)
        for it in data.get("items", []):
            sn, st = it.get("snippet", {}), it.get("statistics", {})
            rows.append({
                "videoId": it["id"],
                "title": sn.get("title"),
                "publishedAt": sn.get("publishedAt"),
                "views": int(st.get("viewCount", 0)),
                "likes": int(st.get("likeCount", 0)) if "likeCount" in st else 0,
                "comments": int(st.get("commentCount", 0)) if "commentCount" in st else 0
            })
    df = pd.DataFrame(rows)
    # 避免全0造成NaN
    return df.fillna(0)

def get_video_commenters(video_id, max_pages=5):
    commenters, page, p = [], None, 0
    while True:
        data = yt_get("commentThreads", {
            "part": "snippet",
            "videoId": video_id,
            "textFormat": "plainText",
            "maxResults": 100,
            "pageToken": page or "",
            "key": API_KEY
        }, sleep=0.05)
        for it in data.get("items", []):
            top = it["snippet"]["topLevelComment"]["snippet"]
            ch  = top.get("authorChannelId", {})
            cid = ch.get("value")
            if cid: commenters.append(cid)
        page = data.get("nextPageToken")
        p += 1
        if (not page) or p >= max_pages: break
    return commenters

# ============ 图 A：视频表现相关网络 ============
def build_video_corr_graph(df, corr_threshold=0.7):
    feats = df[["views", "likes", "comments"]].astype(float)
    # 标准化（减均值/除以标准差）
    feats = (feats - feats.mean()) / (feats.std(ddof=0) + 1e-9)
    # 计算“按行”的两两相关：换成转置后列相关
    mat = pd.DataFrame(feats.values.T).corr(method="pearson").values

    G = nx.Graph()
    for i, r in df.iterrows():
        G.add_node(r["videoId"], title=r["title"], views=int(r["views"]))
    n = len(df)
    for i in range(n):
        for j in range(i+1, n):
            corr = float(mat[i, j])
            if corr >= corr_threshold:
                G.add_edge(df.iloc[i]["videoId"], df.iloc[j]["videoId"], weight=corr)
    return G

# ============ 图 B：视频–评论者二分网络（及视频投影） ============
def build_video_commenter_bipartite(video_ids, max_videos=12):
    B = nx.Graph()
    for vid in video_ids[:max_videos]:
        B.add_node(vid, type="video")
        commenters = get_video_commenters(vid)
        for uid in commenters:
            B.add_node(uid, type="user")
            if B.has_edge(uid, vid):
                B[uid][vid]["weight"] += 1
            else:
                B.add_edge(uid, vid, weight=1)
    return B

def bipartite_video_projection(B):
    videos = [n for n, d in B.nodes(data=True) if d.get("type") == "video"]
    # weighted_projected_graph: 边权=共同邻居数（共同评论者）
    return nx.algorithms.bipartite.weighted_projected_graph(B, videos)

# ============ 导出 ECharts JSON + HTML ============
def export_echarts_json(G, path):
    nodes = [{"id": n, "name": (G.nodes[n].get("title", n)), "value": G.nodes[n].get("views", 1)} for n in G.nodes]
    links = [{"source": u, "target": v, "value": d.get("weight", 1)} for u, v, d in G.edges(data=True)]
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"nodes": nodes, "links": links}, f, ensure_ascii=False)
    print("Saved:", path)

ECHARTS_HTML = """<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>html,body,#c{{height:100%;margin:0}}</style>
<script src="https://cdn.jsdelivr.net/npm/echarts@5"></script></head>
<body><div id="c"></div>
<script>
(async function(){
  const res = await fetch("{json}");
  const data = await res.json();
  const chart = echarts.init(document.getElementById('c'));
  chart.setOption({
    tooltip:{},
    series:[{
      type:'graph', layout:'force', roam:true, draggable:true,
      data: data.nodes.map(n=>({...n, symbolSize: 8 + Math.log((n.value||1)+1)*5})),
      links: data.links.map(l=>({...l, lineStyle:{width: (l.value||1)}})),
      label:{show:false}, force:{repulsion: 200, edgeLength:[40,140]}
    }]
  });
})();
</script></body></html>"""

def export_html(title, json_file, html_file):
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(ECHARTS_HTML.format(title=title, json=json_file))
    print("Saved:", html_file)

# ============ 主流程 ============
if __name__ == "__main__":
    uploads = get_uploads_playlist_id(CHANNEL_ID)
    video_ids = get_all_video_ids(uploads)
    print("视频总数：", len(video_ids))

    # Stats DataFrame
    df = get_videos_stats(video_ids)
    df.to_csv("videos_stats.csv", index=False)
    print("已保存：videos_stats.csv")

    # 图 A：视频表现相关网络
    G_perf = build_video_corr_graph(df, CORR_THRESHOLD)
    export_echarts_json(G_perf, "graph_perf.json")
    export_html("Video Performance Correlation", "graph_perf.json", "graph_perf.html")

    # 图 B：视频-评论者二分网络（及视频投影）
    B = build_video_commenter_bipartite(video_ids, MAX_VIDEOS_FOR_COMMENTS)
    # 如果你想直接看二分图，也可以导出 B，但前端展示二分图会比较密
    G_vv = bipartite_video_projection(B)
    export_echarts_json(G_vv, "graph_video_video_by_commenters.json")
    export_html("Video–Video by Common Commenters",
                "graph_video_video_by_commenters.json",
                "graph_video_video_by_commenters.html")

    print("完成：双击打开 graph_perf.html / graph_video_video_by_commenters.html 查看")

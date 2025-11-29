import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt

# ======= 1. 构造假数据 =======
# 模拟 “哪个用户评论了哪个视频”
data = [
    {"videoId": "Video_A", "commenterId": "User_1"},
    {"videoId": "Video_A", "commenterId": "User_2"},
    {"videoId": "Video_A", "commenterId": "User_3"},
    {"videoId": "Video_B", "commenterId": "User_2"},
    {"videoId": "Video_B", "commenterId": "User_3"},
    {"videoId": "Video_B", "commenterId": "User_4"},
    {"videoId": "Video_C", "commenterId": "User_1"},
    {"videoId": "Video_C", "commenterId": "User_5"},
    {"videoId": "Video_D", "commenterId": "User_3"},
    {"videoId": "Video_D", "commenterId": "User_5"},
]

df = pd.DataFrame(data)
print(df)

# ======= 2. 构建二部图（评论者 ↔ 视频） =======
B = nx.Graph()

videos = set(df["videoId"])
commenters = set(df["commenterId"])

B.add_nodes_from(videos, bipartite="video")
B.add_nodes_from(commenters, bipartite="commenter")

for _, row in df.iterrows():
    B.add_edge(row["videoId"], row["commenterId"])

# ======= 3. 可视化二部图 =======
plt.figure(figsize=(9, 6))
pos = {}
pos.update((v, (0, i)) for i, v in enumerate(sorted(videos)))
pos.update((c, (1, i)) for i, c in enumerate(sorted(commenters)))

nx.draw(
    B, pos,
    with_labels=True,
    node_color=["#FFA500" if B.nodes[n]["bipartite"] == "video" else "#87CEEB" for n in B.nodes],
    node_size=1000,
    width=0.8,
    font_size=9
)
plt.title("Bipartite Graph: Commenters ↔ Videos")
plt.tight_layout()
plt.show()

# ======= 4. 可选：视频–视频投影（评论者重叠） =======
from collections import defaultdict

commenter_to_videos = defaultdict(set)
for _, row in df.iterrows():
    commenter_to_videos[row["commenterId"]].add(row["videoId"])

G_vv = nx.Graph()
G_vv.add_nodes_from(videos)

for vids in commenter_to_videos.values():
    vids = list(vids)
    for i in range(len(vids)):
        for j in range(i + 1, len(vids)):
            a, b = vids[i], vids[j]
            if G_vv.has_edge(a, b):
                G_vv[a][b]["weight"] += 1
            else:
                G_vv.add_edge(a, b, weight=1)

# ======= 5. 可视化视频–视频关联图 =======
plt.figure(figsize=(7, 6))
pos2 = nx.spring_layout(G_vv, seed=42)
weights = [G_vv[u][v]["weight"] for u, v in G_vv.edges()]
nx.draw(
    G_vv, pos2,
    with_labels=True,
    node_color="#FFD700",
    node_size=1200,
    width=[w * 0.8 for w in weights],
    font_size=10
)
plt.title("Video–Video Co-comment Network (weight = shared commenters)")
plt.show()

import pandas as pd
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt

# 假设你的视频表现数据
data = pd.DataFrame({
    "video": ["A", "B", "C", "D", "E"],
    "views": [10000, 9800, 300, 12000, 400],
    "likes": [500, 480, 15, 600, 20],
    "comments": [80, 70, 3, 90, 4]
}).set_index("video")

# caluate the pip install networkx
corr = data.T.corr()

# graph
G = nx.Graph()
for i in corr.index:
    for j in corr.columns:
        if i != j and corr.loc[i, j] > 0.7:
            G.add_edge(i, j, weight=corr.loc[i, j])

# 可视化
pos = nx.spring_layout(G, seed=42)
nx.draw(G, pos, with_labels=True, node_color='skyblue', node_size=1000, font_size=14)
plt.show()

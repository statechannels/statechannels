import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import EngFormatter
import os
import json

fig, ax = plt.subplots()

labels = []
values_list = []
with open('./times.json') as json_file:
    data = json.load(json_file)
    for key in data:
        labels.append(key)
        values_list.append(map(lambda x: float(x)*1e-6, data[key]))

ax.set_ylim([-1, 20])
plt.boxplot(values_list)
plt.xticks(np.arange(1, len(labels)+1), labels)
ax.set_ylabel('ms')
fig.tight_layout()
plt.savefig("./benchmark.svg")
plt.savefig("./benchmark.png")

# plt.show()

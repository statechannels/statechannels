import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import EngFormatter
import os
import csv

fig, ax = plt.subplots()

labels = []
with open('./times.csv') as csv_file:
    data = csv.reader(csv_file)
    for index, row in enumerate(data):
        if index == 0:
            labels.append(row[0])
        if index == 1:
            values = np.array(
                map(lambda x: float(x)*1e-6, row[0][1:-1].split(',')))  # in ms
            plt.boxplot(values)

ax.set_ylim([-1, 5])
ax.set_xlabel(labels)
ax.set_ylabel('ms')
plt.show()

# fig.tight_layout()
plt.savefig(dir_path + "/benchmark.svg")
plt.savefig(dir_path + "/benchmark.png")

# plt.show()

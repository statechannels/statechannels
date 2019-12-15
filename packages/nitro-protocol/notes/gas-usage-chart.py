import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import EngFormatter
import os
dir_path = os.path.dirname(os.path.realpath(__file__))


usd_per_eth = 142
eth_per_gwei = 1e-9
gwei_per_gas = 2

usd_per_1M_gas = usd_per_eth * eth_per_gwei * gwei_per_gas * 1e6
print(usd_per_1M_gas)

legacy = {
    "deposit": 46750,
    "concludeAndWithdraw": 644147,
    "forceMove": 677845,
    "respond": 336337,
}
legacy["happyPath"] = legacy["deposit"] + \
    legacy["concludeAndWithdraw"]

legacy["challengePath"] = legacy["forceMove"] + \
    legacy["respond"]

optimized = {
    "deployNitroAdjudicator": 3155589,
    "deployAssetHolder": 1831942,
    "deposit": 48776,
    "concludePushOutcomeAndTransferAll": 107812,
    "forceMove": 134004,
    "respond": 86357,
}

optimized["deployment"] = optimized["deployNitroAdjudicator"] + \
    optimized["deployAssetHolder"]

optimized["happyPath"] = optimized["deposit"] + \
    optimized["concludePushOutcomeAndTransferAll"]

optimized["challengePath"] = optimized["forceMove"] + \
    optimized["respond"]

labels = ['Happy Path', 'Challenge Path']
legacy = [legacy["happyPath"], legacy["challengePath"]]
optimized = [optimized["happyPath"], optimized["challengePath"]]

x = np.arange(len(labels))  # the label locations
width = 0.35  # the width of the bars

fig, ax = plt.subplots()
rects1 = ax.bar(x - width/2, legacy, width, label='Legacy')
rects2 = ax.bar(x + width/2, optimized, width, label='Optimized')

# Add some text for labels, title and custom x-axis tick labels, etc.
ax.set_ylabel('Gas')
# ax.set_title('Gas consumption')
ax.set_xticks(x)
ax.set_xticklabels(labels)

formatter1 = EngFormatter(places=0, sep="\N{THIN SPACE}")  # U+2009
ax.yaxis.set_major_formatter(formatter1)

ax.legend()


def autolabel(rects):
    """Attach a text label above each bar in *rects*, displaying its height."""
    for rect in rects:
        height = rect.get_height()
        ax.annotate('{}'.format(height),
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3),  # 3 points vertical offset
                    textcoords="offset points",
                    ha='center', va='bottom')


autolabel(rects1)
autolabel(rects2)

fig.tight_layout()
plt.savefig(dir_path + "/gas-savings.svg")
plt.savefig(dir_path + "/gas-savings.png")

plt.show()

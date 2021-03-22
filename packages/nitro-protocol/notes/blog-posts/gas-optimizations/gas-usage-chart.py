import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import EngFormatter
import os
dir_path = os.path.dirname(os.path.realpath(__file__))


usd_per_eth = 1783
eth_per_gwei = 1e-9
gwei_per_gas = 138

usd_per_1M_gas = usd_per_eth * eth_per_gwei * gwei_per_gas * 1e6
print(usd_per_1M_gas)

legacy = {
    'revision': '707a3e669fe127ac5c96738039845d122feb3222',  # statechannels monorepo
    "deployNitroAdjudicator": 6553512,  # TEST contract
    "deposit": 46750,
    "concludeAndWithdraw": 644147,
    "challenge": 677845,
    "respond": 336337,
}

legacy["deployment"] = legacy["deployNitroAdjudicator"]

legacy["happyPath"] = legacy["deposit"] + \
    legacy["concludeAndWithdraw"]

legacy["challengePath"] = legacy["challenge"] + \
    legacy["respond"]

optimized = {
    "revision": '990a3e9ca10c311b9cbd7057383696458e38fda',  # statechannels monorepo
    "deployNitroAdjudicator": 2425942,
    "deployAssetHolder": 1831942,
    "deposit": 48996,
    "concludePushOutcomeAndTransferAll": 113797, 
    "challenge": 101881,
    "respond": 56706,
}

optimized["deployment"] = optimized["deployNitroAdjudicator"] + \
    optimized["deployAssetHolder"]

optimized["happyPath"] = optimized["deposit"] + \
    optimized["concludePushOutcomeAndTransferAll"]

optimized["challengePath"] = optimized["challenge"] + \
    optimized["respond"]

labels = ['Happy Path', 'Challenge Path']
legacy = [legacy["happyPath"], legacy["challengePath"]]
optimized = [
    optimized["happyPath"], optimized["challengePath"]]

x = np.arange(len(labels))  # the label locations
width = 0.35  # the width of the bars

fig, ax = plt.subplots()
rects1 = ax.bar(x - width/2, legacy, width,
                label='Legacy', color="#FFF2CC", edgecolor="black")  # FFF2CC
rects2 = ax.bar(x + width/2, optimized, width,
                label='Optimized', color="#D5E8D4", edgecolor="black")  # D5E8D4

# Add some text for labels, title and custom x-axis tick labels, etc.
ax.set_ylabel('Gas')
# ax.set_title('Gas consumption')
ax.set_xticks(x)
ax.set_xticklabels(labels)

formatter1 = EngFormatter(places=0, sep="\N{THIN SPACE}")  # U+2009
ax.yaxis.set_major_formatter(formatter1)

ax2 = ax.twinx()
mn, mx = ax.get_ylim()
ax2.set_ylim(mn*usd_per_1M_gas*1e-6, mx*usd_per_1M_gas*1e-6)
ax2.set_ylabel('$')


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

import matplotlib
import matplotlib.pyplot as plt
import numpy as np

optimized = {
    "deposit": 48776,
    "concludePushOutcomeAndTransferAll": 107812
    "forceMove": 134004
    "respond": 86357
}
optimized["happyPath"] = optimized["deposit"] + \
    optimized["concludePushOutcomeAndTransferAll"]

optimized["challengePath"] = optimized["forceMove"] + \
    optimized["respond"]

labels = ['Happy Path', 'Challenge Path']
legacy = [optimized["happyPath"], 34]
optimized = [25, 32]

x = np.arange(len(labels))  # the label locations
width = 0.35  # the width of the bars

fig, ax = plt.subplots()
rects1 = ax.bar(x - width/2, legacy, width, label='Legacy')
rects2 = ax.bar(x + width/2, optimized, width, label='Optimized')

# Add some text for labels, title and custom x-axis tick labels, etc.
ax.set_ylabel('Gas')
ax.set_title('Gas consumption')
ax.set_xticks(x)
ax.set_xticklabels(labels)
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

plt.show()

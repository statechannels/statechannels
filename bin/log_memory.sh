#!/bin/bash

FILE=/home/circleci/$1.txt
USAGE=/sys/fs/cgroup/memory/memory.usage_in_bytes
MAX_USAGE=/sys/fs/cgroup/memory/memory.max_usage_in_bytes
COUNTER=0

# NB: The %mem field in the output of `ps afu` is incorrect, as it divides by the memory
# avaiable to the whole system.
# It seems like containers have about 70 gB of memory, so 1% usage corresponds to ~700 mB.
# You can validate this assumption by checking the System MemTotal on line 1 of $FILE.
echo "System $(grep MemTotal /proc/meminfo )" >> $FILE

while true; do
  {
    echo "${COUNTER} ----------";
    echo "Current Memory: $(($(cat $USAGE) / 1000000)) mB";
    echo "Max Memory:     $(($(cat $MAX_USAGE) / 1000000)) mB";
    ps afu;
  } >> $FILE
  sleep 1;
  COUNTER=$((COUNTER + 1));
done 
#!/bin/bash
set -e
set -u

yarn build

if [ -d ./.clinic ]; then
  echo "Deleting .clinic folder"
  rm -r ./.clinic
fi

echo "Generating flamegraph"
SERVER_DB_NAME=payer NODE_ENV=development npx ts-node ./e2e-test/scripts/generate-profile-data.ts flamegraph
npx clinic flame --visualize-only .clinic/*.clinic-flame

echo "Generating bubbleprof"
SERVER_DB_NAME=payer NODE_ENV=development npx ts-node ./e2e-test/scripts/generate-profile-data.ts bubbleprof
npx clinic bubbleprof --visualize-only .clinic/*.clinic-bubbleprof

#!/bin/bash
set -e
set -u

APP=$1
E2E_ROOT=$(pwd)
PACKAGES=$E2E_ROOT/..

# Kill child processes if I receive SIGINT, SIGTERM or EXIT
trap 'trap - SIGTERM && kill 0' SIGINT SIGTERM EXIT


cd $PACKAGES/devtools
yarn start:shared-ganache | tee $E2E_ROOT/shared-ganache.log & 
ganache=$!

cd $PACKAGES/$APP && yarn run wait-on ../../.ganache-deployments/ganache-deployments-8545.json
yarn start | tee $E2E_ROOT/app.log &
app=$!

cd ../xstate-wallet
yarn start | tee $E2E_ROOT/xstate-wallet.log &
wallet=$!

cd ../simple-hub
yarn hub:watch | tee $E2E_ROOT/hub.log &
hub=$!

cd ../e2e-tests
yarn run wait-on -d 5000 http://localhost:3000 http://localhost:3055
yarn test $APP
code=$?

if test -f "../../.ganache-deployments/ganache-deployments-8545.json"; then
  rm ../../.ganache-deployments/ganache-deployments-8545.json
fi
exit $code

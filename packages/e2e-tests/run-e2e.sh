#!/bin/bash
set -e
set -u

APP=$1
E2E_ROOT=$(pwd)
PACKAGES=$E2E_ROOT/..
MONOREPO_ROOT=$E2E_ROOT/../..

cleanup() {
  if test -f "$MONOREPO_ROOT/.ganache-deployments/ganache-deployments-8545.json"; then
    rm $MONOREPO_ROOT/.ganache-deployments/ganache-deployments-8545.json
  fi
  kill 0
}

# Kill child processes if I receive SIGINT, SIGTERM or EXIT
trap 'trap - SIGTERM && cleanup' SIGINT SIGTERM EXIT


cd $PACKAGES/devtools
yarn start:shared-ganache | tee $E2E_ROOT/shared-ganache.log & 

cd $PACKAGES/$APP && yarn run wait-on ../../.ganache-deployments/ganache-deployments-8545.json
yarn start | tee $E2E_ROOT/app.log &

cd ../xstate-wallet
yarn start | tee $E2E_ROOT/xstate-wallet.log &

cd ../simple-hub
yarn hub:watch | tee $E2E_ROOT/hub.log &

cd ../e2e-tests
yarn run wait-on -d 5000 http://localhost:3000 http://localhost:3055
yarn test $APP
code=$?

exit $code

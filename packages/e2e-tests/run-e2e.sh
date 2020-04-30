#!/bin/bash
set -e
set -u

APP=$1
E2E_ROOT=$(pwd)
PACKAGES=$E2E_ROOT/..
MONOREPO_ROOT=$E2E_ROOT/../..

WAIT_ON_TIMEOUT=60000
WAIT_ON_INTERVAL=5000
WAIT_ON_DELAY=5000

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

yarn run wait-on -t $WAIT_ON_TIMEOUT -i $WAIT_ON_INTERVAL $MONOREPO_ROOT/.ganache-deployments/ganache-deployments-8545.json
cd $PACKAGES/$APP 
yarn start | tee $E2E_ROOT/app.log &

cd $PACKAGES/xstate-wallet
yarn start | tee $E2E_ROOT/xstate-wallet.log &

cd $PACKAGES/simple-hub
yarn hub:watch | tee $E2E_ROOT/hub.log &

cd $PACKAGES/e2e-tests
yarn run wait-on -d $WAIT_ON_DELAY -t $WAIT_ON_TIMEOUT -i $WAIT_ON_INTERVAL http://localhost:3000 http://localhost:3055
yarn test $APP
code=$?

exit $code

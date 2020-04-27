#!/bin/bash

cd ../devtools
yarn start:shared-ganache & 
ganache=$!

cd ../$1 && yarn run wait-on ../../.ganache-deployments/ganache-deployments-8545.json
yarn start &
app=$!

cd ../xstate-wallet
yarn start &
wallet=$!

cd ../simple-hub
yarn hub:watch &
hub=$!

cd ../e2e-tests
yarn run wait-on -d 5000 http://localhost:3000 http://localhost:3055
yarn test $1
code=$?

kill $ganache
kill $wallet
kill $app
kill $hub
exit $code

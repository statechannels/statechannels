cd ../devtools
yarn start:shared-ganache & 
cd ../$1 && yarn run wait-on ../../.ganache-deployments/ganache-deployments-8545.json
yarn start &
cd ../xstate-wallet
yarn start &
cd ../simple-hub
yarn hub:watch &
cd ../e2e-tests
yarn test $1
code=$?
kill -9 -$$
exit $code
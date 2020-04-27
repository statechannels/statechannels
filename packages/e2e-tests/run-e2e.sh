cd ../devtools
yarn start:shared-ganache & 
cd ../$1 && yarn run wait-on ../../.ganache-deployments/ganache-deployments-8545.json
yarn start &
cd ../xstate-wallet
yarn start &
cd ../e2e-tests
yarn test $1
rm -rf ../../.ganache-deployments
kill -- -$$
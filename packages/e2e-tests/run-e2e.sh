cd ../devtools && yarn start:shared-ganache & 
cd ../$1 && yarn run wait-on ../../.ganache-deployments && yarn start &
cd ../xstate-wallet && yarn run wait-on ../../.ganache-deployments && yarn start &
cd ../e2e-tests && yarn test $1
pkill -P $$
rm -rf ../../.ganache-deployments
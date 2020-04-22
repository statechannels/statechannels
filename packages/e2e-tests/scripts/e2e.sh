
(cd ../devtools && yarn start:shared-ganache) & 
(cd ../web3torrent && yarn run wait-on ../../.ganache-deployments && yarn start) &
(cd ../xstate-wallet && yarn run wait-on ../../.ganache-deployments && yarn start) &
(cd ../e2e-tests && yarn test)
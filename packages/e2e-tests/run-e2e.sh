cd ../devtools && yarn start:shared-ganache & 
job1=$!
cd ../$1 && yarn run wait-on ../../.ganache-deployments && yarn start &
job2=$!
cd ../xstate-wallet && yarn run wait-on ../../.ganache-deployments && yarn start &
job3=$!
cd ../e2e-tests && yarn test $1
kill $job1 $job2 $job3
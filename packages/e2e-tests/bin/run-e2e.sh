#!/bin/bash
set -e
set -u

APP=$1

WAIT_ON_TIMEOUT=60000
WAIT_ON_INTERVAL=5000
WAIT_ON_DELAY=5000

cleanup() {
  echo killing $services
  kill -9 $services
  wait
}

# Kill child processes if I receive SIGINT, SIGTERM
trap 'cleanup' SIGINT SIGTERM

yarn start-servers $APP &
services=$!
echo Services running at PID $services

yarn run wait-on -d $WAIT_ON_DELAY -t $WAIT_ON_TIMEOUT -i $WAIT_ON_INTERVAL http://localhost:3000 http://localhost:3055

yarn test $APP --runInBand 
exit_status=$?

cleanup
exit $exit_status

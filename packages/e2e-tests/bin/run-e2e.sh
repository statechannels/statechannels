#!/bin/bash
set -e
set -u

APP=$1

WAIT_ON_TIMEOUT=60000
WAIT_ON_INTERVAL=5000
WAIT_ON_DELAY=5000

cleanup() {
  if [[ -z services ]]
  then
    echo Warning: services undefined: $services
  else
    echo Killing $services
    # I'm not 100% sure that this will always work.
    # However, having a background process running shouldn'g cause a circle failure
    # so it should work "well enough" for integration tests on circle.
    # On local machines, it seems preferable to warn users that they may need to manually
    # clean up processes
    echo "
    May not be 100% reliable.
    If in doubt,
    - check ps | grep node for possible zombie node processes.
    - check ps | grep ganache for possible zombie ganache servers
    - check ps -f | grep $services for other services
    - use 'killall node' to kill all background node processes (AT YOUR OWN RISK)
    "
    kill -9 $services
    wait
  fi
}

# Kill child processes if I receive SIGINT, SIGTERM
# We manually call cleanup after the test runs in order to preserve
# the test exit code (important for circle)
trap 'cleanup' SIGINT SIGTERM

yarn start-servers $APP &
services=$!
echo Services running at PID $services

yarn run wait-on -d $WAIT_ON_DELAY -t $WAIT_ON_TIMEOUT -i $WAIT_ON_INTERVAL http://localhost:3000 http://localhost:3055

yarn test $APP --runInBand
exit_status=$?

cleanup
exit $exit_status

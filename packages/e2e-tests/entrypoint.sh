#!/bin/bash

# Startup Xvfb
Xvfb -ac :99 -screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR > /dev/null 2>&1 &

if [[ $@ == *"bash"* ]]
then
  echo "Interactive console: "
  set -e
  exec "$@"
else
  # if the image is ran the test suddenly start to pass
  yarn test:e2e:w3t
fi

# using set -e and exec "$@" changes the context of the shell, invalidating the Xvfb command

# - running "docker run -it dapp" will make the command in line 13 run, 
#   without changing the context
# - running "docker run -it dapp bash" and then running "yarn test:e2e:w3t" will fail
# - running "docker run -it dapp bash" and then running 
#   Xvfb -ac :99 -screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR > /dev/null 2>&1 &
#   and THEN "yarn test:e2e:w3t" will work
#!/bin/bash

if [[ $@ == *"bash"* ]]
then
  echo "Interactive console: "
  set -e
  exec "$@"
else
  Xvfb -ac :99 -screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR > /dev/null 2>&1 &
  yarn start
fi
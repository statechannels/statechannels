#!/bin/sh

# Export some variables
export DISPLAY=:99.0
export PUPPETEER_EXEC_PATH="google-chrome-stable"

# Startup Xvfb
Xvfb -ac :99 -screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR > /dev/null 2>&1 &

cd packages/e2e-tests
set -e
exec "$@"
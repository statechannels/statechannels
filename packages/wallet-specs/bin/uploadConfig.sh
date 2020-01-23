#!/bin/sh

# Requirements: https://github.com/defunkt/gist
# Usage:
# > yarn uploadConfig $PROTOCOL
#
# Example
# ❯ yarn uploadConfig direct-funding
# yarn run v1.21.1
# $ bin/uploadConfig.sh direct-funding
# http://xstate.js.org/viz/?gist=7b60e4d910abec0a7b5368ac11f54ace

PROTOCOL=$1
FILENAME=src/protocols/${PROTOCOL}/protocol.config.js
GIST_URL=$(gist -f machine.js <$FILENAME)
echo "http://xstate.js.org/viz/?gist=$(echo $GIST_URL | cut -c25-56)"
#!/bin/bash

set -e

export $(egrep -v '^#' .env | xargs)

if [ -z "$USE_NATIVE_SOLC" ]; then
  yarn run etherlime compile --buildDirectory=./build/contracts
else
  yarn run etherlime compile --solcVersion=native --buildDirectory=./build/contracts
fi
#!/bin/bash

set -e

if [ -z "$USE_NATIVE_SOLC" ]; then
  yarn run etherlime compile --runs=1 --buildDirectory=./build/contracts
else
  yarn run etherlime compile --runs=1 --solcVersion=native --buildDirectory=./build/contracts
fi


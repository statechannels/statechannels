#!/bin/bash
parentPath=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "${parentPath}/.."
cp ../wallet/build/contracts/* build/contracts/
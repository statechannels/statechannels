#!/bin/sh
set -euf -o pipefail

docker build -t counterfactual/statechannels:${1} .
docker push counterfactual/statechannels:${1}
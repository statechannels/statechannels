#!/bin/sh
set -euf -o pipefail

docker build -t counterfactual/statechannels:latest .
docker push counterfactual/statechannels:latest
#!/bin/sh
set -euf -o pipefail
BASEDIR=$(dirname "$0")

docker build -t registry.heroku.com/simple-hub-production/simple-hub -f "$BASEDIR"/simple-hub.dockerfile "$BASEDIR"/../../..
docker push registry.heroku.com/simple-hub-production/simple-hub
heroku container:release -a simple-hub-production simple-hub

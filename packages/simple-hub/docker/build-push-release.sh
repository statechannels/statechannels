#!/bin/sh
set -euf
BASEDIR=$(dirname "$0")

docker build -t registry.heroku.com/simple-hub-staging/simple-hub -f "$BASEDIR"/simple-hub.dockerfile "$BASEDIR"/../../..
docker push registry.heroku.com/simple-hub-staging/simple-hub
heroku container:release -a simple-hub-staging simple-hub

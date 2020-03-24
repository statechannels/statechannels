#!/bin/sh
set -euf -o pipefail
BASEDIR=$(dirname "$0")

docker build -t registry.heroku.com/web3torrent-tracker-staging/web -f "$BASEDIR"/Dockerfile "$BASEDIR"
docker push registry.heroku.com/web3torrent-tracker-staging/web
heroku container:release -a web3torrent-tracker-staging web

#!/bin/bash

set -euf -o pipefail
BASEDIR=$(dirname "$0")

# MAIN SCRIPT
docker build -t registry.heroku.com/persistent-seeder-staging/persistent-seeder -f persistent-seeder.dockerfile "$BASEDIR"/../../.. || restoreDockerIgnore
docker push registry.heroku.com/persistent-seeder-staging/persistent-seeder
heroku container:release -a persistent-seeder-staging persistent-seeder
#!/bin/bash

set -euf -o pipefail
BASEDIR=$(dirname "$0")
BACKUP_DOCKERIGNORE="$BASEDIR"/../../../bk.dockerignore
GLOBAL_DOCKERIGNORE="$BASEDIR"/../../../.dockerignore

switchDockerIgnore () {
  # necessary for as long as circleci wont support docker 19.03, which adds multiple .dockerignore files support
  # https://ideas.circleci.com/ideas/CCI-I-1265
  # https://stackoverflow.com/a/57774684/6569950
  echo "Switching dockerignore"
  cp "$BASEDIR"/../../../.dockerignore "$BACKUP_DOCKERIGNORE"
  cp persistent-seeder.dockerfile.dockerignore "$GLOBAL_DOCKERIGNORE"
}

restoreDockerIgnore() { #resets, if necessary, the .dockerignore file to it's original state
  if test -f "$BACKUP_DOCKERIGNORE"; then
    echo "Restoring dockerignore backup"
    mv "$BACKUP_DOCKERIGNORE" "$GLOBAL_DOCKERIGNORE"
  fi
}


# MAIN SCRIPT
switchDockerIgnore
docker build -t registry.heroku.com/persistent-seeder-staging/persistent-seeder -f persistent-seeder.dockerfile "$BASEDIR"/../../.. || restoreDockerIgnore
restoreDockerIgnore
docker push registry.heroku.com/persistent-seeder-staging/persistent-seeder
heroku container:release -a persistent-seeder-staging persistent-seeder
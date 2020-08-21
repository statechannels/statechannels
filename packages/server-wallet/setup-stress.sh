#!/bin/sh

set -e
set -u

export NODE_ENV=test

function setupDb {
  export SERVER_DB_NAME=$1
  dropdb $SERVER_DB_NAME --if-exists
  createdb $SERVER_DB_NAME
  yarn db:migrate
}

setupDb payer
setupDb receiver
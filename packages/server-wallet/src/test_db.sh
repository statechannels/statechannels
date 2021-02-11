#!/bin/bash
# 1. recreate db if not exist
# 2. migrate db to latest

for var in "$@"
do
    echo creating and migrating "$var"...
    
    createdb $var -p 5432 -h localhost -U postgres > /dev/null 2>&1
    SERVER_DB_NAME="$var" bash -c "yarn db:migrate"
done

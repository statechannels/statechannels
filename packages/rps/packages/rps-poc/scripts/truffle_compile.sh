#!/usr/bin/env bash

# TODO: This would probably be more maintanable in a node script instead.
while getopts "cm" opt; do
  case $opt in
    c)
      clean=true
      ;;
    m)
      migrate=true
      ;;
  esac
done

# Create our working directory
mkdir -p tmp;
# Copy over truffle files we'll need
copyfiles './contracts/**/*' './migrations/**/*' '.env' ./tmp;
# Build truffle.js
tsc -p tsconfig.truffle.json;

cd tmp;

# Compile truffle JSON files
../node_modules/.bin/truffle compile;

if [ "$migrate" = true ];
then 
    echo "Calling truffle migrate";
    ../node_modules/.bin/truffle migrate --network development;
fi

echo "Updating JSON artifacts in src folder";
# Copy the JSON files to the src folder
copyfiles -f build/contracts/*.json ../src/contracts;

cd ../

if [ "$clean" = true ] 
then 
    echo "Cleaning tmp directory"
    rm -rf tmp
fi

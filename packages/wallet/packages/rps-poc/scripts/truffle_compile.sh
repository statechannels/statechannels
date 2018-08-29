# Create our working directory
mkdir -p tmp
# Copy over truffle files we'll need
copyfiles './contracts/**/*' './migrations/**/*' '.env' ./tmp
# Build truffle.js
tsc -p tsconfig.truffle.json
# Compile truffle JSON files
cd tmp && ../node_modules/.bin/truffle compile
# Copy the JSON files to the src folder
copyfiles -f build/contracts/*.json ../src/contracts

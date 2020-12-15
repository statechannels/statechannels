const {writeFileSync} = require('fs');

const jq = require('node-jq');
const filter = 'walk(if (type == "object" and .abi) then del(.abi) else . end )';
const jsonPath = './addresses.json';
const options = {};

jq.run(filter, jsonPath, options)
  .then(output => {
    console.log(output);
    writeFileSync(jsonPath, output);
  })
  .catch(err => {
    console.error(err);
  });

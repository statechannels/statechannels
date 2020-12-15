const {writeFileSync} = require('fs');

const jsonPath = __dirname + '/../addresses.json';
const addresses = require(jsonPath);

function deepDelete(object, keyToDelete) {
  Object.keys(object).forEach(key => {
    if (key === keyToDelete) delete object[key];
    else if (typeof object[key] === 'object') deepDelete(object[key], keyToDelete);
  });
}
const keyToDelete = 'abi';
deepDelete(addresses, keyToDelete);
writeFileSync(jsonPath, JSON.stringify(addresses, null, 2));

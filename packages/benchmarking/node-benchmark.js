const fs = require('fs');
const {runBenchmark} = require('./signatures');

runBenchmark().then(results => {
  fs.writeFile('times-node.json', JSON.stringify(results), err => {
    if (err) throw err;
  });
});

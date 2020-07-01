const fs = require('fs');
const {runBenchmark} = require('./signatures');

const results = runBenchmark();
fs.writeFile('times.json', JSON.stringify(results), err => {
  if (err) throw err;
});

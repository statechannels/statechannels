const {ethers} = require('ethers');
const ObjectsToCsv = require('objects-to-csv');
const wallet = ethers.Wallet.createRandom();

const times = [];

for (let i = 0; i < 1000; i++) {
  const before = process.hrtime()[1];
  wallet.signMessage('test message');
  const after = process.hrtime()[1];
  times.push(after - before);
}

const csv = new ObjectsToCsv([{'ethers.signMessage': times}], {append: true});
csv.toDisk('times.csv');

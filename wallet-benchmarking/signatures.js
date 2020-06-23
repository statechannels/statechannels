const {ethers} = require('ethers');
const fs = require('fs');

const wallet = ethers.Wallet.createRandom();
const results = {};
let times;
times = [];
for (let i = 0; i < 3; i++) {
  const before = process.hrtime()[1]; // in ns
  wallet.signMessage('test message');
  const after = process.hrtime()[1];
  times.push(after - before);
}
results['ethers.signMessage'] = [...times];

times = [];
for (let i = 0; i < 3; i++) {
  const before = process.hrtime()[1]; // in ns
  wallet.signMessage(
    'a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message '
  );
  const after = process.hrtime()[1];
  times.push(after - before);
}
results['ethers.signMessage2'] = [...times];

fs.writeFile('times.json', JSON.stringify(results), err => {
  if (err) throw err;
});

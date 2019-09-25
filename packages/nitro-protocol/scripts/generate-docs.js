const NODE_DIR = '../../node_modules';
const INPUT_DIR = 'contracts';
const CONFIG_DIR = 'docs/implementation';
const OUTPUT_DIR = 'docs/implementation';

const spawnSync = require('child_process').spawnSync;

const args = [
  NODE_DIR + '/solidity-docgen/dist/cli.js',
  '--input=' + INPUT_DIR,
  '--output=' + OUTPUT_DIR,
  '--templates=' + CONFIG_DIR,
  '--solc-module=' + NODE_DIR + '/solc',
  '--solc-settings=' + JSON.stringify({optimizer: {enabled: true, runs: 200}}),
  '--contract-pages',
];

const result = spawnSync('node', args, {stdio: ['inherit', 'inherit', 'pipe']});
if (result.stderr.length > 0) throw new Error(result.stderr);

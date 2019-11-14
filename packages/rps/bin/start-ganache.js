process.env.NODE_ENV = process.env.NODE_ENV || 'test';
const { configureEnvVariables } = require('@statechannels/devtools');
configureEnvVariables();

const { exec } = require('child_process');
console.log(`Starting ganache on port ${process.env.GANACHE_PORT}`);
exec(
  `npx etherlime ganache --port=${process.env.GANACHE_PORT} > ganache.log`,
  (err, stdout, stderr) => {
    if (err) {
      console.error(err);
    } else {
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    }
  }
);

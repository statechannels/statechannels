import {configureEnvVariables} from '@statechannels/devtools';

async function setupGanacheAndContracts(): Promise<void> {
  process.env = {...process.env};
}

async function start(): Promise<void> {
  await setupGanacheAndContracts();
}

if (require.main === module) {
  configureEnvVariables();
  start();
}

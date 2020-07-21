async function setupGanacheAndContracts(): Promise<void> {
  process.env = {...process.env};
}

async function start(): Promise<void> {
  await setupGanacheAndContracts();
}

if (require.main === module) {
  require('../env'); // Note: importing this module has the side effect of modifying env vars
  start();
}

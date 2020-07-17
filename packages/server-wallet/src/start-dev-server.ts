async function setupGanacheAndContracts() {
  process.env = {...process.env};
}

async function start() {
  await setupGanacheAndContracts();
}

if (require.main === module) {
  require('../env'); // Note: importing this module has the side effect of modifying env vars
  start();
}

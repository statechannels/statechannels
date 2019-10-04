const net = require("net");
const {GanacheServer, configureEnvVariables} = require("@statechannels/devtools");
configureEnvVariables();

const {deploy} = require("../../deployment/deploy-test");

async function globalSetup() {
  const chain = new GanacheServer();
  // Kill the ganache server when jest exits
  process.on("exit", async () => {
    await chain.close();
  });
  global.chain = chain;

  await chain.ready();

  await deploy();
  console.log(`Test contracts deployed: ${JSON.stringify(require("../../deployment/network-map.json"), null, 2)}`);
}

module.exports = globalSetup;

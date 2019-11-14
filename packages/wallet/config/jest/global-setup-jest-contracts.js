const requestPromise = require("request-promise-native");
const log = require("loglevel");

require('dotenv-extended').load();

log.setDefaultLevel(log.levels.INFO);

async function globalSetup() {
  log.info("Setting up jest globally");
  const networkAddress = `http://localhost:${process.env.DEV_SERVER_PORT}`;
  try {
    // TODO: validate deployments against a whitelist
    // TODO: share type info for what's expected from this end point, perhaps from the devtools package?
    const networkContext = JSON.parse(await requestPromise(networkAddress));
    global.contracts = networkContext.contracts;
    log.info("Got network context");
  } catch (err) {
    log.error(`Failed to get network context from ${networkAddress}`);
    throw Error(err);
  }
}

module.exports = globalSetup;

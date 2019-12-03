process.env.BABEL_ENV = "development";
process.env.NODE_ENV = "development";

require("../config/env");
const path = require("path");

const {startSharedGanache} = require("@statechannels/devtools");

void (async () => {
  const deploymentsFile = process.env.GANACHE_DEPLOYMENTS_FILE;

  if (!deploymentsFile) {
    throw Error("Must set a GANACHE_DEPLOYMENTS_FILE in env to start a shared ganache instance");
  }

  const deploymentsPath = path.join(process.cwd(), deploymentsFile);

  await startSharedGanache(deploymentsPath);
})();

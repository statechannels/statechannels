import requestPromise from "request-promise-native";
import log from "loglevel";

import dotEnvExtended from "dotenv-extended";
dotEnvExtended.load();

log.setDefaultLevel(log.levels.INFO);

export default async function globalSetup() {
  log.info("Setting up jest globally");
  const networkAddress = `http://localhost:${process.env.DEV_SERVER_PORT}`;
  // TODO: validate deployments against a whitelist
  // TODO: share type info for what's expected from this end point, perhaps from the devtools package?
  const networkContext = JSON.parse(await requestPromise(networkAddress));
  global["contracts"] = networkContext.contracts;
}

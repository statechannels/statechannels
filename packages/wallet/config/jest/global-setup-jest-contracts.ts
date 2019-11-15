import log from "loglevel";

import dotEnvExtended from "dotenv-extended";
dotEnvExtended.load();

log.setDefaultLevel(log.levels.INFO);

export default async function globalSetup() {}

import "../config/env";
import {GanacheServer} from "@statechannels/devtools";
const {deploy} = require("../deployment/deploy");

export default async function setup() {
  const ganacheServer = new GanacheServer(
    Number(process.env.GANACHE_PORT),
    Number(process.env.CHAIN_NETWORK_ID)
  );
  await ganacheServer.ready();

  const {
    CONSENSUS_APP_ADDRESS,
    TRIVIAL_APP_ADDRESS,
    NITRO_ADJUDICATOR_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS,
    TEST_TOKEN_ADDRESS,
    TEST_TOKEN_ASSET_HOLDER_ADDRESS
  } = await deploy();

  process.env.CONSENSUS_APP_ADDRESS = CONSENSUS_APP_ADDRESS;
  process.env.TRIVIAL_APP_ADDRESS = TRIVIAL_APP_ADDRESS;
  process.env.NITRO_ADJUDICATOR_ADDRESS = NITRO_ADJUDICATOR_ADDRESS;
  process.env.ETH_ASSET_HOLDER_ADDRESS = ETH_ASSET_HOLDER_ADDRESS;
  process.env.TEST_TOKEN_ADDRESS = TEST_TOKEN_ADDRESS;
  process.env.TEST_TOKEN_ASSET_HOLDER_ADDRESS = TEST_TOKEN_ASSET_HOLDER_ADDRESS;

  (global as any).__GANACHE_SERVER__ = ganacheServer;
}

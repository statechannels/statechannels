import {
  getNetworkId,
  getETHAssetHolderAddress,
  getAdjudicatorContractAddress,
  getConsensusContractAddress,
  getTrivialAppAddress
} from "./utils/contract-utils";

export const TRIVIAL_APP_ADDRESS = getTrivialAppAddress();
export const ETH_ASSET_HOLDER_ADDRESS = getETHAssetHolderAddress();
export const ADJUDICATOR_ADDRESS = getAdjudicatorContractAddress();
export const CONSENSUS_LIBRARY_ADDRESS = getConsensusContractAddress();
export const NETWORK_ID = getNetworkId();
export const USE_STORAGE = process.env.USE_STORAGE === "TRUE";
// TODO: Move top ENV variable
export const HUB_ADDRESS = "0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C";
export const CHALLENGE_DURATION = 0x12c; // 5 minutes

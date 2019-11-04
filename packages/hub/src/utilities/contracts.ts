import * as path from 'path';

const commonDataPrefix = '@statechannels/engine/contracts/pre-built-artifacts';
const ethAssetHolderJson = 'ETHAssetHolder.json';

interface Artifact {
  abi: any;
  contractName: string;
  networks: {[key: string]: {address: string}};
}

const nitroAdjudicatorArtifact: Artifact = require(path.join(commonDataPrefix, ethAssetHolderJson));

export {nitroAdjudicatorArtifact};

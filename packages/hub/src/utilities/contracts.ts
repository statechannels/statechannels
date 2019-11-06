import * as path from 'path';

const commonDataPrefix = '@statechannels/wallet/contracts/pre-built-artifacts';
const ethAssetHolderJson = 'ETHAssetHolder.json';

interface Artifact {
  abi: any;
  contractName: string;
  networks: {[key: string]: {address: string}};
}

const ethAssetHolderArtifact: Artifact = require(path.join(commonDataPrefix, ethAssetHolderJson));

export {ethAssetHolderArtifact};

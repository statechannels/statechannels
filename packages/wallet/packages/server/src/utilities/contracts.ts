import * as path from 'path';

const commonDataPrefix = 'magmo-wallet-common/prebuilt-contracts';
const devPathPrefix = '../../build/contracts';

const commitmentJson = 'Commitment.json';
const rulesJson = 'Rules.json';
const nitroAdjudicatorJson = 'NitroAdjudicator.json';
const rpsGameJson = 'RockPaperScissorsGame.json';

interface Artifact {
  abi: any;
  contractName: string;
  networks: { [key: string]: { address: string } };
}

let commitmentArtifact: Artifact = require(path.join(commonDataPrefix, commitmentJson));
let rulesArtifact: Artifact = require(path.join(commonDataPrefix, rulesJson));
let nitroAdjudicatorArtifact: Artifact = require(path.join(commonDataPrefix, nitroAdjudicatorJson));
let rpsGameArtifact: Artifact = require(path.join(commonDataPrefix, rpsGameJson));

if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  commitmentArtifact = require(path.join(devPathPrefix, commitmentJson));
  rulesArtifact = require(path.join(devPathPrefix, rulesJson));
  nitroAdjudicatorArtifact = require(path.join(devPathPrefix, nitroAdjudicatorJson));
}

export { commitmentArtifact, rulesArtifact, nitroAdjudicatorArtifact, rpsGameArtifact };

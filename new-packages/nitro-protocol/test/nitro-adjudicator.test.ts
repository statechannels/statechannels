import {ethers} from 'ethers';
// @ts-ignore
import optimizedForceMoveArtifact from '../build/contracts/TESTOptimizedForceMove.json';

let optimizedForceMove: ethers.Contract;

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0);

async function setupContracts() {
  let networkId;

  networkId = (await provider.getNetwork()).chainId;
  const contractAddress = optimizedForceMoveArtifact.networks[networkId].address;
  optimizedForceMove = new ethers.Contract(
    contractAddress,
    optimizedForceMoveArtifact.abi,
    signer0,
  );
}

describe('ForceMove methods', () => {
  beforeAll(async () => {
    await setupContracts();
  });
});

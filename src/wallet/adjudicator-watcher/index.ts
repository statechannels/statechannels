import { config as dotenvConfig } from 'dotenv';
import { nitroAdjudicator } from './../utilities/blockchain';
import * as dotenvExpand from 'dotenv-expand';
import { ethers } from 'ethers';
import * as NitroAdjudicatorArtifact from '../../contracts/prebuilt_contracts/NitroAdjudicator.json';

// todo: how is a sample event generated?

async function start() {
  console.log('Starting chain watcher');
  // todo: do not hardcode the contract address
  // const adjudicator: ethers.Contract = await nitroAdjudicator();
  const adjudicator = new ethers.Contract(
    '0x8726C7414ac023D23348326B47AF3205185Fd035',
    NitroAdjudicatorArtifact.abi,
    new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`),
  );
  const depositedFilter = adjudicator.filters.Deposited();
  adjudicator.on(depositedFilter, (channelId, amountDeposited, destinationHoldings) => {
    // todo: update the database
    console.log(`Deposit detected  with ${amountDeposited} ${destinationHoldings} ${channelId}`);
  });

  console.log('Adding challenge watcher');
  const challengeCreatedFilter = adjudicator.filters.ChallengeCreated();
  adjudicator.on(challengeCreatedFilter, (channelId, commitment, finalizedAt) => {
    console.log(`Deposit detected  with ${channelId} ${commitment} ${finalizedAt}`);
  });
}

dotenvExpand(dotenvConfig());
start();

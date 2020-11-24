import fs from 'fs';

import {
  Contract,
  ethers,
  BigNumberish,
  BigNumber,
  constants,
  providers,
  utils,
  Event,
} from 'ethers';

import {ChallengeClearedEvent, ChallengeRegisteredStruct} from '../src/contract/challenge';
import {Bytes} from '../src/contract/types';
import {channelDataToChannelStorageHash} from '../src/contract/channel-storage';
import {
  AllocationAssetOutcome,
  encodeAllocation,
  encodeGuarantee,
  Guarantee,
  hashAssetOutcome,
  Outcome,
  Allocation,
  AllocationItem,
} from '../src/contract/outcome';
import {AssetTransferredEvent, Bytes32, DepositedEvent} from '../src';

// Interfaces

// E.g. {ALICE:2, BOB:3}
export interface AssetOutcomeShortHand {
  [destination: string]: BigNumberish;
}

// E.g. {ETH: {ALICE:2, BOB:3}, DAI: {ALICE:1, BOB:4}}
export interface OutcomeShortHand {
  [assetHolder: string]: AssetOutcomeShortHand;
}

export interface AddressesLookup {
  [shorthand: string]: string | undefined;
}

// Functions
export const getTestProvider = (): ethers.providers.JsonRpcProvider => {
  if (!process.env.GANACHE_PORT) {
    throw new Error('Missing environment variable GANACHE_PORT required');
  }
  return new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);
};

export async function setupContracts(
  provider: ethers.providers.JsonRpcProvider,
  artifact: {abi: ethers.ContractInterface},
  address: string
): Promise<ethers.Contract> {
  const signer = provider.getSigner(0);
  // TODO: We should be use the address env variables instead of the address on the artifact
  const contract = new ethers.Contract(address, artifact.abi, signer);
  return contract;
}

export function getPlaceHolderContractAddress(): string {
  return process.env.COUNTING_APP_ADDRESS;
}

export const nonParticipant = ethers.Wallet.createRandom();

export const clearedChallengeHash = (turnNumRecord = 5): Bytes32 =>
  channelDataToChannelStorageHash({
    turnNumRecord,
    finalizesAt: 0,
  });

export const ongoingChallengeHash = (turnNumRecord = 5): Bytes32 =>
  channelDataToChannelStorageHash({
    turnNumRecord,
    finalizesAt: 1e12,
    challengerAddress: constants.AddressZero,
    outcome: [],
  });

export const finalizedOutcomeHash = (
  turnNumRecord = 5,
  finalizesAt = 1,
  outcome: Outcome = [],
  state = undefined,
  challengerAddress = undefined
): Bytes32 =>
  channelDataToChannelStorageHash({
    turnNumRecord,
    finalizesAt,
    outcome,
    state,
    challengerAddress,
  });

export const newChallengeRegisteredEvent = (
  contract: ethers.Contract,
  channelId: string
): Promise<ChallengeRegisteredStruct[keyof ChallengeRegisteredStruct]> => {
  const filter = contract.filters.ChallengeRegistered(channelId);
  return new Promise((resolve, reject) => {
    contract.on(
      filter,
      (
        eventChannelIdArg,
        eventTurnNumRecordArg,
        eventFinalizesAtArg,
        eventChallengerArg,
        eventIsFinalArg,
        eventFixedPartArg,
        eventChallengeVariablePartArg,
        event
      ) => {
        contract.removeAllListeners(filter);
        resolve([
          eventChannelIdArg,
          eventTurnNumRecordArg,
          eventFinalizesAtArg,
          eventChallengerArg,
          eventIsFinalArg,
          eventFixedPartArg,
          eventChallengeVariablePartArg,
        ]);
      }
    );
  });
};

export const newChallengeClearedEvent = (
  contract: ethers.Contract,
  channelId: string
): Promise<ChallengeClearedEvent[keyof ChallengeClearedEvent]> => {
  const filter = contract.filters.ChallengeCleared(channelId);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventChannelId, eventTurnNumRecord, event) => {
      // Match event for this channel only
      contract.removeAllListeners(filter);
      resolve([eventChannelId, eventTurnNumRecord]);
    });
  });
};

export const newConcludedEvent = (
  contract: ethers.Contract,
  channelId: string
): Promise<[Bytes32]> => {
  const filter = contract.filters.Concluded(channelId);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventChannelId, event) => {
      // Match event for this channel only
      contract.removeAllListeners(filter);
      resolve([channelId]);
    });
  });
};

export const newDepositedEvent = (
  contract: ethers.Contract,
  destination: string
): Promise<[string, BigNumber, BigNumber]> => {
  const filter = contract.filters.Deposited(destination);
  return new Promise((resolve, reject) => {
    contract.on(
      filter,
      (eventDestination: string, amountDeposited: BigNumber, amountHeld: BigNumber, event) => {
        // Match event for this destination only
        contract.removeAllListeners(filter);
        resolve([eventDestination, amountDeposited, amountHeld]);
      }
    );
  });
};

export const newTransferEvent = (
  contract: ethers.Contract,
  to: string
): Promise<AssetTransferredEvent[keyof AssetTransferredEvent]> => {
  const filter = contract.filters.Transfer(null, to);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventFrom, eventTo, amountTransferred, event) => {
      // Match event for this destination only
      contract.removeAllListeners(filter);
      resolve(amountTransferred);
    });
  });
};

export const newAssetTransferredEvent = (
  destination: string,
  payout: number
): AssetTransferredEvent => ({
  channelId: destination,
  destination: destination.toLowerCase(),
  amount: BigNumber.from(payout),
});

export function randomChannelId(channelNonce = 0): Bytes32 {
  // Populate participants array (every test run targets a unique channel)
  const participants = [];
  for (let i = 0; i < 3; i++) {
    participants[i] = ethers.Wallet.createRandom().address;
  }
  // Compute channelId
  const channelId = utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['uint256', 'address[]', 'uint256'],
      [1234, participants, channelNonce]
    )
  );
  return channelId;
}

export const randomExternalDestination = (): string =>
  '0x' +
  ethers.Wallet.createRandom()
    .address.slice(2, 42)
    .padStart(64, '0')
    .toLowerCase();

export async function sendTransaction(
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  transaction: providers.TransactionRequest
): Promise<providers.TransactionReceipt> {
  const signer = provider.getSigner();
  const response = await signer.sendTransaction({to: contractAddress, ...transaction});
  return await response.wait();
}

export function allocationToParams(allocation: AllocationItem[]): [Bytes, Bytes32] {
  const allocationBytes = encodeAllocation(allocation);
  let assetOutcomeHash;
  if (allocation.length === 0) {
    assetOutcomeHash = constants.HashZero;
  } else {
    assetOutcomeHash = hashAssetOutcome(allocation);
  }
  return [allocationBytes, assetOutcomeHash];
}

export function guaranteeToParams(guarantee: Guarantee): [Bytes, Bytes32] {
  const guaranteeBytes = encodeGuarantee(guarantee);

  const assetOutcomeHash = hashAssetOutcome(guarantee);
  return [guaranteeBytes, assetOutcomeHash];
}

// Recursively replaces any key with the value of that key in the addresses object
// BigNumberify all numbers
export function replaceAddressesAndBigNumberify(
  object: AssetOutcomeShortHand | OutcomeShortHand | string,
  addresses: AddressesLookup
): AssetOutcomeShortHand | OutcomeShortHand | string {
  const newObject = {};
  Object.keys(object).forEach(key => {
    if (typeof object[key] === 'object') {
      // Recurse
      newObject[addresses[key]] = replaceAddressesAndBigNumberify(object[key], addresses);
    }
    if (typeof object[key] === 'number') {
      newObject[addresses[key]] = BigNumber.from(object[key]);
    }
  });
  return newObject;
}

// Sets the holdings defined in the multipleHoldings object. Requires an array of the relevant contracts to be passed in.
export function resetMultipleHoldings(
  multipleHoldings: OutcomeShortHand,
  contractsArray: Contract[]
): void {
  Object.keys(multipleHoldings).forEach(assetHolder => {
    const holdings = multipleHoldings[assetHolder];
    Object.keys(holdings).forEach(async destination => {
      const amount = holdings[destination];
      contractsArray.forEach(async contract => {
        if (contract.address === assetHolder) {
          await (await contract.setHoldings(destination, amount)).wait();
          expect((await contract.holdings(destination)).eq(amount)).toBe(true);
        }
      });
    });
  });
}

// Check the holdings defined in the multipleHoldings object. Requires an array of the relevant contracts to be passed in.
export function checkMultipleHoldings(
  multipleHoldings: OutcomeShortHand,
  contractsArray: Contract[]
): void {
  Object.keys(multipleHoldings).forEach(assetHolder => {
    const holdings = multipleHoldings[assetHolder];
    Object.keys(holdings).forEach(async destination => {
      const amount = holdings[destination];
      contractsArray.forEach(async contract => {
        if (contract.address === assetHolder) {
          expect((await contract.holdings(destination)).eq(amount)).toBe(true);
        }
      });
    });
  });
}

// Check the assetOutcomeHash on multiple asset Hoders defined in the multipleHoldings object. Requires an array of the relevant contracts to be passed in.
export function checkMultipleAssetOutcomeHashes(
  channelId: string,
  outcome: OutcomeShortHand,
  contractsArray: Contract[]
): void {
  Object.keys(outcome).forEach(assetHolder => {
    const assetOutcome = outcome[assetHolder];
    const allocationAfter = [];
    Object.keys(assetOutcome).forEach(destination => {
      const amount = assetOutcome[destination];
      allocationAfter.push({destination, amount});
    });
    const [, expectedNewAssetOutcomeHash] = allocationToParams(allocationAfter);
    contractsArray.forEach(async contract => {
      if (contract.address === assetHolder) {
        expect(await contract.assetOutcomeHashes(channelId)).toEqual(expectedNewAssetOutcomeHash);
      }
    });
  });
}

// Computes an outcome from a shorthand description
export function computeOutcome(outcomeShortHand: OutcomeShortHand): AllocationAssetOutcome[] {
  const outcome: AllocationAssetOutcome[] = [];
  Object.keys(outcomeShortHand).forEach(assetHolder => {
    const allocation: Allocation = [];
    Object.keys(outcomeShortHand[assetHolder]).forEach(destination =>
      allocation.push({
        destination,
        amount: BigNumber.from(outcomeShortHand[assetHolder][destination]).toHexString(),
      })
    );
    const assetOutcome: AllocationAssetOutcome = {
      assetHolderAddress: assetHolder,
      allocationItems: allocation,
    }; // TODO handle gurantee outcomes
    outcome.push(assetOutcome);
  });
  return outcome;
}

export function assetTransferredEventsFromPayouts(
  channelId: string,
  singleAssetPayouts: AssetOutcomeShortHand,
  assetHolder: string
): AssetTransferredEvent[] {
  const assetTransferredEvents = [];
  Object.keys(singleAssetPayouts).forEach(destination => {
    if (singleAssetPayouts[destination] && BigNumber.from(singleAssetPayouts[destination]).gt(0)) {
      assetTransferredEvents.push({
        contract: assetHolder,
        name: 'AssetTransferred',
        args: {channelId, destination, amount: singleAssetPayouts[destination]},
      });
    }
  });
  return assetTransferredEvents;
}

export function compileEventsFromLogs(logs: any[], contractsArray: Contract[]): Event[] {
  const events = [];
  logs.forEach(log => {
    contractsArray.forEach(contract => {
      if (log.address === contract.address) {
        events.push({...contract.interface.parseLog(log), contract: log.address});
      }
    });
  });
  return events;
}

export async function writeGasConsumption(
  filename: string,
  description: string,
  gas: BigNumberish
): Promise<void> {
  const dir = './gas-artifacts';

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const path = dir + '/' + filename;
  await fs.appendFile(path, description + ':\n' + gas.toString() + ' gas\n\n', err => {
    if (err) throw err;
  });
}

export function getRandomNonce(seed: string): number {
  return Number.parseInt(ethers.utils.id(seed).slice(2, 11), 16);
}

import {ethers, Contract} from "ethers";
import {getChannelId as nitroGetChannelId} from "@statechannels/nitro-protocol";
import SagaTester from "redux-saga-tester";
import {DepositedEvent} from "../redux/actions";
import {adjudicatorWatcher} from "../redux/sagas/adjudicator-watcher";
import {ETHAssetHolderWatcher} from "../redux/sagas/eth-asset-holder-watcher";
import {depositContract, createWatcherState, concludeGame, fiveFive} from "./test-utils";
import {getGanacheProvider} from "@statechannels/devtools";
import {bigNumberify} from "ethers/utils";
import {nitroGetData} from "../utils/transaction-generator";
import {convertAllocationToOutcome, convertAddressToBytes32} from "../utils/nitro-converter";
import {HashZero, AddressZero} from "ethers/constants";
import {encodeOutcome, encodeAllocation} from "@statechannels/nitro-protocol/src/contract/outcome";
import {
  getAdjudicatorInterface,
  getAdjudicatorContractAddress,
  getETHAssetHolderInterface,
  getETHAssetHolderAddress
} from "../utils/contract-utils";
import {JsonRpcProvider} from "ethers/providers";
jest.setTimeout(60000);

describe.only("ETHAssetHolder listener", () => {
  const provider: ethers.providers.JsonRpcProvider = getGanacheProvider();

  const participantA = ethers.Wallet.createRandom();
  const participantB = ethers.Wallet.createRandom();
  let nonce = 5;

  function getNextNonce() {
    return ++nonce;
  }

  it.skip("should handle a Deposited event", async () => {
    const channelId = nitroGetChannelId({
      chainId: (await provider.getNetwork()).chainId.toString(),
      channelNonce: getNextNonce().toString(),
      participants: [participantA.address, participantB.address]
    });

    const processId = ethers.Wallet.createRandom().address;

    const sagaTester = new SagaTester({initialState: createWatcherState(processId)});
    sagaTester.start(ETHAssetHolderWatcher, provider);

    const depositAmount = bigNumberify("0x05");
    await depositContract(provider, channelId, depositAmount.toHexString());

    await sagaTester.waitFor("WALLET.ASSET_HOLDER.DEPOSITED");

    const action: DepositedEvent = sagaTester.getLatestCalledAction();
    expect(action.destination).toEqual(channelId);
    expect(action.amountDeposited).toEqual(depositAmount);
    expect(action.destinationHoldings).toEqual(depositAmount);
  });

  it("should handle an AssetTransferred event", async () => {
    const channelNonce = getNextNonce();
    const chainId = (await provider.getNetwork()).chainId.toString();
    const channelId = nitroGetChannelId({
      chainId,
      channelNonce: channelNonce.toString(),
      participants: [participantA.address, participantB.address]
    });

    // TODO: this 0x05 is hardcoded as it's the same value being used for
    // constructing the commitments for the `conclude` call. Refactor this
    // to not be hardcoded
    const depositAmount = bigNumberify("0x05");
    // deposit twice so that 0x05 can be transferred to each participant
    await depositContract(provider, channelId, depositAmount.mul(2).toHexString());

    await finalizeChannel(channelId, channelNonce, provider, participantA, participantB);

    const {turnNumRecord, finalizesAt} = await getOnChainChannelStorage(provider, channelId);
    // This is the outcome that gets used to set the outcomeHash on the adjudicator
    // and is copied from the state that gets used from the commitment
    // construction referred to above. This will also be refactored as part of the
    // TODO above.

    const outcome = convertAllocationToOutcome({
      allocation: fiveFive,
      destination: [participantA.address, participantB.address]
    });

    // For transferring assets, the channel needs to be finalized and the channel
    // storage hash is compared with the `transferAll` arguments. The channel
    // storage hash is mostly nullified upon a `conclude` call (except for the
    // `outcomeHash`, which is used to distribute funds) hence the arguments
    // being passed below.
    const stateHash = HashZero;
    const outcomeBytes = encodeOutcome(outcome);
    const challengerAddress = AddressZero;

    await pushOutcome(channelId, turnNumRecord, finalizesAt, stateHash, challengerAddress, outcomeBytes, provider);

    const allocation = [
      {
        destination: convertAddressToBytes32(participantA.address),
        amount: fiveFive[0]
      },
      {
        destination: convertAddressToBytes32(participantB.address),
        amount: fiveFive[1]
      }
    ];

    const processId = ethers.Wallet.createRandom().address;
    const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});
    sagaTester.start(ETHAssetHolderWatcher, provider);

    await transferAll(channelId, encodeAllocation(allocation), provider);

    // await sagaTester.waitFor("WALLET.ASSET_HOLDER.ASSET_TRANSFERRED");
  });
});

async function finalizeChannel(
  channelId: string,
  channelNonce: number,
  provider,
  participantA: ethers.Wallet,
  participantB: ethers.Wallet
) {
  const processId = ethers.Wallet.createRandom().address;
  const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});
  sagaTester.start(adjudicatorWatcher, provider);

  await concludeGame(provider, channelNonce, participantA, participantB);
  await sagaTester.waitFor("WALLET.ADJUDICATOR.CONCLUDED_EVENT");
}

async function getOnChainChannelStorage(
  provider,
  channelId: string
): Promise<{turnNumRecord: number; finalizesAt: number}> {
  const {turnNumRecord, finalizesAt} = await nitroGetData(provider, channelId);
  return {turnNumRecord, finalizesAt};
}

async function pushOutcome(
  channelId: string,
  turnNumRecord: number,
  finalizesAt: number,
  stateHash: string,
  challengerAddress: string,
  outcomeBytes: string,
  provider: JsonRpcProvider
): Promise<void> {
  const adjudicatorInterface = getAdjudicatorInterface();
  const adjudicatorAddress = getAdjudicatorContractAddress();
  const nitroAdjudicator = new Contract(adjudicatorAddress, adjudicatorInterface, await provider.getSigner());

  await nitroAdjudicator.functions.pushOutcome(
    channelId,
    turnNumRecord,
    finalizesAt,
    stateHash,
    challengerAddress,
    outcomeBytes
  );
}

async function transferAll(channelId: string, allocation: string, provider: JsonRpcProvider) {
  const assetHolderInterface = getETHAssetHolderInterface();
  const assetHolderAddress = getETHAssetHolderAddress();
  const assetHolder = new Contract(assetHolderAddress, assetHolderInterface, await provider.getSigner());

  const tx = assetHolder.functions.transferAll(channelId, allocation);
  const {events} = await (await tx).wait();

  events.forEach(async ({event, args}) => {
    console.log(JSON.stringify(args, undefined, 4));
  });
}

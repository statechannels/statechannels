import {ethers, Contract, Signer} from "ethers";
import {
  encodeAllocation,
  encodeOutcome,
  getChannelId as nitroGetChannelId,
  Transactions as nitroTrans
} from "@statechannels/nitro-protocol";
import SagaTester from "redux-saga-tester";

import {getGanacheProvider} from "@statechannels/devtools";
import {bigNumberify} from "ethers/utils";
import {HashZero, AddressZero} from "ethers/constants";

import {assetHoldersWatcher} from "../redux/sagas/asset-holder-watcher";
import {adjudicatorWatcher} from "../redux/sagas/adjudicator-watcher";
import {DepositedEvent} from "../redux/actions";
import {
  getAdjudicatorInterface,
  getAdjudicatorContractAddress,
  getETHAssetHolderInterface,
  getETHAssetHolderAddress
} from "../utils/contract-utils";

import {getAllocationOutcome} from "../utils/outcome-utils";
import {convertBalanceToOutcome} from "../redux/__tests__/state-helpers";

import {depositIntoETHAssetHolder, createWatcherState, concludeGame, fiveFive} from "./test-utils";
jest.setTimeout(60000);

describe("ETHAssetHolder listener", () => {
  const provider = getGanacheProvider();
  const signer = provider.getSigner();

  const participantA = ethers.Wallet.createRandom();
  const participantB = ethers.Wallet.createRandom();
  let nonce = 5;

  function getNextNonce() {
    return ++nonce;
  }

  it("should handle a Deposited event", async () => {
    const channelId = nitroGetChannelId({
      chainId: (await provider.getNetwork()).chainId.toString(),
      channelNonce: getNextNonce().toString(),
      participants: [participantA.address, participantB.address]
    });

    const processId = ethers.Wallet.createRandom().address;

    const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});
    sagaTester.start(assetHoldersWatcher, provider);

    const depositAmount = bigNumberify("0x05");

    await depositIntoETHAssetHolder(signer, channelId, depositAmount.toHexString());

    await sagaTester.waitFor("WALLET.ASSET_HOLDER.DEPOSITED");

    const action = sagaTester.getLatestCalledAction() as DepositedEvent;

    expect(action.assetHolderAddress).toEqual(getETHAssetHolderAddress());
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
    // constructing the states for the `conclude` call. Refactor this
    // to not be hardcoded
    const depositAmount = bigNumberify("0x05");
    // deposit double so that 0x05 can be transferred to each participant
    await depositIntoETHAssetHolder(signer, channelId, depositAmount.mul(2).toHexString());

    await finalizeChannel(channelId, channelNonce, signer, participantA, participantB);

    const {turnNumRecord, finalizesAt} = await getOnChainChannelStorage(provider, channelId);
    // This is the outcome that gets used to set the outcomeHash on the adjudicator
    // and is copied from the state that gets used from the state
    // construction referred to above. This will also be refactored as part of the
    // TODO above.

    const outcome = convertBalanceToOutcome(fiveFive(participantA.address, participantB.address));

    // For transferring assets, the channel needs to be finalized and the channel
    // storage hash is compared with the `transferAll` arguments. The channel
    // storage hash is mostly nullified upon a `conclude` call (except for the
    // `outcomeHash`, which is used to distribute funds) hence the arguments
    // being passed below.
    const stateHash = HashZero;
    const outcomeBytes = encodeOutcome(outcome);
    const challengerAddress = AddressZero;

    await pushOutcome(
      channelId,
      turnNumRecord,
      finalizesAt,
      stateHash,
      challengerAddress,
      outcomeBytes,
      signer
    );

    const allocation = getAllocationOutcome(outcome).allocationItems;
    const processId = ethers.Wallet.createRandom().address;
    const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});
    sagaTester.start(assetHoldersWatcher, provider);

    await transferAll(channelId, encodeAllocation(allocation), signer);

    await sagaTester.waitFor("WALLET.ASSET_HOLDER.ASSET_TRANSFERRED");
  });
});

async function finalizeChannel(
  channelId: string,
  channelNonce: number,
  signer: Signer,
  participantA: ethers.Wallet,
  participantB: ethers.Wallet
) {
  const processId = ethers.Wallet.createRandom().address;
  const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});
  sagaTester.start(adjudicatorWatcher, signer);

  await concludeGame(signer, channelNonce, participantA, participantB);
  await sagaTester.waitFor("WALLET.ADJUDICATOR.CONCLUDED_EVENT");
}

async function getOnChainChannelStorage(
  provider,
  channelId: string
): Promise<{turnNumRecord: number; finalizesAt: number}> {
  const {turnNumRecord, finalizesAt} = await nitroTrans.getData(
    provider,
    getAdjudicatorContractAddress(),
    channelId
  );
  return {turnNumRecord, finalizesAt};
}

async function pushOutcome(
  channelId: string,
  turnNumRecord: number,
  finalizesAt: number,
  stateHash: string,
  challengerAddress: string,
  outcomeBytes: string,
  signer: Signer
): Promise<void> {
  const adjudicatorInterface = getAdjudicatorInterface();
  const adjudicatorAddress = getAdjudicatorContractAddress();
  const nitroAdjudicator = new Contract(adjudicatorAddress, adjudicatorInterface, signer);

  await nitroAdjudicator.functions.pushOutcome(
    channelId,
    turnNumRecord,
    finalizesAt,
    stateHash,
    challengerAddress,
    outcomeBytes
  );
}

async function transferAll(channelId: string, allocation: string, signer: Signer) {
  const assetHolderInterface = getETHAssetHolderInterface();
  const assetHolderAddress = getETHAssetHolderAddress();
  const assetHolder = new Contract(assetHolderAddress, assetHolderInterface, signer);

  assetHolder.functions.transferAll(channelId, allocation, {gasLimit: 3e6});
}

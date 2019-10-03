import {ethers} from "ethers";
import {getChannelId as nitroGetChannelId} from "@statechannels/nitro-protocol";
import SagaTester from "redux-saga-tester";
import {DepositedEvent} from "../redux/actions";
import {adjudicatorWatcher} from "../redux/sagas/adjudicator-watcher";
import {ETHAssetHolderWatcher} from "../redux/sagas/eth-asset-holder-watcher";
import {depositContract, createWatcherState, concludeGame} from "./test-utils";
import {getGanacheProvider} from "@statechannels/devtools";
import {bigNumberify} from "ethers/utils";
jest.setTimeout(60000);

describe("ETHAssetHolder listener", () => {
  const provider: ethers.providers.JsonRpcProvider = getGanacheProvider();

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
    const channelId = nitroGetChannelId({
      chainId: (await provider.getNetwork()).chainId.toString(),
      channelNonce: channelNonce.toString(),
      participants: [participantA.address, participantB.address]
    });

    const depositAmount = bigNumberify("0x05");
    await depositContract(provider, channelId, depositAmount.toHexString());

    await finalizeChannel(channelId, channelNonce, provider, participantA, participantB);

    // TODO: push outcome (indicating the appropriate allocation) for the
    // channel on the adjudicator
    // then make transferAll call on the AssetHolder
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

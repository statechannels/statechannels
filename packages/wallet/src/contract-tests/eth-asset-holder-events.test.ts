import {ethers} from "ethers";
import {getChannelId as nitroGetChannelId} from "@statechannels/nitro-protocol";
import SagaTester from "redux-saga-tester";
import {DepositedEvent} from "../redux/actions";
import {ETHAssetHolderWatcher} from "../redux/sagas/eth-asset-holder-watcher";
import {depositContract, createWatcherState} from "./test-utils";
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
});

import {ethers} from "ethers";

import {createChallenge, concludeGame, fiveFive} from "./test-utils";
import {
  createForceMoveTransaction,
  createDepositTransaction,
  createRespondTransaction,
  createRefuteTransaction,
  createConcludeTransaction,
  createWithdrawTransaction,
  ConcludeAndWithdrawArgs,
  createConcludeAndWithdrawTransaction,
  createTransferAndWithdrawTransaction
} from "../utils/transaction-generator";

import {depositContract} from "./test-utils";
import {getGanacheProvider} from "@statechannels/devtools";
import {transactionSender} from "../redux/sagas/transaction-sender";
import {testSaga} from "redux-saga-test-plan";
import {getProvider, getLibraryAddress} from "../utils/contract-utils";
import {transactionSent, transactionSubmitted, transactionConfirmed} from "../redux/actions";
import {
  ADJUDICATOR_ADDRESS,
  ETH_ASSET_HOLDER_ADDRESS,
  NETWORK_ID,
  CHALLENGE_DURATION
} from "../constants";
import {State, Channel, getChannelId} from "@statechannels/nitro-protocol";
import {bigNumberify} from "ethers/utils";
import {convertBalanceToOutcome} from "../redux/__tests__/state-helpers";
import {Signatures} from "@statechannels/nitro-protocol";

jest.setTimeout(90000);

describe("transactions", () => {
  let networkId;
  let libraryAddress;
  let nonce = 5;
  let participantA = ethers.Wallet.createRandom();
  let participantB = ethers.Wallet.createRandom();

  const provider: ethers.providers.JsonRpcProvider = getGanacheProvider();
  const signer = provider.getSigner();

  function getNextNonce() {
    return bigNumberify(++nonce).toHexString();
  }

  async function testTransactionSender(transactionToSend) {
    const processId = "processId";
    const queuedTransaction = {transactionRequest: transactionToSend, processId};
    const transactionPayload = {
      to: ADJUDICATOR_ADDRESS,
      ...queuedTransaction.transactionRequest
    };

    // TODO: Currently we're actually attempting to send the transactions
    // but we could probably do that in nitro-protocol package instead
    const transactionResult = await signer.sendTransaction(transactionPayload);
    const confirmedTransaction = await transactionResult.wait();
    // TODO: Redux saga test plan is complaining about the typing on transactionSender
    testSaga(transactionSender as any, queuedTransaction)
      .next()
      .call(getProvider)
      .next(provider)
      .call([provider, provider.getSigner])
      .next(signer)
      .put(transactionSent({processId}))
      .next()
      .call([signer, signer.sendTransaction], transactionPayload)
      .next(transactionResult)
      .put(transactionSubmitted({processId, transactionHash: transactionResult.hash || ""}))
      .next(transactionResult)
      .call([transactionResult, transactionResult.wait])
      .next(confirmedTransaction)
      .put(
        transactionConfirmed({
          processId,
          contractAddress: confirmedTransaction.contractAddress
        })
      )
      .next()
      .isDone();
  }

  beforeAll(async () => {
    const network = await provider.getNetwork();
    networkId = network.chainId;
    libraryAddress = await getLibraryAddress(networkId, "TrivialApp");
  });

  beforeEach(() => {
    participantA = ethers.Wallet.createRandom();
    participantB = ethers.Wallet.createRandom();
  });

  it("should deposit into the contract", async () => {
    const someChannelId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const depositTransactionData = createDepositTransaction(someChannelId, "0x5", "0x0");
    await testTransactionSender({
      ...depositTransactionData,
      to: ETH_ASSET_HOLDER_ADDRESS,
      value: 5
    });
  });

  it("should send a forceMove transaction", async () => {
    const channel: Channel = {
      channelNonce: getNextNonce(),
      chainId: bigNumberify(NETWORK_ID).toHexString(),
      participants: [participantA.address, participantB.address]
    };

    const fromState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 4,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: false,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const toState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 5,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: false,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const forceMoveTransaction = createForceMoveTransaction(
      Signatures.signState(fromState, participantA.privateKey),
      Signatures.signState(toState, participantB.privateKey),
      participantB.privateKey
    );

    await testTransactionSender(forceMoveTransaction);
  });

  it("should send a respondWithMove transaction", async () => {
    const channelNonce = getNextNonce();
    const channel: Channel = {
      channelNonce,
      chainId: bigNumberify(NETWORK_ID).toHexString(),
      participants: [participantA.address, participantB.address]
    };

    await createChallenge(provider, channelNonce, participantA, participantB);

    // NOTE: Copied from createChallenge
    const fromState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 7,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: false,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const toState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 8,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: false,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const respondWithMoveTransaction = createRespondTransaction(
      fromState,
      Signatures.signState(toState, participantA.privateKey)
    );

    await testTransactionSender(respondWithMoveTransaction);
  });

  it("should send a refute transaction", async () => {
    const channelNonce = getNextNonce();
    const channel: Channel = {
      channelNonce,
      chainId: bigNumberify(NETWORK_ID).toHexString(),
      participants: [participantA.address, participantB.address]
    };

    await createChallenge(provider, channelNonce, participantA, participantB);
    const fromState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 8,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: false,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const toState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 9,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: false,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const fromSignedState = Signatures.signState(fromState, participantA.privateKey);
    const toSignedState = Signatures.signState(toState, participantB.privateKey);

    const refuteTransaction = createRefuteTransaction([fromSignedState, toSignedState]);

    await testTransactionSender(refuteTransaction);
  });

  it("should send a conclude transaction", async () => {
    const channelNonce = getNextNonce();
    const channel: Channel = {
      channelNonce,
      chainId: bigNumberify(NETWORK_ID).toHexString(),
      participants: [participantA.address, participantB.address]
    };

    const fromState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 4,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: true,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const toState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 5,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: true,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const signedFromState = Signatures.signState(fromState, participantA.privateKey);
    const signedToState = Signatures.signState(toState, participantB.privateKey);

    const concludeTransaction = createConcludeTransaction(signedFromState, signedToState);
    await testTransactionSender(concludeTransaction);
  });

  it.skip("should send a transferAndWithdraw transaction", async () => {
    const channelNonce = getNextNonce();
    const channel: Channel = {
      channelNonce,
      chainId: bigNumberify(NETWORK_ID).toHexString(),
      participants: [participantA.address, participantB.address]
    };
    const channelId = getChannelId(channel);

    await depositContract(provider, channelId);
    await depositContract(provider, channelId);
    await concludeGame(provider, channel.channelNonce, participantA, participantB);

    const verificationSignature = "0x0";
    const transferAndWithdraw = createTransferAndWithdrawTransaction(
      channelId,
      participantA.address,
      participantA.address,
      "0x01",
      verificationSignature
    );
    await testTransactionSender(transferAndWithdraw);
  });

  it.skip("should send a conclude and withdraw transaction", async () => {
    const channelNonce = getNextNonce();
    const channel: Channel = {
      channelNonce,
      chainId: bigNumberify(NETWORK_ID).toHexString(),
      participants: [participantA.address, participantB.address]
    };
    const channelId = getChannelId(channel);
    await depositContract(provider, channelId);

    const verificationSignature = "0x0";
    const fromState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 5,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: true,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const toState: State = {
      channel,
      appDefinition: libraryAddress,
      turnNum: 6,
      outcome: convertBalanceToOutcome(fiveFive(participantA.address, participantB.address)),
      isFinal: true,
      challengeDuration: CHALLENGE_DURATION,
      appData: "0x00"
    };

    const fromSignedState = Signatures.signState(fromState, participantA.privateKey);
    const toSignedState = Signatures.signState(toState, participantB.privateKey);

    const args: ConcludeAndWithdrawArgs = {
      fromSignedState,
      toSignedState,
      verificationSignature,
      participant: participantA.address,
      destination: participantA.address,
      amount: "0x05"
    };
    const concludeAndWithdrawTransaction = createConcludeAndWithdrawTransaction(args);
    await testTransactionSender(concludeAndWithdrawTransaction);
  });
});

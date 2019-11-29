import {ethers} from "ethers";

import {createChallenge, fiveFive} from "./test-utils";
import {
  createForceMoveTransaction,
  createETHDepositTransaction,
  createRespondTransaction,
  createRefuteTransaction,
  createConcludeTransaction,
  ConcludePushOutcomeAndTransferAllArgs,
  createConcludePushOutcomeAndTransferAllTransaction
} from "../utils/transaction-generator";

import {depositIntoETHAssetHolder} from "./test-utils";
import {getGanacheProvider} from "@statechannels/devtools";
import {transactionSender} from "../redux/sagas/transaction-sender";
import {testSaga} from "redux-saga-test-plan";
import {getProvider, getContractAddress} from "../utils/contract-utils";
import {transactionSent, transactionSubmitted, transactionConfirmed} from "../redux/actions";
import {NETWORK_ID, CHALLENGE_DURATION} from "../constants";
import {State, Channel, getChannelId} from "@statechannels/nitro-protocol";
import {bigNumberify} from "ethers/utils";
import {convertBalanceToOutcome} from "../redux/__tests__/state-helpers";
import {Signatures} from "@statechannels/nitro-protocol";
import {TransactionRequestWithTarget} from "../redux/outbox/state";

jest.setTimeout(90000);

describe("transactions", () => {
  let libraryAddress;
  let nonce = 5;
  let participantA = ethers.Wallet.createRandom();
  let participantB = ethers.Wallet.createRandom();

  const provider: ethers.providers.JsonRpcProvider = getGanacheProvider();
  const signer = provider.getSigner();

  function getNextNonce() {
    return bigNumberify(++nonce).toHexString();
  }

  async function testTransactionSender(transactionToSend: TransactionRequestWithTarget) {
    const processId = "processId";
    const queuedTransaction = {transactionRequest: transactionToSend, processId};

    // TODO: Currently we're actually attempting to send the transactions
    // but we could probably do that in nitro-protocol package instead
    const transactionResult = await signer.sendTransaction(queuedTransaction.transactionRequest);
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
      .call([signer, signer.sendTransaction], queuedTransaction.transactionRequest)
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
    libraryAddress = getContractAddress("TrivialApp");
  });

  beforeEach(() => {
    participantA = ethers.Wallet.createRandom();
    participantB = ethers.Wallet.createRandom();
  });

  it("should deposit ETH into the ETH asset holder", async () => {
    const someChannelId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const depositTransactionData = createETHDepositTransaction(someChannelId, "0x5", "0x0");
    await testTransactionSender({
      ...depositTransactionData,

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

  it("should send a conclude, push outcome, and transfer all transaction", async () => {
    const channelNonce = getNextNonce();
    const channel: Channel = {
      channelNonce,
      chainId: bigNumberify(NETWORK_ID).toHexString(),
      participants: [participantA.address, participantB.address]
    };
    const channelId = getChannelId(channel);
    await depositIntoETHAssetHolder(provider, channelId);

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

    const fromSignedState = Signatures.signState(fromState, participantA.privateKey);
    const toSignedState = Signatures.signState(toState, participantB.privateKey);

    const args: ConcludePushOutcomeAndTransferAllArgs = {
      fromSignedState,
      toSignedState
    };
    const tx = createConcludePushOutcomeAndTransferAllTransaction(args);
    await testTransactionSender(tx);
  });
});

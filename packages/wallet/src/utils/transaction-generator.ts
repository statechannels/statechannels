import {getAdjudicatorInterface} from "./contract-utils";
import {splitSignature} from "ethers/utils";
import {
  createETHDepositTransaction as createNitroETHDepositTransaction,
  createERC20DepositTransaction as createNitroERC20DepositTransaction,
  createTransferAllTransaction as createNitroTransferAllTransaction,
  Transactions as nitroTrans,
  SignedState,
  State,
  convertAddressToBytes32
} from "@statechannels/nitro-protocol";
import {Allocation, AllocationItem} from "@statechannels/nitro-protocol";
import {TransactionRequestWithTarget} from "../redux/outbox/state";
import {
  ADJUDICATOR_ADDRESS,
  ETH_ASSET_HOLDER_ADDRESS,
  ERC20_ASSET_HOLDER_ADDRESS
} from "../constants";

export function createForceMoveTransaction(
  fromState: SignedState,
  toState: SignedState,
  privateKey: string
): TransactionRequestWithTarget {
  return {
    ...nitroTrans.createForceMoveTransaction([fromState, toState], privateKey),
    to: ADJUDICATOR_ADDRESS
  };
}

export function createRespondTransaction(
  challengeState: State,
  responseSignedState: SignedState
): TransactionRequestWithTarget {
  return {
    ...nitroTrans.createRespondTransaction(challengeState, responseSignedState),
    to: ADJUDICATOR_ADDRESS
  };
}

export function createRefuteTransaction(
  seriesOfSupportiveStates: SignedState[]
): TransactionRequestWithTarget {
  return {
    ...nitroTrans.createCheckpointTransaction(seriesOfSupportiveStates),
    to: ADJUDICATOR_ADDRESS
  };
}

export interface ConcludePushOutcomeAndTransferAllArgs {
  fromSignedState: SignedState;
  toSignedState: SignedState;
}
export function createConcludePushOutcomeAndTransferAllTransaction(
  args: ConcludePushOutcomeAndTransferAllArgs
): TransactionRequestWithTarget {
  if (!args) {
    throw new Error();
  }

  return {
    ...nitroTrans.createConcludePushOutcomeAndTransferAllTransaction([
      args.fromSignedState,
      args.toSignedState
    ]),
    to: ADJUDICATOR_ADDRESS
  };
}

export function createConcludeTransaction(
  fromSignedState: SignedState,
  toSignedState: SignedState
): TransactionRequestWithTarget {
  return {
    ...nitroTrans.createConcludeTransaction([fromSignedState, toSignedState]),
    to: ADJUDICATOR_ADDRESS
  };
}

export function createWithdrawTransaction(
  amount: string,
  participant: string,
  destination: string,
  verificationSignature: string
): TransactionRequestWithTarget {
  // TODO: Implement in Nitro
  const adjudicatorInterface = getAdjudicatorInterface();
  const {v, r, s} = splitSignature(verificationSignature);
  const data = adjudicatorInterface.functions.withdraw.encode([
    participant,
    destination,
    amount,
    v,
    r,
    s
  ]);

  return {
    data,
    gasLimit: 3000000,
    to: ETH_ASSET_HOLDER_ADDRESS
  };
}

export function createETHDepositTransaction(
  destination: string,
  depositAmount: string,
  expectedHeld: string
) {
  // If a legacy fmg-core channelId
  if (destination.length === 42) {
    destination = `0x${destination.substr(2).padStart(64, "1")}`; // note we do not pad with zeros, since that would imply an external destination (which we may not deposit to)
  }
  return {
    ...createNitroETHDepositTransaction(destination, expectedHeld, depositAmount),
    to: ETH_ASSET_HOLDER_ADDRESS,
    value: depositAmount
  };
}

export function createERC20DepositTransaction(
  destination: string,
  depositAmount: string,
  expectedHeld: string
): TransactionRequestWithTarget {
  // If a legacy fmg-core channelId
  if (destination.length === 42) {
    destination = `0x${destination.substr(2).padStart(64, "1")}`; // note we do not pad with zeros, since that would imply an external destination (which we may not deposit to)
  }
  return {
    ...createNitroERC20DepositTransaction(destination, expectedHeld, depositAmount),
    to: ERC20_ASSET_HOLDER_ADDRESS
  };
}

export function createTransferAllTransaction(
  source: string,
  destination: string,
  amount: string
): TransactionRequestWithTarget {
  const allocation: Allocation = [
    {
      destination: externalizeAddress(destination),
      amount
    } as AllocationItem
  ];
  return {...createNitroTransferAllTransaction(source, allocation), to: ETH_ASSET_HOLDER_ADDRESS};
}

function externalizeAddress(address: string): string {
  return address.length !== 66 ? convertAddressToBytes32(address) : address;
}

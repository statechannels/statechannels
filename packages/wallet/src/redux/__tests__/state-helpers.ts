import {bigNumberify} from "ethers/utils";
import {
  Outcome,
  State,
  Channel,
  getChannelId,
  Signatures,
  SignedState,
  convertAddressToBytes32,
  ConsensusData,
  encodeConsensusData
} from "@statechannels/nitro-protocol";
import {NETWORK_ID, ETH_ASSET_HOLDER_ADDRESS, CONSENSUS_LIBRARY_ADDRESS} from "../../constants";
import {TwoPartyPlayerIndex, ThreePartyPlayerIndex} from "../types";
import {unreachable} from "../../utils/reducer-utils";
import {ChannelParticipant} from "../channel-store";

export const asPrivateKey = "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";
export const asAddress = "0x5409ED021D9299bf6814279A6A1411A7e866A631";
export const bsPrivateKey = "0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72";
export const bsAddress = "0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb";
export const hubPrivateKey = "0xce442e75dd539bd632aca84efa0b7de5c5b48aa4bbf028c8a6c17b2e7a16446e";
export const hubAddress = "0xAbcdE1140bA6aE8e702b78f63A4eA1D1553144a1";

export const threeParticipants: [string, string, string] = [asAddress, bsAddress, hubAddress];
export const participants: ChannelParticipant[] = [
  {signingAddress: asAddress},
  {signingAddress: bsAddress}
];

// TrivialApp.sol
export const trivialAppBytecode =
  "0x608060405234801561001057600080fd5b506102e8806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806395127f9914610030575b600080fd5b61004a60048036036100459190810190610153565b610060565b60405161005791906101f5565b60405180910390f35b600060019050949350505050565b600082601f83011261007f57600080fd5b813561009261008d8261023d565b610210565b915080825260208301602083018583830111156100ae57600080fd5b6100b983828461027f565b50505092915050565b6000604082840312156100d457600080fd5b6100de6040610210565b9050600082013567ffffffffffffffff8111156100fa57600080fd5b6101068482850161006e565b600083015250602082013567ffffffffffffffff81111561012657600080fd5b6101328482850161006e565b60208301525092915050565b60008135905061014d8161028e565b92915050565b6000806000806080858703121561016957600080fd5b600085013567ffffffffffffffff81111561018357600080fd5b61018f878288016100c2565b945050602085013567ffffffffffffffff8111156101ac57600080fd5b6101b8878288016100c2565b93505060406101c98782880161013e565b92505060606101da8782880161013e565b91505092959194509250565b6101ef81610269565b82525050565b600060208201905061020a60008301846101e6565b92915050565b6000604051905081810181811067ffffffffffffffff8211171561023357600080fd5b8060405250919050565b600067ffffffffffffffff82111561025457600080fd5b601f19601f8301169050602081019050919050565b60008115159050919050565b6000819050919050565b82818337600083830152505050565b61029781610275565b81146102a257600080fd5b5056fea365627a7a72315820caf8688ba5ffb73a0588c13ff6974f5a3ab9edeaeb4246c1b6bcbddb039edd9f6c6578706572696d656e74616cf564736f6c634300050b0040";

export const libraryAddress = CONSENSUS_LIBRARY_ADDRESS;
export const channelNonce = "0x04";
export const channel = {
  channelType: libraryAddress,
  nonce: Number.parseInt(channelNonce, 16),
  participants
};

export const nitroChannel: Channel = {
  channelNonce,
  participants: participants.map(p => p.signingAddress),
  chainId: bigNumberify(NETWORK_ID).toHexString()
};
// Use Nitro protocol channel id so we're always using the same channel Id
export const channelId = getChannelId(nitroChannel);

export function convertBalanceToOutcome(balances): Outcome {
  return [
    {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocation: balances.map(b => {
        const destination =
          b.address.length === 66 ? b.address : convertAddressToBytes32(b.address);
        return {destination, amount: b.wei};
      })
    }
  ];
}

interface Balance {
  address: string;
  wei: string;
}

export const twoThree = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()}
];
const twoThreeTwo = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()},
  {address: hubAddress, wei: bigNumberify(2).toHexString()}
];

export const addressAndPrivateKeyLookup: {
  [idx in TwoPartyPlayerIndex | ThreePartyPlayerIndex]: {address: string; privateKey: string};
} = {
  [TwoPartyPlayerIndex.A]: {address: asAddress, privateKey: asPrivateKey},
  [TwoPartyPlayerIndex.B]: {address: bsAddress, privateKey: bsPrivateKey},
  [ThreePartyPlayerIndex.A]: {address: asAddress, privateKey: asPrivateKey},
  [ThreePartyPlayerIndex.B]: {address: bsAddress, privateKey: bsPrivateKey},
  [ThreePartyPlayerIndex.Hub]: {address: hubAddress, privateKey: hubPrivateKey}
};

interface AppStateParams {
  turnNum: number;
  isFinal?: boolean;
  balances?: Balance[];
  appAttributes?: string;
}

export function appState(params: AppStateParams): SignedState {
  const turnNum = params.turnNum;
  const balances = params.balances || twoThree;
  const isFinal = params.isFinal || false;
  const appData = params.appAttributes || "0x00";
  const outcome = [
    {
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocation: balances.map(b => {
        return {destination: convertAddressToBytes32(b.address), amount: b.wei};
      })
    }
  ];
  const state: State = {
    channel: nitroChannel,
    isFinal,
    appData,
    turnNum,
    outcome,
    challengeDuration: 300,
    appDefinition: libraryAddress
  };
  const privateKey = turnNum % 2 === 0 ? asPrivateKey : bsPrivateKey;

  return Signatures.signState(state, privateKey);
}
interface LedgerStateParams {
  turnNum: number;
  isFinal?: boolean;
  balances?: Balance[];
  proposedBalances?: Balance[];
}

interface ThreeWayLedgerStateParams extends LedgerStateParams {
  isVote?: boolean;
}

const LEDGER_CHANNEL_NONCE = 0;
export const ledgerChannel = {
  nonce: LEDGER_CHANNEL_NONCE,
  channelType: CONSENSUS_LIBRARY_ADDRESS,
  participants
};

export const ledgerNitroChannel: Channel = {
  chainId: bigNumberify(NETWORK_ID).toHexString(),
  channelNonce: "0x00",
  participants: participants.map(p => p.signingAddress)
};
// Use Nitro protocol channel id so we're always using the same channel Id
export const ledgerId = getChannelId(ledgerNitroChannel);

export const threeWayLedgerNitroChannel = {
  chainId: bigNumberify(NETWORK_ID).toHexString(),
  channelNonce: "0x00",
  participants: threeParticipants
};

export const threeWayLedgerId = getChannelId(threeWayLedgerNitroChannel);

export const threeWayLedgerChannel = {
  nonce: LEDGER_CHANNEL_NONCE,
  channelType: CONSENSUS_LIBRARY_ADDRESS,
  participants: threeParticipants
};

export function threeWayLedgerState(params: ThreeWayLedgerStateParams): SignedState {
  const turnNum = params.turnNum;
  const isFinal = params.isFinal || false;
  const balances = params.balances || twoThreeTwo;

  let furtherVotesRequired = 0;
  if (params.proposedBalances) {
    furtherVotesRequired = params.isVote ? 1 : 2;
  }

  const outcome = convertBalanceToOutcome(balances);
  const proposedOutcome = !!params.proposedBalances
    ? convertBalanceToOutcome(params.proposedBalances)
    : [];
  const consensusData: ConsensusData = {furtherVotesRequired, proposedOutcome};
  const appData = encodeConsensusData(consensusData);

  const state: State = {
    channel: threeWayLedgerNitroChannel,
    isFinal,
    appData,
    turnNum,
    outcome,
    challengeDuration: 300,
    appDefinition: CONSENSUS_LIBRARY_ADDRESS
  };

  const idx: ThreePartyPlayerIndex = turnNum % 3;
  switch (idx) {
    case ThreePartyPlayerIndex.A:
      return Signatures.signState(state, asPrivateKey);
    case ThreePartyPlayerIndex.B:
      return Signatures.signState(state, bsPrivateKey);
    case ThreePartyPlayerIndex.Hub:
      return Signatures.signState(state, hubPrivateKey);
    default:
      return unreachable(idx);
  }
}

export function ledgerState(params: LedgerStateParams): SignedState {
  const turnNum = params.turnNum;
  const isFinal = params.isFinal || false;
  const balances = params.balances || twoThree;

  let furtherVotesRequired = 0;
  if (params.proposedBalances) {
    furtherVotesRequired = 1;
  }
  const outcome = convertBalanceToOutcome(balances);
  const proposedOutcome = !!params.proposedBalances
    ? convertBalanceToOutcome(params.proposedBalances)
    : [];
  const consensusData: ConsensusData = {furtherVotesRequired, proposedOutcome};

  const appData = encodeConsensusData(consensusData);

  const state: State = {
    channel: ledgerNitroChannel,
    isFinal,
    appData,
    turnNum,
    outcome,
    challengeDuration: 300,
    appDefinition: CONSENSUS_LIBRARY_ADDRESS
  };

  const privateKey = turnNum % 2 === 0 ? asPrivateKey : bsPrivateKey;

  return Signatures.signState(state, privateKey);
}

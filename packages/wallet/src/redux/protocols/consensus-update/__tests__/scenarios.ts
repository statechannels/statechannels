import {bigNumberify} from "ethers/utils";

import {SignedState} from "@statechannels/nitro-protocol";

import {
  asAddress,
  bsAddress,
  ledgerId,
  threeWayLedgerId,
  addressAndPrivateKeyLookup,
  ledgerState,
  threeWayLedgerState,
  convertBalanceToOutcome
} from "../../../__tests__/state-helpers";
import {setChannels, EMPTY_SHARED_DATA} from "../../../state";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import * as states from "../states";
import {signedStatesReceived} from "../../../../communication";
import {ThreePartyPlayerIndex, TwoPartyPlayerIndex} from "../../../types";
import {clearedToSend} from "../actions";
import {unreachable} from "../../../../utils/reducer-utils";

const protocolLocator = [];

const twoThree = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()}
];
const threeTwo = [
  {address: asAddress, wei: bigNumberify(3).toHexString()},
  {address: bsAddress, wei: bigNumberify(2).toHexString()}
];

const twoThreeOne = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()},
  {address: asAddress, wei: bigNumberify(1).toHexString()}
];

const oneOneFour = [
  {address: asAddress, wei: bigNumberify(1).toHexString()},
  {address: bsAddress, wei: bigNumberify(1).toHexString()},
  {address: asAddress, wei: bigNumberify(4).toHexString()}
];
// States that have reached consensus
const balances = twoThree;
const proposedBalances = threeTwo;
const ledger4 = ledgerState({turnNum: 4, balances});
const ledger5 = ledgerState({turnNum: 5, balances});
const ledger6 = ledgerState({turnNum: 6, balances});
const ledger6ConsensusOnProposed = ledgerState({turnNum: 6, balances: proposedBalances});
const ledger7 = ledgerState({turnNum: 7, balances: proposedBalances});
const ledger8 = ledgerState({turnNum: 8, balances: proposedBalances});
const ledger20 = ledgerState({turnNum: 20, balances: proposedBalances});

// States that propose a new consensus
const ledger5Propose = ledgerState({turnNum: 5, balances, proposedBalances});
const ledger6Propose = ledgerState({turnNum: 6, balances, proposedBalances});
const ledger7ProposeWrongProposedBalances = ledgerState({
  turnNum: 7,
  balances,
  proposedBalances: balances
});
const ledger7Propose = ledgerState({
  turnNum: 7,
  balances,
  proposedBalances
});
const ledger8Propose = ledgerState({turnNum: 8, balances, proposedBalances});
const ledger19Propose = ledgerState({turnNum: 19, balances, proposedBalances});

type AcceptConsensusOnBalancesTurnNum = 5 | 6;
function acceptConsensusOnBalancesLedgers(turnNum: AcceptConsensusOnBalancesTurnNum) {
  switch (turnNum) {
    case 5:
      return [ledger4, ledger5];
    case 6:
      return [ledger5, ledger6];
    default:
      return unreachable(turnNum);
  }
}

type AcceptConsensusOnProposedBalancesTurnNum = 6 | 7 | 8 | 20;
function acceptConsensusOnProposedBalancesLedgers(
  turnNum: AcceptConsensusOnProposedBalancesTurnNum
) {
  switch (turnNum) {
    case 6:
      return [ledger5Propose, ledger6ConsensusOnProposed];
    case 7:
      return [ledger6Propose, ledger7];
    case 8:
      return [ledger7Propose, ledger8];
    case 20:
      return [ledger19Propose, ledger20];
    default:
      return unreachable(turnNum);
  }
}

type ProposeTurnNum = 5 | 6 | 7 | 8;
const proposeLedgers: {[turnNum in ProposeTurnNum]: SignedState[]} = {
  5: [ledger4, ledger5Propose],
  6: [ledger5, ledger6Propose],
  7: [ledger6, ledger7Propose],
  8: [ledger7ProposeWrongProposedBalances, ledger8Propose]
};

type ProposeOldTurnNum = 7;
const proposeOldLedgers: {[turnNum in ProposeOldTurnNum]: SignedState[]} = {
  7: [ledger6, ledger7ProposeWrongProposedBalances]
};

const threePlayerLedger6 = threeWayLedgerState({turnNum: 6, balances: twoThreeOne});
const threePlayerLedger7 = threeWayLedgerState({turnNum: 7, balances: twoThreeOne});
const threePlayerLedger8 = threeWayLedgerState({turnNum: 8, balances: twoThreeOne});
const threePlayerLedger9 = threeWayLedgerState({
  turnNum: 9,
  balances: twoThreeOne,
  proposedBalances: oneOneFour
});
const threePlayerLedger10 = threeWayLedgerState({
  turnNum: 10,
  balances: twoThreeOne,
  proposedBalances: oneOneFour,
  isVote: true
});
const threePlayerLedger11 = threeWayLedgerState({
  turnNum: 11,
  balances: oneOneFour
});

// ------
// SharedData
// ------

const threePlayerInitialSharedData = (ourIndex: ThreePartyPlayerIndex) => {
  return setChannels(EMPTY_SHARED_DATA, [
    channelFromStates(
      [threePlayerLedger6, threePlayerLedger7, threePlayerLedger8],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey
    )
  ]);
};
const threePlayerFirstUpdateSharedData = (ourIndex: ThreePartyPlayerIndex) => {
  return setChannels(EMPTY_SHARED_DATA, [
    channelFromStates(
      [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey
    )
  ]);
};
const threePlayerSecondUpdateSharedData = (ourIndex: ThreePartyPlayerIndex) => {
  return setChannels(EMPTY_SHARED_DATA, [
    channelFromStates(
      [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey
    )
  ]);
};

const twoPlayerConsensusAcceptedOnBalancesSharedData = (
  turnNum: AcceptConsensusOnBalancesTurnNum,
  ourIndex: TwoPartyPlayerIndex
) =>
  setChannels(EMPTY_SHARED_DATA, [
    channelFromStates(
      acceptConsensusOnBalancesLedgers(turnNum),
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey
    )
  ]);

const twoPlayerConsensusAcceptedOnProposedBalancesSharedData = (
  turnNum: AcceptConsensusOnProposedBalancesTurnNum,
  ourIndex: TwoPartyPlayerIndex
) =>
  setChannels(EMPTY_SHARED_DATA, [
    channelFromStates(
      acceptConsensusOnProposedBalancesLedgers(turnNum),
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey
    )
  ]);

const twoPlayerNewProposalSharedData = (turnNum: ProposeTurnNum, ourIndex: TwoPartyPlayerIndex) =>
  setChannels(EMPTY_SHARED_DATA, [
    channelFromStates(
      proposeLedgers[turnNum],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey
    )
  ]);

// ------
// States
// ------

const processId = "process-id.123";

const twoProps = {
  channelId: ledgerId,
  processId,
  proposedOutcome: convertBalanceToOutcome(threeTwo),
  protocolLocator
};

const threeProps = {
  channelId: threeWayLedgerId,
  processId,
  proposedOutcome: convertBalanceToOutcome(oneOneFour),
  protocolLocator
};

const twoPlayerNotSafeToSend = (cleared: boolean) => {
  return states.notSafeToSend({
    ...twoProps,
    clearedToSend: cleared
  });
};

const twoPlayerStateSent = states.stateSent(twoProps);

const threePlayerNotSafeToSend = (cleared: boolean) => {
  return states.notSafeToSend({
    ...threeProps,
    clearedToSend: cleared
  });
};

const threePlayerStateSent = states.stateSent(threeProps);

// ------
// Actions
// ------
function twoPlayerNewProposalStatesReceived(turnNum: ProposeTurnNum) {
  return signedStatesReceived({
    processId,
    signedStates: proposeLedgers[turnNum],
    protocolLocator
  });
}
function twoPlayerWrongProposalStatesReceived(turnNum: ProposeTurnNum) {
  return signedStatesReceived({
    processId,
    signedStates: proposeOldLedgers[turnNum],
    protocolLocator
  });
}
function twoPlayerAcceptConsensusOnProposedBalancesStatesReceived(
  turnNum: AcceptConsensusOnProposedBalancesTurnNum
) {
  return signedStatesReceived({
    processId,
    signedStates: acceptConsensusOnProposedBalancesLedgers(turnNum),
    protocolLocator
  });
}

const threePlayerUpdate0Received = signedStatesReceived({
  processId,
  signedStates: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
  protocolLocator
});
const threePlayerUpdate1Received = signedStatesReceived({
  processId,
  signedStates: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
  protocolLocator
});

const threePlayerUpdate2Received = signedStatesReceived({
  processId,
  signedStates: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11],
  protocolLocator
});

const clearedToSendAction = clearedToSend({
  processId,
  protocolLocator
});
const proposedOutcome = convertBalanceToOutcome(threeTwo);
export const twoPlayerAHappyPath = {
  initialize: {
    channelId: ledgerId,
    proposedOutcome,
    processId,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.A),
    reply: [ledger5, ledger6Propose],
    clearedToSend: true,
    protocolLocator
  },
  stateSent: {
    state: twoPlayerStateSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerAcceptConsensusOnProposedBalancesStatesReceived(7)
  }
};

export const twoPlayerANotOurTurn = {
  initialize: {
    channelId: ledgerId,
    proposedOutcome,
    processId,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(6, TwoPartyPlayerIndex.A),
    clearedToSend: true,
    protocolLocator
  },
  notSafeToSend: {
    state: twoPlayerNotSafeToSend(true),
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerNewProposalStatesReceived(7),
    reply: acceptConsensusOnProposedBalancesLedgers(8)
  }
};

export const twoPlayerBHappyPath = {
  initialize: {
    processId,
    channelId: ledgerId,
    proposedOutcome,
    clearedToSend: true,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.B),
    protocolLocator
  },
  notSafeToSend: {
    state: twoPlayerNotSafeToSend(true),
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.B),
    action: twoPlayerNewProposalStatesReceived(6),
    reply: acceptConsensusOnProposedBalancesLedgers(7)
  },
  stateSent: {
    state: twoPlayerStateSent,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.B),
    action: twoPlayerNewProposalStatesReceived(6)
  }
};

export const twoPlayerBOurTurn = {
  initialize: {
    channelId: ledgerId,
    proposedOutcome,
    processId,
    sharedData: twoPlayerConsensusAcceptedOnProposedBalancesSharedData(6, TwoPartyPlayerIndex.B),
    reply: [ledger5, ledger6Propose],
    clearedToSend: true,
    protocolLocator
  },
  stateSent: {
    state: twoPlayerStateSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.B),
    action: twoPlayerAcceptConsensusOnProposedBalancesStatesReceived(7)
  }
};

export const twoPlayerAStateRejected = {
  wrongTurn: {
    state: twoPlayerStateSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerAcceptConsensusOnProposedBalancesStatesReceived(20)
  },
  wrongProposalWhenStateNotSent: {
    state: twoPlayerNotSafeToSend(true),
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerWrongProposalStatesReceived(7),
    reply: proposeLedgers[8]
  },
  notConsensusWhenStateSent: {
    state: twoPlayerStateSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerNewProposalStatesReceived(7)
  }
};

export const twoPlayerBStateRejected = {
  stateSent: {
    state: twoPlayerStateSent,
    sharedData: twoPlayerNewProposalSharedData(5, TwoPartyPlayerIndex.B),
    action: twoPlayerAcceptConsensusOnProposedBalancesStatesReceived(20)
  }
};

const threePlayerProposedOutcome = convertBalanceToOutcome(oneOneFour);
export const threePlayerAHappyPath = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedOutcome: threePlayerProposedOutcome,
    clearedToSend: true,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
    reply: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9]
  },
  waitForPlayerBUpdate: {
    state: threePlayerStateSent,
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.A),
    action: threePlayerUpdate1Received
  },
  waitForHubUpdate: {
    state: threePlayerStateSent,
    sharedData: threePlayerSecondUpdateSharedData(ThreePartyPlayerIndex.A),
    action: threePlayerUpdate2Received
  }
};

export const threePlayerBHappyPath = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedOutcome: threePlayerProposedOutcome,
    clearedToSend: true,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B)
  },
  waitForPlayerAUpdate: {
    state: threePlayerNotSafeToSend(true),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
    action: threePlayerUpdate0Received,
    reply: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10]
  },
  waitForHubUpdate: {
    state: threePlayerStateSent,
    sharedData: threePlayerSecondUpdateSharedData(ThreePartyPlayerIndex.B),
    action: threePlayerUpdate2Received
  }
};

export const threePlayerHubHappyPath = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedOutcome: threePlayerProposedOutcome,
    clearedToSend: true,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub)
  },
  waitForPlayerAUpdate: {
    state: threePlayerNotSafeToSend(true),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate0Received
  },
  waitForPlayerBUpdate: {
    state: threePlayerNotSafeToSend(true),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate1Received,
    reply: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11]
  }
};

export const threePlayerANotClearedToSend = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedOutcome: threePlayerProposedOutcome,
    clearedToSend: false,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A)
  },
  notSafeToSendAndOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
    action: clearedToSendAction,
    reply: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9]
  },
  notSafeToSendAndNotOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.A),
    action: clearedToSendAction
  }
};

export const threePlayerBNotClearedToSend = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedOutcome: threePlayerProposedOutcome,
    clearedToSend: false,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B)
  },
  notClearedToSendAndNotOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
    action: clearedToSendAction
  },
  notClearedToSendAndOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.B),
    action: threePlayerUpdate0Received,
    reply: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10]
  }
};

export const threePlayerHubNotClearedToSend = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedOutcome: threePlayerProposedOutcome,
    clearedToSend: false,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub)
  },
  waitForPlayerAUpdate: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate0Received
  },
  waitForPlayerBUpdate: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate1Received
  },
  waitForClearedToSend: {
    state: threePlayerNotSafeToSend(false),
    action: clearedToSendAction,
    sharedData: threePlayerSecondUpdateSharedData(ThreePartyPlayerIndex.Hub),
    reply: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11]
  }
};

export const threePlayerNotOurTurn = {
  playerA: {
    initialize: {
      channelId: threeWayLedgerId,
      processId,
      proposedOutcome: threePlayerProposedOutcome,
      clearedToSend: true,
      sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.A)
    }
  }
};

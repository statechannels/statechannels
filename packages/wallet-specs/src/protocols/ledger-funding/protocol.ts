import { add } from '../..';
import { store } from '../../store';
import { saveConfig } from '../../utils';
import { Init as CreateNullChannelArgs } from '../create-null-channel/protocol';
import { Init as DirectFundingArgs } from '../direct-funding/protocol';
import { Init as LedgerUpdateArgs } from '../ledger-update/protocol';

const PROTOCOL = 'ledger-funding';
const success = { type: 'final' };

interface Init {
  targetChannelID: string;
}

function messageID(context: Init): string {
  return `funding-${context.targetChannelID}`;
}

/*
My wallet's rule is to have at most one ledger channel open with any given peer.
Therefore, two correct wallets should agree on which existing ledger channel, if any, to use
in order to fund the target channel.

TODO: Sort out behaviour if one wallet is missing the ledger channel?

A peer is identified by their participantId.
*/

const lookForExistingChannel = {
  invoke: {
    src: 'findLedgerChannelId',
  },
  on: {
    CHANNEL_FOUND: {
      target: 'fundLedger',
      actions: 'assignLedgerChannelId',
    },
    CHANNEL_NOT_FOUND: 'createNewChannel',
  },
};

const createNullChannelArgs: (ctx: Init) => CreateNullChannelArgs = ({
  targetChannelID,
}: Init) => {
  const participantIds = store.participantIds(targetChannelID);
  const { outcome } = store.getLatestState(targetChannelID);
  return { participantIds, outcome };
};

const createNewChannel = {
  invoke: {
    src: 'createNullChannel',
    data: 'createNullChannelArgs',
  },
  onDone: 'fundLedger',
};

type LedgerExists = Init & { ledgerChannelID: string };
const directFundingArgs: (ctx: LedgerExists) => DirectFundingArgs = ({
  targetChannelID,
  ledgerChannelID,
}) => ({
  channelID: ledgerChannelID,
  minimalOutcome: store.getLatestState(targetChannelID).outcome,
});
const fundLedger = {
  invoke: {
    src: 'directFunding',
    data: 'directFundingArgs',
    onDone: 'fundTarget',
  },
};

function ledgerUpdateArgs({
  ledgerChannelID,
  targetChannelID,
}: LedgerExists): LedgerUpdateArgs {
  const amount = store
    .getLatestState(targetChannelID)
    .outcome.map(o => o.amount)
    .reduce(add);
  return {
    channelID: ledgerChannelID,
    targetOutcome: [{ destination: targetChannelID, amount }],
    currentTurnNum: store.getLatestConsensus(ledgerChannelID).state.turnNum,
  };
}
const fundTarget = {
  invoke: {
    src: 'ledgerUpdate',
    data: 'ledgerUpdateArgs',
    onDone: 'success',
  },
};

const ledgerFundingConfig = {
  key: PROTOCOL,
  initial: 'waitForChannel',
  states: {
    lookForExistingChannel,
    createNewChannel,
    fundLedger,
    fundTarget,
    success,
  },
};

const guards = {
  suitableChannelExists: x => true,
};

saveConfig(ledgerFundingConfig, __dirname, { guards });

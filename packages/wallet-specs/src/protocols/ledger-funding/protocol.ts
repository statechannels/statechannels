import { add, store } from '../..';
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
  const { channel: targetChannel, outcome } = store.getLatestState(
    targetChannelID
  );
  const channel = {
    ...targetChannel,
    channelNonce: store.getNextNonce(targetChannel.participants),
  };
  return { channel, outcome };
};

const createNewChannel = {
  invoke: {
    src: 'createNullChannel',
    data: 'createNullChannelArgs',
  },
  onDone: 'fundLedger',
};

type LedgerExists = Init & { ledgerChannelID: string };
function directFundingArgs(ctx: LedgerExists): DirectFundingArgs {
  return {
    channelID: ctx.ledgerChannelID,
    minimalOutcome: store.getLatestState(ctx.targetChannelID).outcome,
  };
}
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
    .getLatestSupportedAllocation(targetChannelID)
    .map(o => o.amount)
    .reduce(add);
  return {
    channelID: ledgerChannelID,
    targetOutcome: [{ destination: targetChannelID, amount }],
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

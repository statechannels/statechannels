import * as AdvanceChannel from './advance-channel/protocol';
import * as ConcludeChannel from './conclude-channel/protocol';
import * as CreateChannel from './create-channel/protocol';
import * as CreateNullChannel from './create-null-channel/protocol';
import * as DirectFunding from './direct-funding/protocol';
import * as Funding from './funding/protocol';
import * as JoinChannel from './join-channel/protocol';
import * as LedgerDefunding from './ledger-defunding/protocol';
import * as LedgerFunding from './ledger-funding/protocol';
import * as LedgerUpdate from './ledger-update/protocol';
import * as SupportState from './support-state/protocol';

// This is a hacky way to run the `saveConfig` function in each protocl.ts file
// TODO: Make this less hacky
export {
  AdvanceChannel,
  ConcludeChannel,
  CreateChannel,
  CreateNullChannel,
  JoinChannel,
  DirectFunding,
  Funding,
  LedgerDefunding,
  LedgerFunding,
  LedgerUpdate,
  SupportState,
};

import {
  up as createLedgerProposalsTable,
  down as dropLedgerProposalsTable,
} from './20201201095501_ledger_proposals';

export const up = dropLedgerProposalsTable;
export const down = createLedgerProposalsTable;

import { makeLocator } from '../redux/protocols';
import { EmbeddedProtocol } from '.';

export const ADVANCE_CHANNEL_PROTOCOL_LOCATOR = makeLocator(EmbeddedProtocol.AdvanceChannel);
export const CONSENSUS_UPDATE_PROTOCOL_LOCATOR = makeLocator(EmbeddedProtocol.ConsensusUpdate);
export const EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR = makeLocator(
  EmbeddedProtocol.ExistingLedgerFunding,
);
export const LEDGER_TOP_UP_PROTOCOL_LOCATOR = makeLocator(EmbeddedProtocol.LedgerTopUp);
export const FUNDING_STRATEGY_NEGOTIATION_PROTOCOL_LOCATOR = makeLocator(
  EmbeddedProtocol.FundingStrategyNegotiation,
);

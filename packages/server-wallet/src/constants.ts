require('../env');

export const NAME = 'Neo Bot';

// This account is provided eth in @statechannels/devtools/utils/startGanache.js
export const HUB_SIGNER_PRIVATE_KEY =
  process.env.HUB_SIGNER_PRIVATE_KEY ||
  '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8';
export const HUB_SIGNER_ADDRESS =
  process.env.HUB_SIGNER_ADDRESS || '0xD9995BAE12FEe327256FFec1e3184d492bD94C31';

export const HUB_ADDRESS = process.env.HUB_ADDRESS || '0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C';
export const HUB_PRIVATE_KEY =
  process.env.HUB_PRIVATE_KEY ||
  '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b';

export const unreachable = (x: never) => x;

export const enum EmbeddedProtocol {
  AdvanceChannel = 'AdvanceChannel',
  ConsensusUpdate = 'ConsensusUpdate',
  DirectFunding = 'DirectFunding', // TODO: Post-fund-setup exchange will be removed from direct funding, so this should be removed
  ExistingLedgerFunding = 'ExistingLedgerFunding',
  LedgerDefunding = 'LedgerDefunding',
  LedgerFunding = 'LedgerFunding',
  LedgerTopUp = 'LedgerTopUp',
  NewLedgerChannel = 'NewLedgerChannel',
  VirtualFunding = 'VirtualFunding',
  FundingStrategyNegotiation = 'FundingStrategyNegotiation',
  VirtualDefunding = 'VirtualDefunding',
  Defunding = 'Defunding'
}

export const enum ProcessProtocol {
  Application = 'Application',
  Funding = 'Funding',
  Concluding = 'Concluding',
  CloseLedgerChannel = 'CloseLedgerChannel'
}

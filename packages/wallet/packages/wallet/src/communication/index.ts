import { Commitment, SignedCommitment } from '../domain';
import { messageRelayRequested } from '../magmo-wallet-client';
import {
  RelayableAction,
  strategyProposed,
  strategyApproved,
  commitmentReceived,
  concludeInstigated,
  ConcludeInstigated,
  commitmentsReceived,
} from './actions';
import { convertCommitmentToSignedState } from '../utils/nitro-converter';
export * from './actions';

// These protocols are precisely those that run at the top-level
export const enum ProcessProtocol {
  Application = 'Application',
  Funding = 'Funding',
  Concluding = 'Concluding',
  CloseLedgerChannel = 'CloseLedgerChannel',
}

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
  Defunding = 'Defunding',
}

export type ProtocolLocator = EmbeddedProtocol[];
export type FundingStrategy = 'IndirectFundingStrategy' | 'VirtualFundingStrategy';

function sendMessage(to: string, message: RelayableAction) {
  return messageRelayRequested(to, message);
}

export function sendStrategyProposed(to: string, processId: string, strategy: FundingStrategy) {
  return sendMessage(to, strategyProposed({ processId, strategy }));
}

export function sendStrategyApproved(to: string, processId: string, strategy: FundingStrategy) {
  return sendMessage(to, strategyApproved({ processId, strategy }));
}

export function sendConcludeInstigated(to: string, channelId) {
  return sendMessage(to, concludeInstigated({ channelId }));
}

export const sendCommitmentReceived = (
  to: string,
  processId: string,
  commitment: Commitment,
  signature: string,
  privateKey: string,
  protocolLocator: ProtocolLocator = [],
) => {
  const payload = commitmentReceived({
    processId,
    signedCommitment: {
      commitment,
      signature,
      signedState: convertCommitmentToSignedState(commitment, privateKey),
    },
    protocolLocator,
  });
  return messageRelayRequested(to, payload);
};

export const sendCommitmentsReceived = (
  to: string,
  processId: string,
  signedCommitments: SignedCommitment[],
  protocolLocator: ProtocolLocator,
) => {
  const payload = commitmentsReceived({ processId, signedCommitments, protocolLocator });
  return messageRelayRequested(to, payload);
};

export type StartProcessAction = ConcludeInstigated;
export function isStartProcessAction(a: { type: string }): a is StartProcessAction {
  return a.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED';
}

export function getProcessId(action: StartProcessAction) {
  return `${action.protocol}-${action.channelId}`;
}

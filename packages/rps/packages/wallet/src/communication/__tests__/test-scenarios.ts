import { messageRelayRequested } from 'magmo-wallet-client';
import { strategyProposed, strategyApproved } from '../';

export const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
export const bsAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';

const fundingProcessId = 'Funding';
const concludeProcessId = 'Conclude';

const indirectStrategyChosen = messageRelayRequested(bsAddress, {
  processId: fundingProcessId,
  data: strategyProposed(fundingProcessId, 'IndirectFundingStrategy'),
});

const indirectStrategyApproved = messageRelayRequested(asAddress, {
  processId: fundingProcessId,
  data: strategyApproved(fundingProcessId),
});

const sendLedgerPrefundSetup = messageRelayRequested(bsAddress, {
  processId: fundingProcessId,
  data: '',
});

const respondToLedgerPreFundSetup = messageRelayRequested(asAddress, {
  processId: fundingProcessId,
  data: '',
});

const sendLedgerPostfundSetup = messageRelayRequested(bsAddress, {
  processId: fundingProcessId,
  data: '',
});

const respondToLedgerPostFundSetup = messageRelayRequested(asAddress, {
  processId: fundingProcessId,
  data: '',
});

const sendLedgerUpdate = messageRelayRequested(bsAddress, {
  processId: fundingProcessId,
  data: '',
});

const respondToLedgerUpdate = messageRelayRequested(asAddress, {
  processId: fundingProcessId,
  data: '',
});

const sendAppPostFundSetup = messageRelayRequested(bsAddress, {
  processId: fundingProcessId,
  data: '',
});

const respondToAppPostFundSetup = messageRelayRequested(asAddress, {
  processId: fundingProcessId,
  data: '',
});

const concludeGame = messageRelayRequested(bsAddress, {
  processId: concludeProcessId,
  data: '',
});

const respondToConclude = messageRelayRequested(asAddress, {
  processId: concludeProcessId,
  data: '',
});

export default {
  indirectStrategyChosen,
  indirectStrategyApproved,
  sendLedgerPrefundSetup,
  respondToLedgerPreFundSetup,
  sendLedgerPostfundSetup,
  respondToLedgerPostFundSetup,
  sendLedgerUpdate,
  respondToLedgerUpdate,
  sendAppPostFundSetup,
  respondToAppPostFundSetup,
  concludeGame,
  respondToConclude,
};

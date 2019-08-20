import { ConcludingState } from '../concluding/states';
import { SharedData } from '../../state';
import { ProtocolAction } from '../../actions';
import { ProtocolStateWithSharedData, makeLocator, EMPTY_LOCATOR } from '..';
import {
  sendConcludeInstigated,
  getTwoPlayerIndex,
  showWallet,
  sendConcludeSuccess,
  sendConcludeFailure,
  hideWallet,
  getFundingChannelId,
  sendOpponentConcluded,
} from '../reducer-helpers';
import {
  initializeAdvanceChannel,
  AdvanceChannelState,
  advanceChannelReducer,
} from '../advance-channel';
import { EmbeddedProtocol } from '../../../communication';
import { CommitmentType } from '../../../domain';
import * as states from './states';
import { routesToAdvanceChannel } from '../advance-channel/actions';
import { DefundingState, initializeDefunding, defundingReducer } from '../defunding';
import { routesToDefunding } from '../defunding/actions';
import { unreachable } from '../../../utils/reducer-utils';
import { CloseLedgerChannelState } from '../close-ledger-channel/states';
import {
  initializeCloseLedgerChannel,
  isCloseLedgerChannelAction,
  closeLedgerChannelReducer,
} from '../close-ledger-channel';

export function concludingReducer(
  protocolState: states.NonTerminalConcludingState,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<ConcludingState> {
  switch (protocolState.type) {
    case 'Concluding.WaitForConclude':
      return waitForConcludeReducer(protocolState, sharedData, action);
    case 'Concluding.WaitForDefund':
      return waitForDefundReducer(protocolState, sharedData, action);
    case 'Concluding.DecideClosing':
      return decideClosingReducer(protocolState, sharedData, action);
    case 'Concluding.WaitForLedgerClose':
      return waitForLedgerCloseReducer(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
}

function waitForLedgerCloseReducer(
  protocolState: states.WaitForLedgerClose,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<ConcludingState> {
  if (!isCloseLedgerChannelAction(action)) {
    console.warn(`Expected Close Ledger Channel Action, received ${action.type} instead`);
    return { protocolState, sharedData };
  }
  let ledgerClosing: CloseLedgerChannelState;
  ({ protocolState: ledgerClosing, sharedData } = closeLedgerChannelReducer(
    protocolState.ledgerClosing,
    sharedData,
    action,
  ));
  switch (ledgerClosing.type) {
    case 'CloseLedgerChannel.Failure':
      return {
        protocolState: states.failure({ reason: 'Close Ledger Channel Failure' }),
        sharedData,
      };
    case 'CloseLedgerChannel.Success':
      sharedData = sendConcludeSuccess(sharedData);
      sharedData = hideWallet(sharedData);
      return { protocolState: states.success({}), sharedData };
    default:
      return {
        protocolState: states.waitForLedgerClose({ ...protocolState, ledgerClosing }),
        sharedData,
      };
  }
}
function decideClosingReducer(
  protocolState: states.DecideClosing,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<ConcludingState> {
  if (
    action.type !== 'WALLET.CONCLUDING.KEEP_OPEN_SELECTED' &&
    action.type !== 'WALLET.CONCLUDING.CLOSE_SELECTED'
  ) {
    console.warn(`Expected decision action received ${action.type} instead`);
    return { protocolState, sharedData };
  }

  switch (action.type) {
    case 'WALLET.CONCLUDING.KEEP_OPEN_SELECTED':
      sharedData = sendConcludeSuccess(sharedData);
      sharedData = hideWallet(sharedData);
      return { protocolState: states.success({}), sharedData };
    case 'WALLET.CONCLUDING.CLOSE_SELECTED':
      let ledgerClosing: CloseLedgerChannelState;

      ({ protocolState: ledgerClosing, sharedData } = initializeCloseLedgerChannel(
        protocolState.processId,
        protocolState.ledgerId,
        sharedData,
      ));
      switch (ledgerClosing.type) {
        case 'CloseLedgerChannel.Failure':
          return {
            protocolState: states.failure({ reason: 'Close Ledger Channel Failure' }),
            sharedData,
          };
        case 'CloseLedgerChannel.Success':
          sharedData = hideWallet(sharedData);
          sharedData = sendConcludeSuccess(sharedData);
          return { protocolState: states.success({}), sharedData };

        default:
          return {
            protocolState: states.waitForLedgerClose({ ...protocolState, ledgerClosing }),
            sharedData,
          };
      }
  }
}

function waitForDefundReducer(
  protocolState: states.WaitForDefund,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<ConcludingState> {
  if (!routesToDefunding(action, EMPTY_LOCATOR)) {
    console.warn(`Expected defunding, received ${action.type} instead`);
    return { protocolState, sharedData };
  }

  let defunding: DefundingState;
  ({ protocolState: defunding, sharedData } = defundingReducer(
    protocolState.defunding,
    sharedData,
    action,
  ));

  switch (defunding.type) {
    case 'Defunding.Failure':
      sharedData = sendConcludeFailure(sharedData, 'Other');
      return { protocolState: states.failure({ reason: 'Defunding Failure' }), sharedData };
    case 'Defunding.Success':
      return { protocolState: states.decideClosing(protocolState), sharedData };

    default:
      return {
        protocolState: states.waitForDefund({ ...protocolState, defunding }),
        sharedData,
      };
  }
}

function waitForConcludeReducer(
  protocolState: states.WaitForConclude,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<ConcludingState> {
  if (!routesToAdvanceChannel(action, EMPTY_LOCATOR)) {
    console.warn(`Expected Advance channel action, received ${action.type} instead`);
    return { protocolState, sharedData };
  }
  let concluding: AdvanceChannelState;
  ({ protocolState: concluding, sharedData } = advanceChannelReducer(
    protocolState.concluding,
    sharedData,
    action,
  ));
  switch (concluding.type) {
    case 'AdvanceChannel.Failure':
      sharedData = sendConcludeFailure(sharedData, 'Other');
      return { protocolState: states.failure({ reason: 'Advance Channel Failure' }), sharedData };
    case 'AdvanceChannel.Success':
      let defunding: DefundingState;
      const { processId, channelId } = protocolState;
      ({ protocolState: defunding, sharedData } = initializeDefunding(
        processId,
        makeLocator(EmbeddedProtocol.Defunding),
        channelId,
        sharedData,
      ));
      return {
        protocolState: states.waitForDefund({ ...protocolState, defunding }),
        sharedData,
      };
    default:
      return {
        protocolState: states.waitForConclude({ ...protocolState, concluding }),
        sharedData,
      };
  }
}

export function initialize({
  channelId,
  processId,
  opponentInstigatedConclude,
  sharedData,
}: {
  channelId: string;
  processId: string;
  opponentInstigatedConclude: boolean;
  sharedData: SharedData;
}): ProtocolStateWithSharedData<ConcludingState> {
  // If the current player is instigating a conclude we send a message to the opponent
  // so they can start their process
  if (!opponentInstigatedConclude) {
    sharedData = sendConcludeInstigated(sharedData, channelId);
  } else {
    sharedData = sendOpponentConcluded(sharedData);
  }
  sharedData = showWallet(sharedData);

  const ledgerId = getFundingChannelId(channelId, sharedData);

  let concluding: AdvanceChannelState;
  ({ protocolState: concluding, sharedData } = initializeAdvanceChannel(sharedData, {
    channelId,
    clearedToSend: true,
    processId,
    ourIndex: getTwoPlayerIndex(channelId, sharedData),
    protocolLocator: makeLocator(EMPTY_LOCATOR, EmbeddedProtocol.AdvanceChannel),
    commitmentType: CommitmentType.Conclude,
  }));
  return {
    protocolState: states.waitForConclude({ channelId, processId, ledgerId, concluding }),
    sharedData,
  };
}

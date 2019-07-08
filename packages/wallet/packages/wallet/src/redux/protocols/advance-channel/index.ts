export { AdvanceChannelState, isSuccess } from './states';
export { AdvanceChannelAction, isAdvanceChannelAction } from './actions';
export {
  initialize as initializeAdvanceChannel,
  reducer as advanceChannelReducer,
} from './reducer';

export const ADVANCE_CHANNEL_PROTOCOL_LOCATOR = 'advanceChannel';

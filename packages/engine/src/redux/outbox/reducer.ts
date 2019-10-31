import {OutboxState} from "./state";
import * as actions from "../actions";

export function clearOutbox(state: OutboxState, action: actions.EngineAction): OutboxState {
  const nextOutbox = {...state};
  if (action.type === "ENGINE.MESSAGE_SENT") {
    nextOutbox.messageOutbox = nextOutbox.messageOutbox.slice(1);
  }
  if (action.type === "ENGINE.DISPLAY_MESSAGE_SENT") {
    nextOutbox.displayOutbox = nextOutbox.displayOutbox.slice(1);
  }
  if (action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SENT") {
    nextOutbox.transactionOutbox = nextOutbox.transactionOutbox.slice(1);
  }

  return nextOutbox;
}

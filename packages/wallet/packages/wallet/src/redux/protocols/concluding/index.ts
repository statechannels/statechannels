export { Concluding } from './container';
export {
  initializeResponderState,
  initializeInstigatorState,
  concludingReducer as reducer,
} from './reducer';

import { ConcludingInstigatorAction, isConcludingInstigatorAction } from './instigator/actions';
import { ConcludingResponderAction, isConcludingResponderAction } from './responder/actions';
import { WalletAction } from '../../../redux/actions';
import { ConsensusUpdateAction } from '../consensus-update/actions';

export type ConcludingAction =
  | ConcludingInstigatorAction
  | ConcludingResponderAction
  | ConsensusUpdateAction;

export function isConcludingAction(action: WalletAction): action is ConcludingAction {
  return isConcludingInstigatorAction(action) || isConcludingResponderAction(action);
}

import {Subscription} from 'rxjs';
import P from 'pino';

// It is not clear why the following error is sometimes thrown.
// TypeError: Cannot read property 'closed' of null
export const safeUnsubscribe = (subscription: Subscription, log: P.Logger) => () => {
  if (subscription) safeUnsubscribeFromFunction(subscription.unsubscribe, log);
};

export const safeUnsubscribeFromFunction = (unsubscribe: () => void, log: P.Logger) => () => {
  try {
    unsubscribe();
  } catch (error) {
    log.warn({error}, 'Unable to unsubscribe');
  }
};

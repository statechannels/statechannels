import {Subscription} from 'rxjs';
import P from 'pino';

// It is not clear why the following error is sometimes thrown.
// TypeError: Cannot read property 'closed' of null
export const safeUnsubscribe = (subscription: Subscription, log: P.Logger) => () => {
  try {
    subscription.unsubscribe();
  } catch (error) {
    log.warn('Unable to unsubscribe');
  }
};

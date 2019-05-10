import { isRelayableAction } from 'magmo-wallet/src/communication';
import { unreachable } from 'magmo-wallet/src/utils/reducer-utils';

export async function handleNewProcessAction(ctx) {
  const { data: action } = ctx.request.body;
  if (!isRelayableAction(action)) {
    throw new Error(`Action ${action.type} is not valid`);
  }

  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
    case 'WALLET.CONCLUDING.CONCLUDE_CHANNEL':
    case 'WALLET.FUNDING.STRATEGY_PROPOSED':
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
      return ctx;
    default:
      return unreachable(action);
  }
}

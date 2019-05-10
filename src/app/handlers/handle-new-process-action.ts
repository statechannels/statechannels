import { communication } from 'magmo-wallet';
import { unreachable } from 'magmo-wallet';

export async function handleNewProcessAction(ctx) {
  const { data: action } = ctx.request.body;
  if (!communication.isRelayableAction(action)) {
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

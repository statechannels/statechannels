import { communication, ConcludeInstigated } from 'magmo-wallet';
import { unreachable } from 'magmo-wallet';

export async function handleNewProcessAction(ctx) {
  const action = ctx.request.body;
  if (!communication.isRelayableAction(action)) {
    throw new Error(`Action ${action.type} is not valid`);
  }

  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
    case 'WALLET.FUNDING.STRATEGY_PROPOSED':
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
      return ctx;
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
      return handleConcludeInstigated(ctx, action);
    default:
      return unreachable(action);
  }
}

function handleConcludeInstigated(ctx, action: ConcludeInstigated) {
  return ctx;
}

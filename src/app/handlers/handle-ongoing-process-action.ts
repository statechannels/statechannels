import { communication, RelayableAction } from 'magmo-wallet';
import { errors } from '../../wallet';
import { getProcess } from '../../wallet/db/queries/walletProcess';

export async function handleOngoingProcessAction(ctx) {
  const action: RelayableAction = ctx.request.body;
  switch (action.type) {
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
      return ctx;
    case 'WALLET.COMMON.COMMITMENT_RECEIVED': {
      const { processId } = action;
      const process = await getProcess(processId);
      if (!process) {
        throw errors.processMissing(processId);
      }
      return ctx;
    }
    case 'WALLET.FUNDING.STRATEGY_PROPOSED': {
      const { processId } = action;
      const process = await getProcess(processId);
      if (!process) {
        throw errors.processMissing(processId);
      }

      const { their_address: theirAddress } = process;
      ctx.body = communication.sendStrategyApproved(theirAddress, processId);
      ctx.status = 200;

      return ctx;
    }
  }
}

import { communication } from 'magmo-wallet';
import { errors } from '../../wallet';
import { getProcess } from '../../wallet/db/queries/walletProcess';

export async function handleOngoingProcessAction(ctx) {
  const { data: action } = ctx.request.body;
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
    case 'WALLET.CONCLUDING.CONCLUDE_CHANNEL':
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
      return ctx;
    case 'WALLET.FUNDING.STRATEGY_PROPOSED':
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

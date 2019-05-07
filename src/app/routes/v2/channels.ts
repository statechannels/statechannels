import * as koaBody from 'koa-body';
import * as Router from 'koa-router';

import { errors } from '../../../wallet';
import { getProcess } from '../../../wallet/db/queries/walletProcess';
export const BASE_URL = `/api/v2/channels`;

const router = new Router();

router.post(`${BASE_URL}`, koaBody(), async ctx => {
  try {
    let body;
    const { data: action } = ctx.request.body;
    if (await isNewProcessAction(action)) {
      return await routeToNewProcessInitializer(action);
    } else if (await isProtocolAction(action)) {
      return await routeToProtocolReducer(action);
    }

    body = { status: 'success', action };

    if (body.commitment) {
      ctx.status = 201;
      ctx.body = body;
    } else {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        message: 'Something went wrong.',
      };
    }
  } catch (err) {
    switch (err) {
      case errors.CHANNEL_EXISTS:
      case errors.COMMITMENT_NOT_SIGNED:
      case errors.CHANNEL_MISSING:
      case errors.COMMITMENT_NOT_SIGNED: {
        ctx.status = 400;
        ctx.body = {
          status: 'error',
          message: err.message,
        };

        return;
      }
      default:
        throw err;
    }
  }
});

export const rpsChannelRoutes = router.routes();

async function isNewProcessAction(action): Promise<boolean> {
  if (action.type === 'WALLET.FUNDING.STRATEGY_PROPOSED' || opensAppChannel(action)) {
    const { processId } = action;
    const process = await getProcess(processId);
    if (process) {
      throw new Error(`Process ${processId} is already running.`);
    }
    return true;
  } else {
    return false;
  }
}

async function isProtocolAction(action): Promise<boolean> {
  if (
    action.type === 'WALLET.CONCLUDING.CONCLUDE_CHANNEL' ||
    (action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' && !opensAppChannel(action))
  ) {
    const { processId } = action;
    const process = await getProcess(processId);
    if (!process) {
      throw new Error(`Process ${processId} is not running.`);
    }
    return true;
  }

  return false;
}

async function routeToProtocolReducer(action) {
  return true;
}

async function routeToNewProcessInitializer(action) {
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
    case 'WALLET.CONCLUDING.CONCLUDE_CHANNEL':
  }
}

function opensAppChannel(action): boolean {
  return true;
}

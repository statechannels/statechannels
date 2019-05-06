import * as koaBody from 'koa-body';
import * as Router from 'koa-router';

import { errors } from '../../../wallet';
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

async function isNewProcessAction(action) {
  return true;
}
async function routeToNewProcessInitializer(action) {
  return true;
}
async function isProtocolAction(action) {
  return true;
}
async function routeToProtocolReducer(action) {
  return true;
}

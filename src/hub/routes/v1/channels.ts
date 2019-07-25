import * as koaBody from 'koa-body';
import * as Router from 'koa-router';

import { handleAppMessage } from '../../handlers/handle-app-message';
import { handleWalletMessage } from '../../handlers/handle-wallet-message';
export const BASE_URL = `/api/v1/channels`;

const router = new Router();

router.post(`${BASE_URL}`, koaBody(), async ctx => {
  const { queue } = ctx.request.body;
  const message = ctx.request.body;
  let outgoingMessage;

  if (queue === 'GAME_ENGINE') {
    outgoingMessage = await handleAppMessage(ctx.request.body);
  } else {
    outgoingMessage = handleWalletMessage(message);
  }

  if (outgoingMessage) {
    ctx.response.status = 201;
    ctx.response.body = outgoingMessage;
  } else {
    ctx.response.status = 200;
  }
});

export const channelRoutes = router.routes();

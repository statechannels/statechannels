import * as koaBody from 'koa-body';
import * as Router from 'koa-router';

import { handleGameRequest } from '../../handlers/handle-game-request';
export const BASE_URL = `/api/v1/rps_channels`;

const router = new Router();

router.post(`${BASE_URL}`, koaBody(), async ctx => {
  ctx = await handleGameRequest(ctx);
});

export const rpsChannelRoutes = router.routes();

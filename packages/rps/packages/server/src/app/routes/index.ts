import * as Router from 'koa-router';

const BASE_URL = '/';

const router = new Router();

router.get(BASE_URL, async ctx => {
  ctx.body = {
    status: 'success',
    data: 'Welcome to the Nitro hub, where everything happens REALLY fast!',
  };
});

export const indexRoutes = router.routes();

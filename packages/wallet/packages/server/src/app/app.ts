import * as cors from '@koa/cors';
import * as Koa from 'koa';
import { send } from '../message/firebase-relay';
import { logger } from './logging';
import { indexRoutes } from './routes/index';
import { ledgerChannelRoutes } from './routes/v1/ledger_channels';
import { rpsChannelRoutes } from './routes/v1/rps_channels';
import { channelRoutes } from './routes/v2/channels';

const app = new Koa();

app.use(async (ctx, next) => {
  await next();
  // Executed after all other middleware
  const status = ctx.status;
  if (status === 200 || status === 201) {
    const to = ctx.body.to;
    const messagePayload = ctx.body.messagePayload;
    if (to && messagePayload) {
      send(to, messagePayload);
    }
  }
});
app.use(logger);
app.use(cors());
app.use(indexRoutes);
app.use(ledgerChannelRoutes);
app.use(rpsChannelRoutes);
app.use(channelRoutes);

export default app;

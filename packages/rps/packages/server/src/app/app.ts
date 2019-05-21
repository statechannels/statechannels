import * as cors from '@koa/cors';
import * as Koa from 'koa';
import { logger } from './logging';
import { indexRoutes } from './routes/index';
import { ledgerChannelRoutes } from './routes/v1/ledger_channels';
import { rpsChannelRoutes } from './routes/v1/rps_channels';
import { rpsGamesRoutes } from './routes/v1/rps_games';
import { channelRoutes } from './routes/v2/channels';

const app = new Koa();

app.use(logger);
app.use(cors());
app.use(indexRoutes);
app.use(ledgerChannelRoutes);
app.use(rpsChannelRoutes);
app.use(rpsGamesRoutes);
app.use(channelRoutes);

export default app;

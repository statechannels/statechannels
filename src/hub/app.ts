import * as cors from '@koa/cors';
import * as Koa from 'koa';
import { logger } from './logging';
import { indexRoutes } from './routes/index';
import { channelRoutes } from './routes/v1/channels';

const app = new Koa();

app.use(logger);
app.use(cors());
app.use(indexRoutes);
app.use(channelRoutes);

export default app;

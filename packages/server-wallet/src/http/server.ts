import config from '../config';

import app from './app';

app.listen(config.expressPort, () => {
  console.log(`[App]: Listening on expressPort ${config.expressPort}`);
});

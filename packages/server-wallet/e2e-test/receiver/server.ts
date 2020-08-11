import {configureEnvVariables} from '@statechannels/devtools';
configureEnvVariables();

import app from './app';

app.listen(65535, '127.0.0.1');

app.on('listening', () => {
  console.info('[receiver] Listening on 127.0.0.1:65535');
});

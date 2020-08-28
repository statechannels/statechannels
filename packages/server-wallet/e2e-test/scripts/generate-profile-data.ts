import {exec} from 'child_process';

import {configureEnvVariables} from '@statechannels/devtools';

import {
  waitForServerToStart,
  triggerPayments,
  knexReceiver,
  ReceiverServer,
  seedTestChannels,
  getParticipant,
} from '../e2e-utils';
import {alice, bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {SigningWallet} from '../../src/models/signing-wallet';
import {truncate} from '../../src/db-admin/db-admin-connection';
import knexPayer from '../../src/db/connection';

import kill = require('tree-kill');

const startReceiver = async (profiling: 'FlameGraph' | 'BubbleProf'): Promise<ReceiverServer> => {
  if (profiling === 'FlameGraph') {
    const server = exec(
      `npx clinic flame --collect-only -- node ./lib/e2e-test/receiver/server.js`,
      {
        env: {
          // eslint-disable-next-line
          ...process.env,
          SERVER_DB_NAME: 'receiver',
        },
      }
    );
    return {
      server: server,
      url: `http://127.0.0.1:65535`,
    };
  } else {
    const server = exec(
      `npx clinic bubbleprof --collect-only -- node  ./lib/e2e-test/receiver/server.js`,
      {
        env: {
          // eslint-disable-next-line
          ...process.env,
          SERVER_DB_NAME: 'receiver',
        },
      }
    );

    return {
      server: server,
      url: `http://127.0.0.1:65535`,
    };
  }
};
async function generateData(type: 'BubbleProf' | 'FlameGraph'): Promise<void> {
  const receiverServer = await startReceiver(type);

  await waitForServerToStart(receiverServer);

  const [SWPayer, SWReceiver] = [knexPayer, knexReceiver].map(knex => SigningWallet.bindKnex(knex));

  await Promise.all([knexPayer, knexReceiver].map(db => truncate(db)));
  // Adds Alice to Payer's Database
  await SWPayer.query().insert(alice());

  // Adds Bob to Receiver's Database
  await SWReceiver.query().insert(bob());

  const channelIds = await seedTestChannels(
    getParticipant('payer', alice().privateKey),
    alice().privateKey,
    getParticipant('receiver', bob().privateKey),
    bob().privateKey,
    100,
    knexPayer
  );
  await triggerPayments(channelIds);

  kill(receiverServer.server.pid, 'SIGINT');

  return new Promise(resolve => {
    receiverServer.server.on('exit', () => {
      resolve();
    });
  });
}

(async function(): Promise<void> {
  configureEnvVariables();
  // TODO: Use yargs?
  const type =
    process.argv.slice(2)[0].toLowerCase() === 'flamegraph' ? 'FlameGraph' : 'BubbleProf';

  await generateData(type);
  process.exit(0);
})();

import {exec, ChildProcess} from 'child_process';

import {configureEnvVariables} from '@statechannels/devtools';

import {
  waitForServerToStart,
  triggerPayments,
  knexReceiver,
  ReceiverServer,
  seedTestChannels,
  getParticipant,
  knexPayer,
} from '../e2e-utils';
import {alice, bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {SigningWallet} from '../../src/models/signing-wallet';
import {truncate} from '../../src/db-admin/db-admin-connection';

import kill = require('tree-kill');

const startReceiver = async (
  profiling: 'FlameGraph' | 'BubbleProf' | 'Doctor'
): Promise<ReceiverServer> => {
  let server: ChildProcess;
  if (profiling === 'FlameGraph') {
    server = exec(`npx clinic flame --collect-only -- node ./lib/e2e-test/receiver/server.js`);
  } else if (profiling == 'Doctor') {
    server = exec(`npx clinic doctor --collect-only -- node  ./lib/e2e-test/receiver/server.js`);
  } else {
    server = exec(
      `npx clinic bubbleprof --collect-only -- node  ./lib/e2e-test/receiver/server.js`
    );
  }

  server.on('error', data => {
    console.error(data.toString());
    process.exit(1);
  });
  server.stdout?.on('data', data => console.log(data.toString()));
  server.stderr?.on('data', data => {
    console.error(data.toString());
  });

  return {
    server: server,
    url: `http://127.0.0.1:65535`,
  };
};

const NUM_CHANNELS = 20;
const NUM_PAYMENTS = 20;

async function generateData(type: 'BubbleProf' | 'FlameGraph' | 'Doctor'): Promise<void> {
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
    NUM_CHANNELS,
    knexPayer
  );

  const receiverServer = await startReceiver(type);

  await waitForServerToStart(receiverServer);

  try {
    await triggerPayments(channelIds, NUM_PAYMENTS);
  } catch (error) {
    process.exit(1);
  }

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
  const typeArg = process.argv.slice(2)[0].toLowerCase();
  const type =
    typeArg === 'bubbleprof' ? 'BubbleProf' : typeArg === 'flamegraph' ? 'FlameGraph' : 'Doctor';

  await generateData(type);
  process.exit(0);
})();

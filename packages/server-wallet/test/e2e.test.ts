import {spawn, ChildProcessWithoutNullStreams} from 'child_process';

function startServerWallet(port: string): ChildProcessWithoutNullStreams {
  const server = spawn('yarn', ['ts-node', 'src/index'], {
    env: {...process.env, NODE_ENV: 'test', PORT: port},
  });

  server.stdout.on('data', data => console.log(data.toString()));
  server.stderr.on('data', data => console.error({error: data.toString()}, `Server threw error`));

  return server;
}

const aliceHttp = startServerWallet('5001');
const bobHttp = startServerWallet('5002');

// TODO:
//
// [ ] Point servers to separate DBs.
// [ ] Seed both DBs with data that makes sense.
// [ ] Implement /api/updateState/ to take request and pass to Wallet.updateState
// [ ] Send http /api/updateState/ request to Alice
// [ ] Take response from aliceHttp and send to /api/pushMessage of Bob
// [ ] Verify that both Alice's DB and Bob's DB now have the correct data

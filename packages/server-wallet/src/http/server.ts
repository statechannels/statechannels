import express from 'express';
import bodyParser from 'body-parser';
import * as jayson from 'jayson';
import {configureEnvVariables} from '@statechannels/devtools';

import '../db/connection'; // This is how the DB is "connected"

import {Wallet, AddressedMessage} from '../wallet';

configureEnvVariables();

const app = express();

// Should we use this?
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

// TODO: Request and response types are not as defined in client-api-schema
// TODO: Type error responses in a way that doesn't wrap them inside JsonRpc boilerplate

const jsonRpcServer = new jayson.Server({
  pushMessage: async (
    args: AddressedMessage,
    callback: (err: any, ret?: ThenArg<ReturnType<typeof myWallet.pushMessage>>) => void
  ): Promise<void> => {
    try {
      callback(null, await myWallet.pushMessage(args));
    } catch (e) {
      callback(e.toString());
    }
  },

  // TODO: Implement more methods
  // createChannel: (): void => { return; },
  // joinChannel: (): void => { return; },
  // updateChannel: (): void => { return; },
  // closeChannel: (): void => { return; },
  // getChannels: (): void => { return; },
  // onNotification: (): void => { return; },
});

app.use(bodyParser.json());
app.use(jsonRpcServer.middleware());

const myWallet = new Wallet();

// eslint-disable-next-line
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`[App]: Listening on port ${port}`);
});

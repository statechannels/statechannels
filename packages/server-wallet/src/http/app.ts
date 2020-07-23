import express from 'express';
import bodyParser from 'body-parser';
import {Server, Method} from 'jayson';
import {configureEnvVariables} from '@statechannels/devtools';

import '../db/connection'; // This is how the DB is "connected"

import {Wallet, WalletInterface} from '../wallet';

configureEnvVariables();

const app = express();

// TODO: Request and response types are not as defined in client-api-schema
// TODO: Type error responses in a way that doesn't wrap them inside JsonRpc boilerplate

const jsonRpcServer = new Server(
  {},
  {
    router: function(
      // TODO: Type method type
      method: any
    ): Method {
      const wrapAsyncWalletMethod = (wallet: Wallet, method: keyof WalletInterface): Method =>
        new Method(async function(args: any, done: any) {
          let err = null;
          let ret = undefined;
          try {
            ret = await wallet[method](args);
          } catch (e) {
            err = e;
          } finally {
            done(err, ret);
          }
        });

      switch (method) {
        // TODO: Remove
        case 'example':
          return new Method(function(args: any, done: any) {
            done(null, 'hello');
          });

        case 'CreateChannel':
          return wrapAsyncWalletMethod(myWallet, 'createChannel');

        case 'UpdateChannel':
          return wrapAsyncWalletMethod(myWallet, 'updateChannel');

        case 'CloseChannel':
          return wrapAsyncWalletMethod(myWallet, 'closeChannel');

        case 'PushMessage':
          return wrapAsyncWalletMethod(myWallet, 'pushMessage');

        // TODO: Add the other methods here

        default:
          return new Method((args: any, done: any) =>
            done({code: 404, message: `Wallet does not implement ${method}`})
          );
      }
    },
  }
);

app.use(bodyParser.json());
app.use(jsonRpcServer.middleware());

const myWallet = new Wallet();

export default app;

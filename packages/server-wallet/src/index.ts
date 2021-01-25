/**
 * @packageDocumentation Spin up Nitro wallets in a node-js environment
 *
 * @remarks
 * To create an instance of the exported Wallet class, pass in a configuration object specifying a connection to a database.
 * Then, use the API of this instance, along with your messaging system, to run state channels with counterparties running compatible wallets.
 *
 * Example usage:
 * ```typescript
 *  const wallet = Wallet.create(config);
 *
 *  const createChannelParams: CreateChannelParams = {
 *      participants,
 *      allocations,
 *      appDefinition,
 *      appData,
 *      fundingStrategy,
 *      challengeDuration: ONE_DAY,
 *      };
 *  await wallet.createChannel(createChannelArgs);
 * ```
 */
export {Payload as Message} from '@statechannels/wallet-core';

export * from './wallet';
export {Outgoing} from './protocols/actions';

export {DBAdmin} from './db-admin/db-admin';

/**
 * @packageDocumentation Communicate with a statechannels wallet via JSON-RPC over postMessage
 *
 * @remarks
 * Attaches a channelProvider to the window object.
 */
// Anything exported by this file will be exposed to `window`.

export {channelProvider, IFrameChannelProvider} from './channel-provider';

export * from './types';

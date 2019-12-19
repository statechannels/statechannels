interface Window {
  channelProvider: import('@statechannels/channel-provider').ChannelProviderInterface;
  // TODO: Find typings for ethereum. It is harder than it seems because these are the
  // specific objects injected by MetaMask which are _not_ what @types/web3 or web3 provide,
  // even at the version revealed by window.web3.version.
  ethereum: any;
}
declare var artifacts: any;
declare var contract: any;
declare var before: any;
declare var assert: any;
declare module '*.png';
declare module '*.svg';
declare module '*.json' {
  const value: any;
  export default value;
}

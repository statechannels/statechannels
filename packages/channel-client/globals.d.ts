interface Window {
  // TODO: Find typings for ethereum. It is harder than it seems because these are the
  // specific objects injected by MetaMask which are _not_ what @types/web3 or web3 provide,
  // even at the version revealed by window.web3.version.
  ethereum: any;
}

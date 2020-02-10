export interface NetworkChanged {
  type: 'NetworkChanged';
  network: number;
}

export const networkChanged: (network: number) => NetworkChanged = network => ({
  type: 'NetworkChanged',
  network,
});

export type MetamaskAction = NetworkChanged;

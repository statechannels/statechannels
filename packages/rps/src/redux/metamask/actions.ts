export interface NetworkChanged {
  type: 'NetworkChanged';
  network: number;
}

export interface AccountsChanged {
  type: 'AccountsChanged';
  accounts: string[];
}

export interface Enable {
  type: 'Enable';
}

export const networkChanged: (network: number) => NetworkChanged = network => ({
  type: 'NetworkChanged',
  network,
});

export const accountsChanged: (accounts: string[]) => AccountsChanged = accounts => ({
  type: 'AccountsChanged',
  accounts,
});

export const enable: () => Enable = () => ({
  type: 'Enable',
});

export type MetamaskAction = NetworkChanged | AccountsChanged | Enable;

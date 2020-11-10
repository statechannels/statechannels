import {
  Address,
  makeAddress,
  makePrivateKey,
  PrivateKey,
  signState,
  State,
} from '@statechannels/wallet-core';

type LiteSigningWallet = {
  privateKey: PrivateKey;
  address: Address;
  signState: (state: State) => {signer: Address; signature: string};
};

export const alice = (): LiteSigningWallet => {
  const address = makeAddress('0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf');
  const privateKey = makePrivateKey(
    '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
  );
  return {
    privateKey,
    address,
    signState: (state: State) => ({signer: address, signature: signState(state, privateKey)}),
  };
};

export const bob = (): LiteSigningWallet => {
  const address = makeAddress('0x2222E21c8019b14dA16235319D34b5Dd83E644A9');
  const privateKey = makePrivateKey(
    '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
  );
  return {
    privateKey,
    address,
    signState: (state: State) => ({signer: address, signature: signState(state, privateKey)}),
  };
};

export const charlie = (): LiteSigningWallet => {
  const address = makeAddress('0x33335846dd121B14B4C313Cb6b766F09e75890dF');
  const privateKey = makePrivateKey(
    '0xc9a5f30ceaf2a0ccbb30d50aa9de3f273aa6e76f89e26090c42775e9647f5b6a'
  );
  return {
    privateKey,
    address,
    signState: (state: State) => ({signer: address, signature: signState(state, privateKey)}),
  };
};

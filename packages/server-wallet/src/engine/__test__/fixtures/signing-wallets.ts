import {SigningWallet} from '../../../models/signing-wallet';

export const alice = (): SigningWallet =>
  SigningWallet.fromJson({
    // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf
    privateKey: '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318',
  });

export const bob = (): SigningWallet =>
  SigningWallet.fromJson({
    // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9
    privateKey: '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727',
  });

export const charlie = (): SigningWallet =>
  SigningWallet.fromJson({
    // 0x33335846dd121B14B4C313Cb6b766F09e75890dF
    privateKey: '0xc9a5f30ceaf2a0ccbb30d50aa9de3f273aa6e76f89e26090c42775e9647f5b6a',
  });

import { ethers } from 'ethers';

import { Participant } from '../store';

export const wallet1 = new ethers.Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf

export const wallet2 = new ethers.Wallet(
  '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
); // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9

export const first: Participant = {
  signingAddress: wallet1.address,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000001',
  participantId: 'first',
};
export const second: Participant = {
  signingAddress: wallet2.address,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000002',
  participantId: 'second',
};
export const participants = [first, second];

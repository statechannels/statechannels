import { ethers } from 'ethers';
import { State } from '@statechannels/nitro-protocol';

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

const appState: State = {
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  appDefinition: '0x0000000000000000000000000000000000000000',
  isFinal: false,
  turnNum: 3,
  outcome: [
    {
      assetHolderAddress: '0x0000000000000000000000000000000000000000',
      allocation: [
        {
          destination: '0x0000000000000000000000000000000000000000000000000000000000000001',
          amount: '3',
        },
        {
          destination: '0x0000000000000000000000000000000000000000000000000000000000000002',
          amount: '1',
        },
      ],
    },
  ],
  channel: {
    participants: [
      '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
      '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
    ],
    channelNonce: '0x01',
    chainId: '0x01',
  },
  challengeDuration: 1,
};

const ledgerState: State = {
  turnNum: 3,
  outcome: [
    {
      assetHolderAddress: '0x0000000000000000000000000000000000000000',
      allocation: [
        {
          destination: '0xb9500857552943ae5ef6c2a046e311560c296c474aa47a3d13614d1ac98bd1a6',
          amount: '0x04',
        },
      ],
    },
  ],
  channel: {
    participants: [
      '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
      '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
    ],
    channelNonce: '0x02',
    chainId: '0x01',
  },
  isFinal: false,
  challengeDuration: 1,
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  appDefinition: '0x0000000000000000000000000000000000000000',
};

export const storeWithFundedChannel = privateKey => ({
  _nonces: {
    '["0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf","0x2222E21c8019b14dA16235319D34b5Dd83E644A9"]':
      '0x02',
  },
  _store: {
    '0xb9500857552943ae5ef6c2a046e311560c296c474aa47a3d13614d1ac98bd1a6': {
      states: [
        {
          state: appState,
          signatures: [
            {
              r: '0x5f8db15d8dfd24d53a0ebb1089eca2aee5bbb5ba18a288b25c767c846a34bd83',
              s: '0x7adde739be2ec604094cbbd3ac12a20b4c5b9ea33a08e850570139a96f5561a7',
              recoveryParam: 1,
              v: 28,
            },
            {
              r: '0x069407e958cfc8e00bc7cd752ad57cd9d5705f981fb5ec0a5857fbb92fff94ff',
              s: '0x67e2ee147b8a8e687b19af3bb66fc1867b18cebac4a7ab0aff6611382199c8af',
              recoveryParam: 1,
              v: 28,
            },
          ],
        },
      ],
      privateKey,
      participants,
      channel: appState.channel,
      funding: {
        type: 'Indirect' as 'Indirect',
        ledgerId: '0x3dc8e97155e1d74f9ba973780ced196d0d0974a2c387e20db58871b39641a136',
      },
    },
    '0x3dc8e97155e1d74f9ba973780ced196d0d0974a2c387e20db58871b39641a136': {
      states: [
        {
          state: ledgerState,
          signatures: [
            {
              r: '0xc30eff828df4d1a2774f6f856b191aac130dc3bae395a3d2c9ee9a31d7c3b01c',
              s: '0x0033e48e1badf9dded096a78b484e32fbd43b2b8064c190fbe5b4d7e0e588b46',
              recoveryParam: 0,
              v: 27,
            },
            {
              r: '0xe11bdb357c204ef94f2a5034d78df757f133c7e8789182aede440d606bef032a',
              s: '0x0c4006d2a345ef74693c29ae6f4e4eb1ab10610d9520f42c96f74e1fd78b0142',
              recoveryParam: 1,
              v: 28,
            },
          ],
        },
      ],
      privateKey,
      participants,
      channel: ledgerState.channel,
    },
  },
  _privateKeys: {
    [new ethers.Wallet(privateKey).address]: privateKey,
  },
  _chain: {
    _holdings: {
      '0x3dc8e97155e1d74f9ba973780ced196d0d0974a2c387e20db58871b39641a136': '0x04',
    },
  },
});

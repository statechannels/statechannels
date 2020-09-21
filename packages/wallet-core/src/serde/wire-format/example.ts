import {Message as WireMessage, SignedState as WireState} from '@statechannels/wire-format';

import {BN} from '../../bignumber';
import {Payload, SignedState} from '../../types';
import {makeDestination} from '../../utils';
import {calculateChannelId} from '../../state-utils';

export const wireStateFormat: WireState = {
  participants: [
    {
      destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
      participantId: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
      signingAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf' // key: 0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318
    },
    {
      destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
      participantId: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
      signingAddress: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9' // key: 0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727
    }
  ],
  appData:
    '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004444444444444444444444444444444444444444444444444444444444444444',
  appDefinition: '0x430869383d611bBB1ce7Ca207024E7901bC26b40',
  challengeDuration: 1184,
  channelId: '0xb08bc94ebfbe1b23c419bec2d57993d33c41b112fbbca5d51f0f18194baadcf1',
  chainId: '0x2329',
  channelNonce: 123,
  isFinal: false,
  outcome: [
    {
      allocationItems: [
        {
          amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000',
          destination: '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
        },
        {
          amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000',
          destination: '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
        }
      ],
      assetHolderAddress: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57'
    }
  ],
  turnNum: 1,
  signatures: [
    '0xef7e226a43c52d4b8f7b14f13acdf9e75d871ea5c51235fbc4d538acf84c61c4727431f0cc83d0f566e222a21d35ae4d8d2a0dd4428cba7bf95bf7b3f11ad0c61c'
  ]
};

const wireStateFormat2: WireState = {
  ...wireStateFormat,
  channelNonce: 124,
  channelId: '0x583e42e295214b60ad730c15547584c11edb05032d92e4c781ad61d0c193a5fb',
  outcome: [
    {
      assetHolderAddress: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57',
      destinations: ['0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'],
      targetChannelId: '0xb08bc94ebfbe1b23c419bec2d57993d33c41b112fbbca5d51f0f18194baadcf1'
    }
  ],
  signatures: []
};

export const internalStateFormat: SignedState = {
  participants: [
    {
      destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
      participantId: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
      signingAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'
    },
    {
      destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
      participantId: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
      signingAddress: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9'
    }
  ],
  appData:
    '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004444444444444444444444444444444444444444444444444444444444444444',
  appDefinition: '0x430869383d611bBB1ce7Ca207024E7901bC26b40',
  challengeDuration: 0x00000000000000000000000000000000000000000000000000000000000004a0,
  chainId: '0x2329',
  channelNonce: 123,
  isFinal: false,
  outcome: {
    type: 'SimpleAllocation',
    assetHolderAddress: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57',
    allocationItems: [
      {
        amount: BN.from('0x00000000000000000000000000000000000000000000000006f05b59d3b20000'),
        destination: makeDestination(
          '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
        )
      },
      {
        amount: BN.from('0x00000000000000000000000000000000000000000000000006f05b59d3b20000'),
        destination: makeDestination(
          '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
        )
      }
    ]
  },
  turnNum: 1,
  signatures: [
    {
      signature:
        '0xef7e226a43c52d4b8f7b14f13acdf9e75d871ea5c51235fbc4d538acf84c61c4727431f0cc83d0f566e222a21d35ae4d8d2a0dd4428cba7bf95bf7b3f11ad0c61c',
      signer: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9'
    }
  ]
};

export const internalStateFormat2: SignedState = {
  ...internalStateFormat,
  channelNonce: internalStateFormat.channelNonce + 1,
  outcome: {
    assetHolderAddress: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57',
    type: 'SimpleGuarantee',
    targetChannelId: calculateChannelId(internalStateFormat),
    destinations: [makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7')]
  },
  signatures: []
};

export const wireMessageFormat: WireMessage = {
  recipient: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
  sender: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
  data: {
    signedStates: [wireStateFormat, wireStateFormat2],
    objectives: [
      {
        type: 'OpenChannel',
        data: {
          targetChannelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967',
          fundingStrategy: 'Direct'
        },
        participants: [
          {
            destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
            participantId: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
            signingAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'
          },
          {
            destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
            participantId: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
            signingAddress: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9'
          }
        ]
      }
    ],
    requests: [
      {
        type: 'GetChannel',
        channelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967'
      }
    ]
  }
};

export const internalMessageFormat: Payload = {
  signedStates: [internalStateFormat, internalStateFormat2],
  objectives: [
    {
      type: 'OpenChannel',
      data: {
        targetChannelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967',
        fundingStrategy: 'Direct'
      },
      participants: [
        {
          destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
          participantId: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
          signingAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'
        },
        {
          destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
          participantId: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
          signingAddress: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9'
        }
      ]
    }
  ],
  requests: [
    {
      type: 'GetChannel',
      channelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967'
    }
  ]
};

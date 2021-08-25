import {Message as WireMessage, SignedState as WireState} from '@statechannels/wire-format';
import {AllocationType} from '@statechannels/exit-format';

import {BN} from '../../bignumber';
import {makeAddress, Payload, SignedState, Uint256} from '../../types';
import {makeDestination} from '../../utils';
import {calculateChannelId} from '../../state-utils';

export const walletVersion = 'someWalletVersion';

// NOTE ABOUT GENERATING THE SIGNATURES IN THIS FILE
// A quick and dirty method is to use
// console.log(
//   signState(
//     deserializeState(wireStateFormat),
//     '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
//   )
// );
// but you will need to disable the check (in nitro-protocol) that throws if the signature is incorrect
// (i.e. recovers to a non participant)

export const wireStateFormat: WireState = {
  participants: [
    {
      destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
      participantId: '0x11115faf6f1bf263e81956f0cc68aec8426607cf',
      signingAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf' // key: 0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318
    },
    {
      destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
      participantId: '0x2222e21c8019b14da16235319d34b5dd83e644a9',
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
      allocations: [
        {
          amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000',
          destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
          metadata: '0x',
          allocationType: AllocationType.simple
        },
        {
          amount: '0x00000000000000000000000000000000000000000000000006f05b59d3b20000',
          destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
          metadata: '0x',
          allocationType: AllocationType.simple
        }
      ],
      asset: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57',
      metadata: '0x'
    }
  ],
  turnNum: 1,
  signatures: [
    '0x6ad8005aa8cb0d6decae9d6e8e84df853f8d625a3a8728d8e4d2053e6333011632c586d40e34ff3104fa3be00f9172d89f0a5bb43587fd55eeefc7549765749d1c' // SEE NOTE ABOVE ABOUT GENERATING THIS
  ]
};

const wireStateFormat2: WireState = {
  ...wireStateFormat,
  channelNonce: 124,
  channelId: '0x583e42e295214b60ad730c15547584c11edb05032d92e4c781ad61d0c193a5fb',
  outcome: [
    {
      asset: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57',
      metadata: '0x',
      allocations: [
        {
          destination: '0xb08bc94ebfbe1b23c419bec2d57993d33c41b112fbbca5d51f0f18194baadcf1',
          amount: '0x0000000000000000000000000000000000000000000000000000000000000055',
          metadata: '0xdeadbeef',
          allocationType: AllocationType.guarantee
        }
      ]
    }
  ],
  signatures: []
};

export const internalStateFormat: SignedState = {
  participants: [
    {
      destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
      participantId: '0x11115faf6f1bf263e81956f0cc68aec8426607cf',
      signingAddress: makeAddress('0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf')
    },
    {
      destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
      participantId: '0x2222e21c8019b14da16235319d34b5dd83e644a9',
      signingAddress: makeAddress('0x2222e21c8019b14da16235319d34b5dd83e644a9')
    }
  ],
  appData:
    '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004444444444444444444444444444444444444444444444444444444444444444',
  appDefinition: makeAddress('0x430869383d611bBB1ce7Ca207024E7901bC26b40'),
  challengeDuration: 0x00000000000000000000000000000000000000000000000000000000000004a0,
  chainId: '0x2329',
  channelNonce: 123,
  isFinal: false,
  outcome: [
    {
      asset: makeAddress('0x4ad3F07BEFDC54511449A1f553E36A653c82eA57'),
      metadata: '0x',
      allocations: [
        {
          amount: BN.from('0x00000000000000000000000000000000000000000000000006f05b59d3b20000'),
          destination: makeDestination(
            '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
          ),
          metadata: '0x',
          allocationType: AllocationType.simple
        },
        {
          amount: BN.from('0x00000000000000000000000000000000000000000000000006f05b59d3b20000'),
          destination: makeDestination(
            '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
          ),
          metadata: '0x',
          allocationType: AllocationType.simple
        }
      ]
    }
  ],
  turnNum: 1,
  signatures: [
    {
      signature:
        '0x6ad8005aa8cb0d6decae9d6e8e84df853f8d625a3a8728d8e4d2053e6333011632c586d40e34ff3104fa3be00f9172d89f0a5bb43587fd55eeefc7549765749d1c',
      signer: makeAddress('0x2222e21c8019b14da16235319d34b5dd83e644a9')
    }
  ]
};

export const internalStateFormat2: SignedState = {
  ...internalStateFormat,
  channelNonce: internalStateFormat.channelNonce + 1,
  outcome: [
    {
      asset: makeAddress('0x4ad3F07BEFDC54511449A1f553E36A653c82eA57'),
      metadata: '0x',
      allocations: [
        {
          destination: makeDestination(calculateChannelId(internalStateFormat)),
          amount: BN.from('0x0000000000000000000000000000000000000000000000000000000000000055'),
          metadata: '0xdeadbeef',
          allocationType: AllocationType.guarantee
        }
      ]
    }
  ],
  signatures: []
};

export const wireMessageFormat: WireMessage = {
  recipient: '0x11115faf6f1bf263e81956f0cc68aec8426607cf',
  sender: '0x2222e21c8019b14da16235319d34b5dd83e644a9',
  data: {
    walletVersion,
    signedStates: [wireStateFormat, wireStateFormat2],
    objectives: [
      {
        type: 'OpenChannel',
        data: {
          targetChannelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967',
          fundingStrategy: 'Direct',
          role: 'app'
        },
        participants: [
          {
            destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
            participantId: '0x11115faf6f1bf263e81956f0cc68aec8426607cf',
            signingAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'
          },
          {
            destination: '0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7',
            participantId: '0x2222e21c8019b14da16235319d34b5dd83e644a9',
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
  walletVersion,
  signedStates: [internalStateFormat, internalStateFormat2],
  objectives: [
    {
      type: 'OpenChannel',
      data: {
        targetChannelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967',
        fundingStrategy: 'Direct',
        role: 'app'
      },
      participants: [
        {
          destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
          participantId: '0x11115faf6f1bf263e81956f0cc68aec8426607cf',
          signingAddress: makeAddress('0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf')
        },
        {
          destination: makeDestination('0x63E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'),
          participantId: '0x2222e21c8019b14da16235319d34b5dd83e644a9',
          signingAddress: makeAddress('0x2222e21c8019b14da16235319d34b5dd83e644a9')
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

import {BigNumber} from 'ethers';
import {Message, SignedState} from '../../store/types';
import {Message as WireMessage, SignedState as WireState} from '@statechannels/wire-format';
import {makeDestination} from '../../utils';
import {calculateChannelId} from '../../store/state-utils';

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
  challengeDuration: '0x00000000000000000000000000000000000000000000000000000000000004a0',
  channelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967',
  chainId: '0x2329',
  channelNonce: '0x11b1a311d845ca99f8e3c9a5f828f574b1afe2c3a0eb8cd51115dff18f0f34a0',
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
  turnNum: '0x0000000000000000000000000000000000000000000000000000000000000001',
  signatures: [
    '0x13151e7faaa5524a223869ba2fbb20419031049defc685dda8e7b35bcfc797c56c7ac82ff32fb02ce618c73efb8a233479ad2bbc25b9c1d67ded33517d4d5ff51c'
  ]
};

const wireStateFormat2: WireState = {
  ...wireStateFormat,
  channelNonce: '0x11b1a311d845ca99f8e3c9a5f828f574b1afe2c3a0eb8cd51115dff18f0f34a1',
  channelId: '0x2efa65eb2b780f3a838c431a019d52392aebec6898056eee5688c5fbe00c63d2',
  outcome: [
    {
      assetHolderAddress: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57',
      destinations: ['0x00000000000000000000000063E3FB11830c01ac7C9C64091c14Bb6CbAaC9Ac7'],
      targetChannelId: '0x59fb8a0bff0f4553b0169d4b6cad93f3baa9edd94bd28c954ae0ad1622252967'
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
  challengeDuration: BigNumber.from(
    '0x00000000000000000000000000000000000000000000000000000000000004a0'
  ),
  chainId: '0x2329',
  channelNonce: BigNumber.from(
    '0x11b1a311d845ca99f8e3c9a5f828f574b1afe2c3a0eb8cd51115dff18f0f34a0'
  ),
  isFinal: false,
  outcome: {
    type: 'SimpleAllocation',
    assetHolderAddress: '0x4ad3F07BEFDC54511449A1f553E36A653c82eA57',
    allocationItems: [
      {
        amount: BigNumber.from(
          '0x00000000000000000000000000000000000000000000000006f05b59d3b20000'
        ),
        destination: makeDestination(
          '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
        )
      },
      {
        amount: BigNumber.from(
          '0x00000000000000000000000000000000000000000000000006f05b59d3b20000'
        ),
        destination: makeDestination(
          '0x00000000000000000000000063e3fb11830c01ac7c9c64091c14bb6cbaac9ac7'
        )
      }
    ]
  },
  turnNum: BigNumber.from('0x0000000000000000000000000000000000000000000000000000000000000001'),
  signatures: [
    {
      signature:
        '0x13151e7faaa5524a223869ba2fbb20419031049defc685dda8e7b35bcfc797c56c7ac82ff32fb02ce618c73efb8a233479ad2bbc25b9c1d67ded33517d4d5ff51c',
      signer: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9'
    }
  ]
};

export const internalStateFormat2: SignedState = {
  ...internalStateFormat,
  channelNonce: internalStateFormat.channelNonce.add(1),
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
    ]
  }
};

export const internalMessageFormat: Message = {
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
  ]
};

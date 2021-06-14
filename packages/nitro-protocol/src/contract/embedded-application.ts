import {defaultAbiCoder, ParamType} from '@ethersproject/abi';
import {Signature} from '@ethersproject/bytes';

import {FixedPart, VariablePart} from './state';
import {Bytes, Bytes32} from './types';

export interface SupportProof {
  fixedPart: FixedPart;
  variableParts: [VariablePart, VariablePart] | [VariablePart];
  turnNumTo: number;
  sigs: [Signature, Signature];
  whoSignedWhat: [number, number];
}

export enum AlreadyMoved {
  'None',
  'A',
  'B',
  'AB',
}
export interface EmbeddedApplicationData {
  channelIdForX: Bytes32;
  supportProofForX: SupportProof;
  alreadyMoved: AlreadyMoved;
}

export function encodeEmbeddedApplicationData(data: EmbeddedApplicationData): Bytes {
  return defaultAbiCoder.encode(
    [
      {
        type: 'tuple',
        components: [
          {name: 'channelIdForX', type: 'bytes32'},
          {
            name: 'supportProofForX',
            type: 'tuple',
            components: [
              {
                name: 'fixedPart',
                type: 'tuple',
                components: [
                  {name: 'chainId', type: 'uint256'},
                  {name: 'participants', type: 'address[]'},
                  {name: 'channelNonce', type: 'uint48'},
                  {name: 'appDefinition', type: 'address'},
                  {name: 'challengeDuration', type: 'uint48'},
                ],
              },
              {
                name: 'variableParts',
                type: 'tuple[]',
                components: [
                  {name: 'outcome', type: 'bytes'},
                  {name: 'appData', type: 'bytes'},
                ],
              },
              {name: 'turnNumTo', type: 'uint48'},
              {
                name: 'sigs',
                type: 'tuple[2]',
                components: [
                  {name: 'v', type: 'uint8'},
                  {name: 'r', type: 'bytes32'},
                  {name: 's', type: 'bytes32'},
                ],
              },
              {name: 'whoSignedWhat', type: 'uint8[2]'},
            ],
          },
          {name: 'alreadyMoved', type: 'uint8'},
        ],
      } as ParamType,
    ],
    [data]
  );
}

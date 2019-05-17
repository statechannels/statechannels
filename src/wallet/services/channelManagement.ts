import { SignedCommitment } from '.';
import { HUB_PRIVATE_KEY } from '../../constants';

import { Commitment, CommitmentType, sign, Signature } from 'fmg-core';
import { AppAttrSanitizer, AppCommitment } from '../../types';
import AllocatorChannelCommitment from '../models/allocatorChannelCommitment';
export function validSignature(commitment: Commitment, signature: Signature): boolean {
  console.warn('Signature not validated');
  return commitment && signature && true;
  // return recover(toHex(commitment), signature) === mover(commitment);
}

export function formResponse(
  commitment: AllocatorChannelCommitment,
  sanitize: AppAttrSanitizer,
): SignedCommitment {
  const signature = sign(commitment.toHex(sanitize), HUB_PRIVATE_KEY);

  return { commitment: commitment.asCoreCommitment(sanitize), signature };
}

export function nextCommitment(theirCommitment: AppCommitment): AppCommitment {
  const appAttrType = typeof theirCommitment.appAttributes;

  if (theirCommitment.commitmentType === CommitmentType.App) {
    throw new Error('commitmentType cannot be CommitmentType.App');
  }

  let ourCommitment: typeof theirCommitment;
  switch (theirCommitment.commitmentType) {
    case CommitmentType.PreFundSetup:
      ourCommitment = {
        ...theirCommitment,
        turnNum: theirCommitment.turnNum + 1,
        commitmentCount: theirCommitment.commitmentCount + 1,
      };

      break;
    case CommitmentType.PostFundSetup:
      ourCommitment = {
        ...theirCommitment,
        turnNum: theirCommitment.turnNum + 1,
        commitmentCount: theirCommitment.commitmentCount + 1,
      };
      break;

    case CommitmentType.Conclude:
      ourCommitment = {
        ...theirCommitment,
        turnNum: theirCommitment.turnNum + 1,
        commitmentCount: theirCommitment.commitmentCount + 1,
      };
  }

  if (typeof ourCommitment.appAttributes !== appAttrType) {
    // TODO: Does this actually enforce that the types match?
    throw new Error(
      'Type error: typeof ourCommitment.appAttributes must match typeof theirCommitment.appAttributes',
    );
  }

  return ourCommitment;
}

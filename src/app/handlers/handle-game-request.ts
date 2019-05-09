import { ethers } from 'ethers';
import { Signature } from 'fmg-core';
import { errors } from '../../wallet';
import { updateRPSChannel } from '../services/rpsChannelManager';
export async function handleGameRequest(ctx) {
  try {
    let body;
    const { commitment: theirCommitment, signature: theirSignature } = ctx.request.body;
    const { commitment, signature } = await updateRPSChannel(
      theirCommitment,
      (ethers.utils.splitSignature(theirSignature) as unknown) as Signature,
    );
    body = { status: 'success', commitment, signature };
    if (body.commitment) {
      ctx.status = 201;
      ctx.body = body;
    } else {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        message: 'Something went wrong.',
      };
    }
  } catch (err) {
    switch (err) {
      case errors.CHANNEL_EXISTS:
      case errors.COMMITMENT_NOT_SIGNED:
      case errors.CHANNEL_MISSING:
      case errors.COMMITMENT_NOT_SIGNED:
        {
          ctx.status = 400;
          ctx.body = {
            status: 'error',
            message: err.message,
          };
        }
        break;
      default:
        throw err;
    }
  }
  return ctx;
}

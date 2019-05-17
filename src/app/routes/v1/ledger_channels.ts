import * as koaBody from 'koa-body';
import * as Router from 'koa-router';

import { channelID } from 'fmg-core';
import { appAttributesFromBytes, bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import Wallet, { errors } from '../../../wallet';
import AllocatorChannel from '../../../wallet/models/allocatorChannel';
import AllocatorChannelCommitment from '../../../wallet/models/allocatorChannelCommitment';
export const BASE_URL = `/api/v1/ledger_channels`;

const router = new Router();

const wallet = new Wallet(x => bytesFromAppAttributes);

router.post(`${BASE_URL}`, koaBody(), async ctx => {
  try {
    let body;
    const { commitment: theirCommitment, signature: theirSignature } = ctx.request.body;

    if (theirCommitment.turnNum == 0) {
      const { commitment, signature } = await wallet.openLedgerChannel(
        {
          ...theirCommitment,
          appAttributes: appAttributesFromBytes(theirCommitment.appAttributes),
        },
        theirSignature,
      );
      body = { status: 'success', commitment, signature };
    } else {
      const currentCommitment = await getCurrentCommitment(theirCommitment);
      const { commitment, signature } = await wallet.updateLedgerChannel(
        currentCommitment,
        {
          ...theirCommitment,
          appAttributes: appAttributesFromBytes(theirCommitment.appAttributes),
        },
        theirSignature,
      );
      body = { status: 'success', commitment, signature };
    }

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
      case errors.COMMITMENT_NOT_SIGNED: {
        ctx.status = 400;
        ctx.body = {
          status: 'error',
          message: err.message,
        };

        return;
      }
      default:
        throw err;
    }
  }
});

export const ledgerChannelRoutes = router.routes();
async function getCurrentCommitment(theirCommitment: any) {
  const { channel } = theirCommitment;
  const channel_id = channelID(channel);
  const allocatorChannel = await AllocatorChannel.query()
    .where({ channel_id })
    .select('id')
    .first();
  if (!allocatorChannel) {
    console.warn(channel_id);
    throw errors.CHANNEL_MISSING;
  }
  const currentCommitment = await AllocatorChannelCommitment.query()
    .where({ allocatorChannelId: allocatorChannel.id })
    .orderBy('turn_number', 'desc')
    .select()
    .first();
  return currentCommitment;
}

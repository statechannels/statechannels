import * as koaBody from 'koa-body';
import * as Router from 'koa-router';

import {
  appAttributesFromBytes,
  bytesFromAppAttributes,
} from 'fmg-nitro-adjudicator/lib/consensus-app';
import Wallet, { errors } from '../../../wallet';
import { getCurrentCommitment } from '../../../wallet/db/queries/getCurrentCommitment';
import { asConsensusCommitment } from '../../../wallet/services/ledger-commitment';
export const BASE_URL = `/api/v1/ledger_channels`;

const router = new Router();

const wallet = new Wallet(x => bytesFromAppAttributes);

router.post(`${BASE_URL}`, koaBody(), async ctx => {
  try {
    let body;
    const { commitment: theirCommitment, signature: theirSignature } = ctx.request.body;

    const currentCommitment = await getCurrentCommitment(theirCommitment);
    const { commitment, signature } = await wallet.updateLedgerChannel(
      {
        ...theirCommitment,
        appAttributes: appAttributesFromBytes(theirCommitment.appAttributes),
      },
      theirSignature,
      asConsensusCommitment(currentCommitment),
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

import { ethers } from 'ethers';
import { Signature } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { appAttributesFromBytes } from 'fmg-nitro-adjudicator';
import { communication, RelayableAction } from 'magmo-wallet';
import { HUB_ADDRESS } from '../../constants';
import { errors } from '../../wallet';
import { getProcess } from '../../wallet/db/queries/walletProcess';
import { updateLedgerChannel } from '../../wallet/services';
import { Blockchain } from '../../wallet/services/blockchain';

export async function handleOngoingProcessAction(ctx) {
  const action: RelayableAction = ctx.request.body;
  switch (action.type) {
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
      return ctx;
    case 'WALLET.COMMON.COMMITMENT_RECEIVED': {
      const { processId } = action;
      const walletProcess = await getProcess(processId);
      if (!walletProcess) {
        throw errors.processMissing(processId);
      }
      const { theirAddress } = walletProcess;
      const { commitment: theirCommitment, signature: theirSignature } = action.signedCommitment;

      const { commitment, signature } = await updateLedgerChannel(
        {
          ...theirCommitment,
          appAttributes: appAttributesFromBytes(theirCommitment.appAttributes),
        },
        (ethers.utils.splitSignature(theirSignature) as unknown) as Signature,
      );
      ctx.body = communication.sendCommitmentReceived(
        theirAddress,
        processId,
        commitment,
        (signature as unknown) as string,
      );

      if (process.env.NODE_ENV !== 'test') {
        // TODO: Figure out how to test this.
        const expectedHeld =
          theirCommitment.allocation[1 - theirCommitment.destination.indexOf(HUB_ADDRESS)];
        const funding =
          theirCommitment.allocation[theirCommitment.destination.indexOf(HUB_ADDRESS)];

        setTimeout(async () => {
          // For the moment, we delay the deposit to give the user a chance to deposit.
          await Blockchain.fund(channelID(theirCommitment.channel), expectedHeld, funding);
        }, 4000);
      }

      return ctx;
    }
    case 'WALLET.FUNDING.STRATEGY_PROPOSED': {
      const { processId } = action;
      const process = await getProcess(processId);
      if (!process) {
        throw errors.processMissing(processId);
      }

      const { theirAddress } = process;
      ctx.body = communication.sendStrategyApproved(theirAddress, processId);
      ctx.status = 200;

      return ctx;
    }
  }
}

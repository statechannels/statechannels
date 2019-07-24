import { ethers } from 'ethers';
import { channelID, Signature } from 'fmg-core';
import { SignedCommitment as ClientSignedCommitment, unreachable } from 'magmo-wallet';

import {
  CommitmentReceived,
  CommitmentsReceived,
  RelayableAction,
  StrategyProposed,
} from 'magmo-wallet/lib/src/communication';
import * as communication from 'magmo-wallet/lib/src/communication';
import { errors } from '../../wallet';
import { getCurrentCommitment } from '../../wallet/db/queries/getCurrentCommitment';

import { getProcess } from '../../wallet/db/queries/walletProcess';
import { SignedCommitment, updateLedgerChannel } from '../../wallet/services';
import { asConsensusCommitment } from '../../wallet/services/ledger-commitment';

import { HUB_ADDRESS } from '../../constants';
import { updateRPSChannel } from '../services/rpsChannelManager';

export async function handleOngoingProcessAction(ctx) {
  const action: RelayableAction = ctx.request.body;
  switch (action.type) {
    case 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED':
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED':
    case 'WALLET.NEW_PROCESS.DEFUND_REQUESTED':
    case 'WALLET.MULTIPLE_RELAYABLE_ACTIONS':
      return ctx;
    case 'WALLET.COMMON.COMMITMENT_RECEIVED':
      return handleCommitmentReceived(ctx, action);
    case 'WALLET.COMMON.COMMITMENTS_RECEIVED':
      return handleCommitmentsReceived({ ctx, action });
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED':
      return handleStrategyProposed(ctx, action);
    default:
      return unreachable(action);
  }
}

async function handleStrategyProposed(ctx, action: StrategyProposed) {
  const { processId, strategy } = action;
  const process = await getProcess(processId);
  if (!process) {
    throw errors.processMissing(processId);
  }

  const { theirAddress } = process;
  ctx.body = communication.sendStrategyApproved(theirAddress, processId, strategy);
  ctx.status = 200;

  return ctx;
}

async function handleCommitmentReceived(ctx, action: CommitmentReceived) {
  {
    const { processId } = action;
    const walletProcess = await getProcess(processId);
    if (!walletProcess) {
      throw errors.processMissing(processId);
    }
    const { theirAddress } = walletProcess;

    const { commitment: theirCommitment, signature: theirSignature } = action.signedCommitment;
    const splitSignature = (ethers.utils.splitSignature(theirSignature) as unknown) as Signature;

    const channelId = channelID(theirCommitment.channel);

    if (channelId === walletProcess.appChannelId) {
      const { commitment: ourCommitment, signature: ourSignature } = await updateRPSChannel(
        theirCommitment,
        splitSignature,
      );
      ctx.body = communication.sendCommitmentReceived(
        theirAddress,
        processId,
        ourCommitment,
        (ourSignature as unknown) as string,
      );
      return ctx;
    }

    const currentCommitment = await getCurrentCommitment(theirCommitment);
    const { commitment, signature } = await updateLedgerChannel(
      [{ ledgerCommitment: asConsensusCommitment(theirCommitment), signature: splitSignature }],
      currentCommitment && asConsensusCommitment(currentCommitment),
    );
    ctx.status = 201;
    ctx.body = communication.sendCommitmentReceived(
      theirAddress,
      processId,
      commitment,
      (signature as unknown) as string,
    );

    return ctx;
  }
}

async function handleCommitmentsReceived({ ctx, action }: { ctx; action: CommitmentsReceived }) {
  {
    const { processId } = action;
    const walletProcess = await getProcess(processId);
    if (!walletProcess) {
      throw errors.processMissing(processId);
    }

    const incomingCommitments = action.signedCommitments;
    const commitmentRound: SignedCommitment[] = incomingCommitments.map(
      clientCommitmentToServerCommitment,
    );

    // For the time being, just assume a two-party channel and proceed as normal.
    const {
      commitment: lastCommitment,
      signature: lastCommitmentSignature,
    } = commitmentRound.slice(-1)[0];

    const channelId = channelID(lastCommitment.channel);
    const participants = lastCommitment.channel.participants;
    const ourIndex = participants.indexOf(HUB_ADDRESS);
    const nextParticipant = participants[(ourIndex + 1) % participants.length];

    if (channelId === walletProcess.appChannelId) {
      const { commitment: ourCommitment, signature: ourSignature } = await updateRPSChannel(
        lastCommitment,
        lastCommitmentSignature,
      );
      ctx.body = communication.sendCommitmentReceived(
        nextParticipant,
        processId,
        ourCommitment,
        (ourSignature as unknown) as string,
      );
      return ctx;
    }

    const ledgerCommitmentRound = commitmentRound.map(signedCommitment => ({
      ledgerCommitment: asConsensusCommitment(signedCommitment.commitment),
      signature: signedCommitment.signature,
    }));
    const currentCommitment = await getCurrentCommitment(lastCommitment);
    const { commitment, signature } = await updateLedgerChannel(
      ledgerCommitmentRound,
      currentCommitment && asConsensusCommitment(currentCommitment),
    );
    ctx.status = 201;

    ctx.body = communication.sendCommitmentsReceived(
      nextParticipant,
      processId,
      [...incomingCommitments, { commitment, signature: (signature as unknown) as string }],
      action.protocolLocator,
    );

    return ctx;
  }
}

function clientCommitmentToServerCommitment(signedCommitment: ClientSignedCommitment) {
  const { commitment, signature: stringSignature } = signedCommitment;
  const splitSignature = (ethers.utils.splitSignature(stringSignature) as unknown) as Signature;
  return { commitment, signature: splitSignature };
}

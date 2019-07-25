import { ethers } from 'ethers';
import { channelID, Signature } from 'fmg-core';
import { ProcessProtocol } from 'magmo-wallet/lib/src/communication';

import { Commitment } from 'fmg-core';
import { startFundingProcess } from '../../wallet/db/queries/walletProcess';
import { updateRPSChannel } from '../services/rpsChannelManager';

interface AppMessage {
  commitment: Commitment;
  signature: string; // TODO we should use one kind of signature across the app/server
}

// NOTE: This is NOT currently being used, as the hub is not going to act as a player ONLY as the hub
export async function handleAppMessage(appMessage: AppMessage): Promise<AppMessage | undefined> {
  const { commitment: theirCommitment, signature: theirSignature } = appMessage;
  const { commitment, signature } = await updateRPSChannel(
    theirCommitment,
    (ethers.utils.splitSignature(theirSignature) as unknown) as Signature,
  );

  if (commitment.turnNum <= 1) {
    const theirAddress = commitment.channel.participants[0];
    const processId = `${ProcessProtocol.Funding}-${channelID(commitment.channel)}`;
    await startFundingProcess({ processId, theirAddress });
  }
  return { commitment, signature: signature.signature };
}

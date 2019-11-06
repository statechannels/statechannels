import {MessageRelayRequested} from '../../wallet-client';

export async function handleOngoingProcessAction(action): Promise<MessageRelayRequested[]> {
  if (!action) {
    throw new Error();
  }
  return [];
  // TODO: Update to states
  // switch (action.type) {
  //   case 'ENGINE.COMMON.COMMITMENTS_RECEIVED':
  //     return handleCommitmentsReceived(action);
  //   case 'ENGINE.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED':
  //     return handleStrategyProposed(action);
  //   default:
  //     retreachable(action);
  // }
}

// async function handleStrategyProposed(action: StrategyProposed) {
//   const {processId, strategy} = action;
//   const process = await getProcess(processId);
//   if (!process) {
//     throw errors.processMissing(processId);
//   }

//   const {theirAddress} = process;
//   return [communication.sendStrategyApproved(theirAddress, processId, strategy)];
// }

// async function handleCommitmentsReceived(action: CommitmentsReceived) {
//   {
//     const {processId} = action;
//     const walletProcess = await getProcess(processId);
//     if (!walletProcess) {
//       throw errors.processMissing(processId);
//     }

//     const incomingCommitments =[]; //action.signedCommitments;
//     const commitmentRound: SignedCommitment[] = incomingCommitments.map(
//       clientCommitmentToServerCommitment
//     );

//     // For the time being, just assume a two-party channel and proceed as normal.
//     const {commitment: lastCommitment, signature: lastCommitmentSignature} = commitmentRound.slice(
//       -1
//     )[0];

//     const channelId = channelID(lastCommitment.channel);
//     const participants = lastCommitment.channel.participants;
//     const ourIndex = participants.indexOf(HUB_ADDRESS);
//     const nextParticipant = participants[(ourIndex + 1) % participants.length];

//     if (channelId === walletProcess.appChannelId) {
//       // const {commitment: ourCommitment, signature: ourSignature} = await updateRPSChannel(
//       //   lastCommitment,
//       //   lastCommitmentSignature
//       );
//       return [
//         // communication.sendCommitmentsReceived(
//         //   nextParticipant,
//         //   processId,
//         //   [
//         //     {
//         //       commitment: ourCommitment,
//         //       signature: (ourSignature as unknown) as string,
//         //       signedState: signCommitment2(ourCommitment, HUB_PRIVATE_KEY).signedState
//         //     }
//         //   ],
//         //   action.protocolLocator
//         // )
//       ];
//     }

//     const ledgerCommitmentRound = commitmentRound.map(signedCommitment => ({
//       ledgerCommitment: asConsensusCommitment(signedCommitment.commitment),
//       signature: signedCommitment.signature
//     }));
//     const currentCommitment = await getCurrentCommitment(lastCommitment);
//     const {commitment, signature} = await updateLedgerChannel(
//       ledgerCommitmentRound,
//       currentCommitment && asConsensusCommitment(currentCommitment)
//     );
//     return participants
//       .filter((_, idx) => idx !== ourIndex)
//       .map(p =>
//         communication.sendCommitmentsReceived(
//           p,
//           processId,
//           [
//             ...incomingCommitments,
//             {
//               commitment,
//               signature: (signature as unknown) as string,
//               signedState: signCommitment2(commitment, HUB_PRIVATE_KEY).signedState
//             }
//           ],
//           action.protocolLocator
//         )
//       );
//   }
// }

// function clientCommitmentToServerCommitment(signedCommitment: ClientSignedCommitment) {
//   const {commitment, signature: stringSignature} = signedCommitment;
//   const splitSignature = (ethers.utils.splitSignature(stringSignature) as unknown) as Signature;
//   return {commitment, signature: splitSignature};
// }

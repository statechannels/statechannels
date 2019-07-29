import { channelID, Commitment, CommitmentType, Signature } from 'fmg-core';
import { errors, SignedCommitment } from '../../wallet';
import Wallet from '../../wallet';
import Channel from '../../wallet/models/channel';

import { delay } from 'bluebird';
import ChannelCommitment from '../../wallet/models/channelCommitment';
import {
  asCoreCommitment,
  defaultAppAttrs,
  fromCoreCommitment,
  generateSalt,
  hashCommitment,
  PositionType,
  RPSAppAttributes,
  RPSCommitment,
  sanitize,
  Weapon,
} from './rps-commitment';

const wallet = new Wallet(sanitize);

export async function updateRPSChannel(
  theirCommitment: Commitment,
  theirSignature: Signature,
): Promise<SignedCommitment> {
  if (!wallet.validSignature(theirCommitment, theirSignature)) {
    throw errors.COMMITMENT_NOT_SIGNED;
  }

  if (!(await valuePreserved(theirCommitment))) {
    throw errors.VALUE_LOST;
  }

  if (
    theirCommitment.commitmentType !== CommitmentType.PreFundSetup &&
    !(await validTransition(theirCommitment))
  ) {
    throw errors.INVALID_TRANSITION;
  }

  if (theirCommitment.commitmentType === CommitmentType.PreFundSetup) {
    return await openChannel(theirCommitment);
  }

  if (process.env.NODE_ENV === 'development') {
    // Add delay to make it more suspenseful
    await delay(1000);
  }

  const { channelType: rules_address, nonce } = theirCommitment.channel;
  const existingChannel = await Channel.query()
    .where({
      rules_address,
      nonce,
    })
    .eager('commitments')
    .first();

  const ourLastPosition = existingChannel.commitments[1].appAttrs;
  // TODO: How can we test the manager, while having a randomized play strategy?
  const ourWeapon = Weapon.Rock;

  const ourCommitment = await nextCommitment(fromCoreCommitment(theirCommitment), {
    ourLastPosition,
    ourWeapon,
  });

  await wallet.updateChannel([fromCoreCommitment(theirCommitment)], ourCommitment);
  return wallet.formResponse(asCoreCommitment(ourCommitment));
}

async function openChannel(theirCommitment: Commitment) {
  const ourCommitment = await nextCommitment(fromCoreCommitment(theirCommitment));

  await wallet.updateChannel([fromCoreCommitment(theirCommitment)], ourCommitment);

  return await wallet.formResponse(asCoreCommitment(ourCommitment));
}

interface Opts {
  ourLastPosition?: RPSAppAttributes;
  ourWeapon?: Weapon;
}

export function nextCommitment(theirCommitment: RPSCommitment, opts?: Opts): RPSCommitment {
  // TODO: Update allocations (not needed as player B)
  if (theirCommitment.commitmentType !== CommitmentType.App) {
    return wallet.nextCommitment(theirCommitment);
  }

  return {
    ...theirCommitment,
    turnNum: theirCommitment.turnNum + 1,
    commitmentCount: 0,
    appAttributes: move(theirCommitment.appAttributes, opts),
  };
}

function move(theirPosition: RPSAppAttributes, opts?: Opts): RPSAppAttributes {
  switch (theirPosition.positionType) {
    case PositionType.Resting:
      const salt = generateSalt();
      return {
        positionType: PositionType.Proposed,
        stake: theirPosition.stake,
        salt,
        preCommit: hashCommitment(opts.ourWeapon, salt),
        aWeapon: opts.ourWeapon,
        bWeapon: Weapon.Rock,
      };
    case PositionType.Proposed:
      return {
        ...theirPosition,
        positionType: PositionType.Accepted,
        bWeapon: opts.ourWeapon,
      };
    case PositionType.Accepted:
      return {
        ...theirPosition,
        positionType: PositionType.Reveal,
        aWeapon: opts.ourLastPosition.aWeapon,
        salt: opts.ourLastPosition.salt,
      };
    case PositionType.Reveal:
      return defaultAppAttrs(theirPosition.stake);
  }
}

export async function valuePreserved(theirCommitment: any): Promise<boolean> {
  return theirCommitment && true;
}

export async function validTransition(theirCommitment: Commitment): Promise<boolean> {
  const { channel: commitmentChannel } = theirCommitment;
  const channel_id = channelID(commitmentChannel);
  const channel = await Channel.query()
    .where({ channel_id })
    .select('id')
    .first();

  if (!channel) {
    throw errors.CHANNEL_MISSING;
  }

  const currentCommitment = await ChannelCommitment.query()
    .where({ channel_id: channel.id })
    .orderBy('id', 'desc')
    .select()
    .first();

  return theirCommitment.turnNum === currentCommitment.turnNumber + 1;
}

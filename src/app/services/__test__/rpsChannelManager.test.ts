import { Commitment, CommitmentType, sign, Signature, toHex } from 'fmg-core';
import {
  app_response,
  beginning_app_phase_rps_channel,
  constructors,
  funded_rps_channel,
  pre_fund_setup_1_response,
} from '../../../test/rps_test_data';
import {
  allocation,
  DESTINATION,
  DUMMY_RULES_ADDRESS,
  FUNDED_CHANNEL_NONCE,
  PARTICIPANT_1_PRIVATE_KEY,
  PARTICIPANTS,
  STAKE,
} from '../../../test/test-constants';
import { default_channel } from '../../../test/test_data';
import { errors } from '../../../wallet';
import { validSignature } from '../../../wallet/services/channelManagement';
import {
  asCoreCommitment,
  PositionType,
  RPSCommitment,
  Weapon,
  zeroBytes32,
} from '../rps-commitment';
import * as RPSChannelManager from '../rpsChannelManager';

const base = {
  channel: default_channel,
  stake: STAKE,
  turnNum: 0,
  allocation: allocation(2),
  destination: DESTINATION,
  commitmentCount: 0,
  commitmentType: CommitmentType.PreFundSetup,
};
const APLAY = Weapon.Paper;
const BPLAY = Weapon.Rock;

function sanitize(c: RPSCommitment): RPSCommitment {
  switch (c.appAttributes.positionType) {
    case PositionType.Proposed:
      return {
        ...c,
        appAttributes: {
          ...c.appAttributes,
          aWeapon: Weapon.Rock,
          salt: zeroBytes32,
        },
      };
    case PositionType.Resting:
    case PositionType.Accepted:
    case PositionType.Reveal:
      return c;
  }
}

let pre_fund_setup_0: Commitment;
let post_fund_setup_0: Commitment;

let propose: RPSCommitment;
let accept: RPSCommitment;
let reveal: RPSCommitment;
let resting: RPSCommitment;
function withAgnosticChannel(c: RPSCommitment) {
  return {
    ...c,
    channel: { ...c.channel, nonce: expect.any(Number) },
  };
}

beforeEach(() => {
  pre_fund_setup_0 = asCoreCommitment(constructors.preFundSetupA(base));
  post_fund_setup_0 = asCoreCommitment(
    constructors.postFundSetupA({ ...base, channel: funded_rps_channel }),
  );

  propose = constructors.propose({
    ...base,
    aWeapon: APLAY,
    channel: beginning_app_phase_rps_channel,
  });
  const { stake } = propose.appAttributes;
  accept = constructors.accept({
    ...base,
    turnNum: propose.turnNum + 1,
    bWeapon: BPLAY,
    preCommit: propose.appAttributes.preCommit,
  });
  reveal = constructors.reveal({
    ...accept,
    turnNum: accept.turnNum + 1,
    aWeapon: APLAY,
    salt: propose.appAttributes.salt,
    bWeapon: BPLAY,
    stake,
    channel: beginning_app_phase_rps_channel,
  });

  resting = constructors.resting({
    ...accept,
    turnNum: reveal.turnNum + 1,
    stake,
  });
});

describe('nextCommitment', () => {
  it('works on propose commitments', async () => {
    expect(
      // Our opponent would have sanitized their propose
      await RPSChannelManager.nextCommitment(sanitize(propose), {
        ourWeapon: BPLAY,
      }),
    ).toMatchObject(withAgnosticChannel(accept));
  });

  it('works on accept commitments', async () => {
    expect(
      // Our opponent would have built accept off of our sanitized propose
      await RPSChannelManager.nextCommitment(sanitize(accept), {
        ourLastPosition: propose.appAttributes,
      }),
    ).toMatchObject(withAgnosticChannel(reveal));
  });

  it('works on reveal commitments', async () => {
    expect(await RPSChannelManager.nextCommitment(reveal)).toMatchObject(
      withAgnosticChannel(resting),
    );
  });

  it('works on resting commitments', async () => {
    expect(await RPSChannelManager.nextCommitment(resting, { ourWeapon: APLAY })).toMatchObject({
      ...withAgnosticChannel(propose),
      turnNum: resting.turnNum + 1,
    });
  });
});

let theirSignature: Signature;
describe('updateRPSChannel', () => {
  beforeEach(() => {
    theirSignature = sign(toHex(pre_fund_setup_0), PARTICIPANT_1_PRIVATE_KEY);
  });

  describe('opening a channel', () => {
    it('should return an RPS channel and a signed commitment', async () => {
      const { commitment, signature } = await RPSChannelManager.updateRPSChannel(
        pre_fund_setup_0,
        theirSignature,
      );

      expect(commitment).toMatchObject(pre_fund_setup_1_response);
      expect(validSignature(commitment, signature)).toBe(true);
    });

    it.skip('throws when the commitment is incorrectly signed', async () => {
      // Signature validation is disabled until a consensus is formed around the signature type
      expect.assertions(1);
      theirSignature = sign(toHex(pre_fund_setup_0), '0xf00');

      await RPSChannelManager.updateRPSChannel(pre_fund_setup_0, theirSignature).catch(
        (err: Error) => {
          expect(err).toMatchObject(errors.COMMITMENT_NOT_SIGNED);
        },
      );
    });

    it('throws when the channel exists', async () => {
      expect.assertions(1);

      pre_fund_setup_0.channel = {
        channelType: DUMMY_RULES_ADDRESS,
        nonce: FUNDED_CHANNEL_NONCE,
        participants: PARTICIPANTS,
      };
      theirSignature = sign(toHex(pre_fund_setup_0), PARTICIPANT_1_PRIVATE_KEY);

      await RPSChannelManager.updateRPSChannel(pre_fund_setup_0, theirSignature).catch(
        (err: Error) => {
          expect(err).toMatchObject(errors.CHANNEL_EXISTS);
        },
      );
    });
  });

  describe('transitioning to a postFundSetup commitment', () => {
    beforeEach(() => {
      theirSignature = sign(toHex(post_fund_setup_0), PARTICIPANT_1_PRIVATE_KEY);
    });

    it('should return an allocator channel and a signed commitment', async () => {
      const { commitment, signature } = await RPSChannelManager.updateRPSChannel(
        post_fund_setup_0,
        theirSignature,
      );
      // expect(commitment).toMatchObject(post_fund_setup_1_response);

      expect(validSignature(commitment, signature)).toBe(true);
    });

    it.skip('throws when the commitment is incorrectly signed', async () => {
      // Signature validation is disabled until a consensus is formed around the signature type
      expect.assertions(1);
      theirSignature = sign(toHex(post_fund_setup_0), '0xf00');
      await RPSChannelManager.updateRPSChannel(post_fund_setup_0, theirSignature).catch(
        (err: Error) => {
          expect(err).toMatchObject(errors.COMMITMENT_NOT_SIGNED);
        },
      );
    });

    it('throws when the transition is invalid', async () => {
      expect.assertions(1);
      post_fund_setup_0.turnNum = 0;
      theirSignature = sign(toHex(post_fund_setup_0), PARTICIPANT_1_PRIVATE_KEY);

      await RPSChannelManager.updateRPSChannel(post_fund_setup_0, theirSignature).catch(err => {
        expect(err).toMatchObject(errors.INVALID_TRANSITION);
      });
    });

    it("throws when the channel doesn't exist", async () => {
      expect.assertions(1);

      post_fund_setup_0.channel = {
        ...post_fund_setup_0.channel,
        nonce: 999,
      };
      theirSignature = sign(toHex(post_fund_setup_0), PARTICIPANT_1_PRIVATE_KEY);

      await RPSChannelManager.updateRPSChannel(post_fund_setup_0, theirSignature).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_MISSING);
      });
    });
  });

  describe('playing a game', () => {
    let theirCommitment: Commitment;
    it('works as player B', async () => {
      {
        theirCommitment = asCoreCommitment(sanitize(propose));
        theirSignature = sign(toHex(theirCommitment), PARTICIPANT_1_PRIVATE_KEY);
        const { commitment, signature } = await RPSChannelManager.updateRPSChannel(
          theirCommitment,
          theirSignature,
        );
        expect(commitment).toMatchObject(app_response(accept.appAttributes));
        expect(validSignature(commitment, signature)).toBe(true);
      }
      {
        theirCommitment = asCoreCommitment(sanitize(reveal));
        theirSignature = sign(toHex(theirCommitment), PARTICIPANT_1_PRIVATE_KEY);

        const { commitment, signature } = await RPSChannelManager.updateRPSChannel(
          theirCommitment,
          theirSignature,
        );
        expect(commitment).toMatchObject(app_response(resting.appAttributes));
        expect(validSignature(commitment, signature)).toBe(true);
      }
    });
  });
});

describe.skip('transitioning to a conclude commitment', () => {
  it('works', () => {
    expect.assertions(1);
  });
});

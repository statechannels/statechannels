import { Bytes, sign, Signature, toHex } from 'fmg-core';
import {
  DUMMY_RULES_ADDRESS,
  FUNDED_CHANNEL_NONCE,
  PARTICIPANT_PRIVATE_KEY,
  PARTICIPANTS,
  UNKNOWN_RULES_ADDRESS,
} from '../../../constants';
import {
  app_1_response,
  beginning_app_phase_channel,
  constructors as testDataConstructors,
  post_fund_setup_1_response,
  pre_fund_setup_1_response,
} from '../../../test/test_data';
import errors from '../../errors';
import * as ChannelManagement from '../channelManagement';
import { asCoreCommitment, LedgerCommitment } from '../ledger-commitment';
import * as LedgerChannelManager from '../ledgerChannelManager';

process.env.NODE_ENV = 'test';

let pre_fund_setup_0: LedgerCommitment;
let post_fund_setup_0: LedgerCommitment;
let app_0: LedgerCommitment;
let app_1: LedgerCommitment;
let theirSignature: Signature;

beforeEach(() => {
  pre_fund_setup_0 = testDataConstructors.pre_fund_setup(0);

  post_fund_setup_0 = testDataConstructors.post_fund_setup(2);

  app_0 = testDataConstructors.app(4, beginning_app_phase_channel);
  app_1 = testDataConstructors.app(5, beginning_app_phase_channel);
});

function signAppCommitment(c: LedgerCommitment, k: Bytes): Signature {
  return sign(toHex(asCoreCommitment(c)), k);
}

describe('updateLedgerChannel', () => {
  describe('opening a channel', () => {
    beforeEach(() => {
      theirSignature = signAppCommitment(pre_fund_setup_0, PARTICIPANT_PRIVATE_KEY);
    });

    it('should return an allocator channel and a signed commitment', async () => {
      const { commitment, signature } = await LedgerChannelManager.updateLedgerChannel(
        pre_fund_setup_0,
        theirSignature,
      );
      expect(commitment).toMatchObject(pre_fund_setup_1_response);
      expect(ChannelManagement.validSignature(commitment, signature)).toBe(true);
    });

    it.skip('throws when the rules are not known', async () => {
      // Foreign key constraint was dropped
      expect.assertions(1);

      const unknown_rules = { ...pre_fund_setup_0 };
      unknown_rules.channel.channelType = UNKNOWN_RULES_ADDRESS;
      const signature = signAppCommitment(unknown_rules, PARTICIPANT_PRIVATE_KEY);
      await LedgerChannelManager.updateLedgerChannel(unknown_rules, signature).catch(err => {
        expect(err.message).toMatch(
          'insert or update on table "allocator_channels" violates foreign key constraint "allocator_channels_rules_address_foreign"',
        );
      });
    });

    it('throws when the commitment is incorrectly signed', async () => {
      expect.assertions(1);
      theirSignature = signAppCommitment(pre_fund_setup_0, '0xf00');

      await LedgerChannelManager.updateLedgerChannel(pre_fund_setup_0, theirSignature).catch(
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
      theirSignature = signAppCommitment(pre_fund_setup_0, PARTICIPANT_PRIVATE_KEY);

      await LedgerChannelManager.updateLedgerChannel(pre_fund_setup_0, theirSignature).catch(
        (err: Error) => {
          expect(err).toMatchObject(errors.CHANNEL_EXISTS);
        },
      );
    });
  });
  describe('transitioning to a postFundSetup commitment', () => {
    beforeEach(() => {
      theirSignature = signAppCommitment(post_fund_setup_0, PARTICIPANT_PRIVATE_KEY);
    });

    it('should return an allocator channel and a signed commitment', async () => {
      const { commitment, signature } = await LedgerChannelManager.updateLedgerChannel(
        post_fund_setup_0,
        theirSignature,
      );
      expect(commitment).toMatchObject(post_fund_setup_1_response);

      expect(ChannelManagement.validSignature(commitment, signature)).toBe(true);
    });

    it('throws when the commitment is incorrectly signed', async () => {
      expect.assertions(1);
      theirSignature = signAppCommitment(post_fund_setup_0, '0xf00');
      await LedgerChannelManager.updateLedgerChannel(post_fund_setup_0, theirSignature).catch(
        (err: Error) => {
          expect(err).toMatchObject(errors.COMMITMENT_NOT_SIGNED);
        },
      );
    });

    it('throws when the transition is invalid', async () => {
      expect.assertions(1);
      post_fund_setup_0.turnNum = 0;
      theirSignature = signAppCommitment(post_fund_setup_0, PARTICIPANT_PRIVATE_KEY);

      await LedgerChannelManager.updateLedgerChannel(post_fund_setup_0, theirSignature).catch(
        err => {
          expect(err).toMatchObject(errors.INVALID_TRANSITION);
        },
      );
    });

    it("throws when the channel doesn't exist", async () => {
      expect.assertions(1);

      post_fund_setup_0.channel = {
        ...post_fund_setup_0.channel,
        nonce: 999,
      };
      theirSignature = signAppCommitment(post_fund_setup_0, PARTICIPANT_PRIVATE_KEY);

      await LedgerChannelManager.updateLedgerChannel(post_fund_setup_0, theirSignature).catch(
        err => {
          expect(err).toMatchObject(errors.CHANNEL_MISSING);
        },
      );
    });

    it.skip('throws when the update is not value preserving', async () => {
      expect.assertions(1);

      await LedgerChannelManager.updateLedgerChannel(post_fund_setup_0, theirSignature).catch(
        err => {
          expect(err).toMatchObject(errors.VALUE_LOST);
        },
      );
    });

    it.skip('throws when the app is not funded', async () => {
      expect.assertions(1);
    });
  });

  describe('transitioning to an app commitment', () => {
    beforeEach(() => {
      theirSignature = signAppCommitment(app_0, PARTICIPANT_PRIVATE_KEY);
    });

    it('should return an allocator channel and a signed commitment', async () => {
      const { commitment, signature } = await LedgerChannelManager.updateLedgerChannel(
        app_0,
        theirSignature,
      );
      expect(commitment).toMatchObject(app_1_response);

      expect(ChannelManagement.validSignature(commitment, signature)).toBe(true);
    });
  });

  describe.skip('transitioning to a conclude commitment', () => {
    it('works', () => {
      expect.assertions(1);
    });
  });
});

describe.skip('validTransition', () => {
  it('works', () => {
    expect.assertions(1);
  });
});

describe.skip('valuePreserved', () => {
  it('works', () => {
    expect.assertions(1);
  });
});

describe.skip('channelFunded', () => {
  it('works', () => {
    expect.assertions(1);
  });
});

describe('nextCommitment', () => {
  it('works on app commitments', () => {
    expect(LedgerChannelManager.nextCommitment(app_0)).toMatchObject(app_1);
  });
});

import {State} from '@statechannels/nitro-protocol';
import {signState} from '@statechannels/nitro-protocol/lib/src/signatures';
import {Signature} from 'ethers/utils';
import {
  DUMMY_CHAIN_ID,
  FUNDED_CHANNEL_NONCE,
  PARTICIPANT_1_PRIVATE_KEY,
  PARTICIPANT_2_PRIVATE_KEY,
  PARTICIPANTS
} from '../../../test/test-constants';
import {
  app_1_response,
  beginningAppPhaseChannel,
  created_pre_fund_setup_1,
  created_pre_fund_setup_3_2,
  post_fund_setup_1_response,
  post_fund_setup_3_2_response,
  pre_fund_setup_1_response,
  pre_fund_setup_3_2_response,
  stateConstructors as testDataConstructors
} from '../../../test/test_data';
import errors from '../../errors';
import * as ChannelManager from '../channelManager';
import * as LedgerChannelManager from '../ledgerChannelManager';

// 2 participant channel
let pre_fund_setup_0: State;
let post_fund_setup_0: State;
let app_0: State;
let theirSignature: Signature;

// 3 participant channel
let pre_fund_setup_3_0: State;
let pre_fund_setup_3_1: State;
let post_fund_setup_3_0: State;
let post_fund_setup_3_1: State;

beforeEach(() => {
  pre_fund_setup_0 = testDataConstructors.pre_fund_setup(0);
  post_fund_setup_0 = testDataConstructors.post_fund_setup(2);
  app_0 = testDataConstructors.app(4, beginningAppPhaseChannel);

  pre_fund_setup_3_0 = testDataConstructors.pre_fund_setup_3(0);
  pre_fund_setup_3_1 = testDataConstructors.pre_fund_setup_3(1);
  post_fund_setup_3_0 = testDataConstructors.post_fund_setup_3(3);
  post_fund_setup_3_1 = testDataConstructors.post_fund_setup_3(4);
});

describe('updateLedgerChannel', () => {
  describe('opening a channel', () => {
    beforeEach(() => {
      theirSignature = signState(pre_fund_setup_0, PARTICIPANT_1_PRIVATE_KEY).signature;
    });

    it('should return an allocator channel and a signed state', async () => {
      const {state, signature} = await LedgerChannelManager.updateLedgerChannel([
        {state: pre_fund_setup_0, signature: theirSignature}
      ]);
      expect(state).toMatchObject(pre_fund_setup_1_response);
      expect(ChannelManager.validSignature(state, signature)).toBe(true);
    });

    it('on valid round received -- should return an allocator channel and a signed state', async () => {
      const {state, signature} = await LedgerChannelManager.updateLedgerChannel([
        {
          state: pre_fund_setup_3_0,
          signature: signState(pre_fund_setup_3_0, PARTICIPANT_1_PRIVATE_KEY).signature
        },
        {
          state: pre_fund_setup_3_1,
          signature: signState(pre_fund_setup_3_1, PARTICIPANT_2_PRIVATE_KEY).signature
        }
      ]);
      expect(state).toMatchObject(pre_fund_setup_3_2_response);
      expect(ChannelManager.validSignature(state, signature)).toBe(true);
    });

    it.skip('throws when the state is incorrectly signed', async () => {
      // TODO: Unskip when signatures are validated
      expect.assertions(1);
      theirSignature = signState(pre_fund_setup_0, '0xf00').signature;

      await LedgerChannelManager.updateLedgerChannel([
        {
          state: pre_fund_setup_0,
          signature: theirSignature
        }
      ]).catch((err: Error) => {
        expect(err).toMatchObject(errors.STATE_NOT_SIGNED);
      });
    });

    it('throws when the channel exists', async () => {
      expect.assertions(1);

      pre_fund_setup_0.channel = {
        channelNonce: FUNDED_CHANNEL_NONCE,
        participants: PARTICIPANTS,
        chainId: DUMMY_CHAIN_ID
      };
      theirSignature = signState(pre_fund_setup_0, PARTICIPANT_1_PRIVATE_KEY).signature;

      await LedgerChannelManager.updateLedgerChannel([
        {
          state: pre_fund_setup_0,
          signature: theirSignature
        }
      ]).catch((err: Error) => {
        expect(err).toMatchObject(errors.CHANNEL_EXISTS);
      });
    });
  });

  describe('transitioning to a postFundSetup state', () => {
    beforeEach(() => {
      theirSignature = signState(post_fund_setup_0, PARTICIPANT_1_PRIVATE_KEY).signature;
    });

    it('should return an allocator channel and a signed state', async () => {
      const {state, signature} = await LedgerChannelManager.updateLedgerChannel(
        [
          {
            state: post_fund_setup_0,
            signature: theirSignature
          }
        ],
        created_pre_fund_setup_1
      );
      expect(state).toMatchObject(post_fund_setup_1_response);
      expect(ChannelManager.validSignature(state, signature)).toBe(true);
    });

    describe('round of states', () => {
      it('on valid round received -- should return an allocator channel and a signed state', async () => {
        const {state, signature} = await LedgerChannelManager.updateLedgerChannel(
          [
            {
              state: post_fund_setup_3_0,
              signature: signState(post_fund_setup_3_0, PARTICIPANT_1_PRIVATE_KEY).signature
            },
            {
              state: post_fund_setup_3_1,
              signature: signState(post_fund_setup_3_1, PARTICIPANT_2_PRIVATE_KEY).signature
            }
          ],
          created_pre_fund_setup_3_2
        );
        expect(state).toMatchObject(post_fund_setup_3_2_response);
        expect(ChannelManager.validSignature(state, signature)).toBe(true);
      });

      it('on valid round received -- not our turn', async () => {
        await LedgerChannelManager.updateLedgerChannel(
          [
            {
              state: post_fund_setup_3_0,
              signature: signState(post_fund_setup_3_0, PARTICIPANT_1_PRIVATE_KEY).signature
            }
          ],
          created_pre_fund_setup_3_2
        ).catch((err: Error) => {
          expect(err).toMatchObject(errors.NOT_OUR_TURN);
        });
      });
    });

    it.skip('throws when the state is incorrectly signed', async () => {
      // TODO: Unskip when signatures are validated
      expect.assertions(1);
      theirSignature = signState(post_fund_setup_0, '0xf00').signature;
      await LedgerChannelManager.updateLedgerChannel([
        {
          state: post_fund_setup_0,
          signature: theirSignature
        }
      ]).catch((err: Error) => {
        expect(err).toMatchObject(errors.STATE_NOT_SIGNED);
      });
    });

    it('throws when the transition is invalid', async () => {
      expect.assertions(1);
      theirSignature = signState(created_pre_fund_setup_1, PARTICIPANT_1_PRIVATE_KEY).signature;

      await LedgerChannelManager.updateLedgerChannel(
        [
          {
            state: post_fund_setup_0,
            signature: theirSignature
          }
        ],
        {
          ...created_pre_fund_setup_1,
          turnNum: 0
        }
      ).catch(err => {
        expect(err).toMatchObject(errors.INVALID_TRANSITION);
      });
    });

    it("throws when the channel doesn't exist", async () => {
      expect.assertions(1);

      post_fund_setup_0.channel = {
        ...post_fund_setup_0.channel,
        channelNonce: '999'
      };
      theirSignature = signState(post_fund_setup_0, PARTICIPANT_1_PRIVATE_KEY).signature;

      await LedgerChannelManager.updateLedgerChannel(
        [
          {
            state: post_fund_setup_0,
            signature: theirSignature
          }
        ],
        created_pre_fund_setup_1
      ).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_MISSING);
      });
    });

    it.skip('throws when the update is not value preserving', async () => {
      expect.assertions(1);

      await LedgerChannelManager.updateLedgerChannel([
        {
          state: post_fund_setup_0,
          signature: theirSignature
        }
      ]).catch(err => {
        expect(err).toMatchObject(errors.VALUE_LOST);
      });
    });
  });

  describe('transitioning to an app state', () => {
    beforeEach(() => {
      theirSignature = signState(app_0, PARTICIPANT_1_PRIVATE_KEY).signature;
    });

    it('should return an allocator channel and a signed state', async () => {
      const {state, signature} = await LedgerChannelManager.updateLedgerChannel(
        [
          {
            state: app_0,
            signature: theirSignature
          }
        ],
        post_fund_setup_1_response
      );
      expect(state).toMatchObject(app_1_response);

      expect(ChannelManager.validSignature(state, signature)).toBe(true);
    });
  });

  describe.skip('transitioning to a conclude state', () => {
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

import {
  DUMMY_CHAIN_ID,
  FUNDED_NONCE,
  PARTICIPANT_1_PRIVATE_KEY,
  PARTICIPANT_2_PRIVATE_KEY,
  PARTICIPANTS
} from '../../test/test-constants';
import {
  beginningAppPhaseChannel,
  createdPrefundSetup1,
  createdPrefundSetup2Participants3,
  stateConstructors as testDataConstructors
} from '../../test/test-data';
import {
  app1Response,
  postfundSetup1Response,
  postfundSetup2Response3,
  prefundSetup1Response,
  prefundSetup2Response3
} from '../../test/test-responses';
import errors from '../../errors';
import * as ChannelManager from '../channelManager';
import * as LedgerChannelManager from '../ledgerChannelManager';
import {State} from '../../store-types';
import {signState} from '../../state-utils';

type Signature = any; // FIXME
// 2 participant channel
let prefundSetup0: State;
let postfundSetup0: State;
let app0: State;
let theirSignature: Signature;

// 3 participant channel
let prefundSetup30: State;
let prefundSetup31: State;
let postfundSetup30: State;
let postfundSetup31: State;

beforeEach(() => {
  prefundSetup0 = testDataConstructors.prefundSetup(0);
  postfundSetup0 = testDataConstructors.postfundSetup(2);
  app0 = testDataConstructors.app(4, beginningAppPhaseChannel);

  prefundSetup30 = testDataConstructors.prefundSetup3(0);
  prefundSetup31 = testDataConstructors.prefundSetup3(1);
  postfundSetup30 = testDataConstructors.postfundSetup3(3);
  postfundSetup31 = testDataConstructors.postfundSetup3(4);
});

describe('updateLedgerChannel', () => {
  describe('opening a channel', () => {
    beforeEach(() => {
      theirSignature = signState(prefundSetup0, PARTICIPANT_1_PRIVATE_KEY);
    });

    it('should return an allocator channel and a signed state', async () => {
      const state = await LedgerChannelManager.updateLedgerChannel([
        {...prefundSetup0, signatures: [theirSignature]}
      ]);
      expect(state).toMatchObject(prefundSetup1Response);
      expect(ChannelManager.validSignature(state)).toBe(true);
    });

    it('on valid round received -- should return an allocator channel and a signed state', async () => {
      const state = await LedgerChannelManager.updateLedgerChannel([
        {...prefundSetup30, signatures: [signState(prefundSetup30, PARTICIPANT_1_PRIVATE_KEY)]},
        {...prefundSetup31, signatures: [signState(prefundSetup31, PARTICIPANT_2_PRIVATE_KEY)]}
      ]);
      expect(state).toMatchObject(prefundSetup2Response3);
      expect(ChannelManager.validSignature(state)).toBe(true);
    });

    it.skip('throws when the state is incorrectly signed', async () => {
      // TODO: Unskip when signatures are validated
      expect.assertions(1);
      theirSignature = signState(prefundSetup0, '0xf00').signature;

      await LedgerChannelManager.updateLedgerChannel([
        {
          ...prefundSetup0,
          signatures: [theirSignature]
        }
      ]).catch((err: Error) => {
        expect(err).toMatchObject(errors.STATE_NOT_SIGNED);
      });
    });

    it('throws when the channel exists', async () => {
      expect.assertions(1);

      prefundSetup0 = {
        ...prefundSetup0,
        channelNonce: FUNDED_NONCE,
        participants: PARTICIPANTS,
        chainId: DUMMY_CHAIN_ID
      };
      theirSignature = signState(prefundSetup0, PARTICIPANT_1_PRIVATE_KEY).signature;

      await LedgerChannelManager.updateLedgerChannel([
        {
          ...prefundSetup0,
          signatures: [theirSignature]
        }
      ]).catch((err: Error) => {
        expect(err).toMatchObject(errors.CHANNEL_EXISTS);
      });
    });
  });

  describe('transitioning to a postFundSetup state', () => {
    beforeEach(() => {
      theirSignature = signState(postfundSetup0, PARTICIPANT_1_PRIVATE_KEY).signature;
    });

    it('should return an allocator channel and a signed state', async () => {
      const state = await LedgerChannelManager.updateLedgerChannel(
        [{...postfundSetup0, signatures: [theirSignature]}],
        createdPrefundSetup1
      );
      expect(state).toMatchObject(postfundSetup1Response);
      expect(ChannelManager.validSignature(state)).toBe(true);
    });

    describe('round of states', () => {
      it('on valid round received -- should return an allocator channel and a signed state', async () => {
        const state = await LedgerChannelManager.updateLedgerChannel(
          [
            {
              ...postfundSetup30,
              signatures: [signState(postfundSetup30, PARTICIPANT_1_PRIVATE_KEY)]
            },
            {
              ...postfundSetup31,
              signatures: [signState(postfundSetup31, PARTICIPANT_2_PRIVATE_KEY)]
            }
          ],
          createdPrefundSetup2Participants3
        );
        expect(state).toMatchObject(postfundSetup2Response3);
        expect(ChannelManager.validSignature(state)).toBe(true);
      });

      it('on valid round received -- not our turn', async () => {
        await LedgerChannelManager.updateLedgerChannel(
          [
            {
              ...postfundSetup30,
              signatures: [signState(postfundSetup30, PARTICIPANT_1_PRIVATE_KEY)]
            }
          ],
          createdPrefundSetup2Participants3
        ).catch((err: Error) => {
          expect(err).toMatchObject(errors.NOT_OUR_TURN);
        });
      });
    });

    it.skip('throws when the state is incorrectly signed', async () => {
      // TODO: Unskip when signatures are validated
      expect.assertions(1);
      theirSignature = signState(postfundSetup0, '0xf00').signature;
      await LedgerChannelManager.updateLedgerChannel([
        {
          ...postfundSetup0,
          signatures: [theirSignature]
        }
      ]).catch((err: Error) => {
        expect(err).toMatchObject(errors.STATE_NOT_SIGNED);
      });
    });

    it('throws when the transition is invalid', async () => {
      expect.assertions(1);
      theirSignature = signState(createdPrefundSetup1, PARTICIPANT_1_PRIVATE_KEY).signature;

      await LedgerChannelManager.updateLedgerChannel(
        [{...postfundSetup0, signatures: [theirSignature]}],
        {...createdPrefundSetup1, turnNum: 0}
      ).catch(err => {
        expect(err).toMatchObject(errors.INVALID_TRANSITION);
      });
    });

    it("throws when the channel doesn't exist", async () => {
      expect.assertions(1);

      postfundSetup0.channelNonce = 999;
      theirSignature = signState(postfundSetup0, PARTICIPANT_1_PRIVATE_KEY).signature;

      await LedgerChannelManager.updateLedgerChannel(
        [
          {
            ...postfundSetup0,
            signatures: [theirSignature]
          }
        ],
        createdPrefundSetup1
      ).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_MISSING);
      });
    });

    it.skip('throws when the update is not value preserving', async () => {
      expect.assertions(1);

      await LedgerChannelManager.updateLedgerChannel([
        {
          ...postfundSetup0,
          signatures: [theirSignature]
        }
      ]).catch(err => {
        expect(err).toMatchObject(errors.VALUE_LOST);
      });
    });
  });

  describe('transitioning to an app state', () => {
    beforeEach(() => {
      theirSignature = signState(app0, PARTICIPANT_1_PRIVATE_KEY);
    });

    it('should return an allocator channel and a signed state', async () => {
      const state = await LedgerChannelManager.updateLedgerChannel(
        [{...app0, signatures: [theirSignature]}],
        postfundSetup1Response
      );
      expect(state).toMatchObject(app1Response);

      expect(ChannelManager.validSignature(state)).toBe(true);
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

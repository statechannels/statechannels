import { SERVER_PRIVATE_KEY } from '../../constants';
import { fundedChannel, stateConstructors as testDataConstructors } from '../../test/test-data';
import * as ChannelManager from '../channelManager';
import { State } from '../../store-types';
import { signState } from '../../state-utils';

type Signature = any; // FIXME

let prefundSetup0: State;
let prefundSetup1: State;
let postfundSetup0: State;
let postfundSetup1: State;
let app0: State;
let hubSignature: Signature;

beforeEach(() => {
  prefundSetup0 = testDataConstructors.prefundSetup(0);
  prefundSetup1 = testDataConstructors.prefundSetup(1);

  postfundSetup0 = testDataConstructors.postfundSetup(2);
  postfundSetup1 = testDataConstructors.postfundSetup(3);
  app0 = testDataConstructors.app(4, fundedChannel);

  hubSignature = signState(prefundSetup1, SERVER_PRIVATE_KEY);
});

describe('validSignature', () => {
  it('returns true when the state was signed by the mover', async () => {
    const signedState = { ...prefundSetup1, signatures: [hubSignature] };
    expect(ChannelManager.validSignature(signedState)).toBe(true);
  });
});

describe('formResponse', () => {
  it('returns a signed core state', async () => {
    prefundSetup1 = { ...prefundSetup1, ...fundedChannel };

    hubSignature = signState(prefundSetup1, SERVER_PRIVATE_KEY).signature;

    expect(await ChannelManager.formResponse(prefundSetup1)).toMatchObject({
      state: prefundSetup1,
      signature: hubSignature
    });
  });
});

describe('nextState', () => {
  it('works on preFundSetup states', () => {
    expect(ChannelManager.nextState(prefundSetup0)).toMatchObject(prefundSetup1);
  });

  it('works on postFundSetup states', () => {
    expect(ChannelManager.nextState(postfundSetup0)).toMatchObject(postfundSetup1);
  });

  it('throws on app commitments', () => {
    expect(() => ChannelManager.nextState(app0)).toThrow();
  });
});

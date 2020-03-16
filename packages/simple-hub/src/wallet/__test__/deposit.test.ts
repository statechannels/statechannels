import {depositsToMake} from '../deposit';
import {
  ledgerStateResponse,
  ledgerStateResponse3_2,
  ledgerStateResponse3,
  ledgerStateResponse2
} from '../test-helpers';
import {calculateChannelId} from '../xstate-wallet-internals';
import {SimpleAllocation} from '@statechannels/xstate-wallet/src/store/types';

describe('deposit on prefund state', () => {
  it('one prefund state', () => {
    const deposits = depositsToMake({
      signedStates: [ledgerStateResponse]
    });
    expect(deposits).toHaveLength(1);
    const deposit = deposits[0];
    expect(deposit.channelId).toEqual(calculateChannelId(ledgerStateResponse));
    expect(deposit.amountToDeposit).toEqual(
      (ledgerStateResponse.outcome as SimpleAllocation).allocationItems[1].amount
    );
  });

  it('no prefund states', () => {
    const deposits = depositsToMake({
      signedStates: [ledgerStateResponse3_2]
    });
    expect(deposits).toHaveLength(0);
  });

  it('only support deposit for 2 participant channels', () => {
    const deposits = depositsToMake({
      signedStates: [ledgerStateResponse3, ledgerStateResponse3_2]
    });
    expect(deposits).toHaveLength(0);
  });

  it('multiple states, one prefund state', () => {
    const deposits = depositsToMake({
      signedStates: [ledgerStateResponse, ledgerStateResponse2]
    });
    expect(deposits).toHaveLength(1);
    const deposit = deposits[0];
    expect(deposit.channelId).toEqual(calculateChannelId(ledgerStateResponse));
    expect(deposit.amountToDeposit).toEqual(
      (ledgerStateResponse.outcome as SimpleAllocation).allocationItems[1].amount
    );
  });
});

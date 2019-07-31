import { makeAllocation, ETH } from '../src/outcome';
import { bigNumberify } from 'ethers/utils';

describe('Outcome', () => {
  describe('makeAllocation', () => {
    it('works', () => {
      const allocation = makeAllocation([['0xa', 5, ETH], ['0xb', 3, ETH]]);

      expect(allocation).toEqual({
        type: 0, // ALLOCATION
        tokenAllocations: [
          {
            token: ETH,
            proposedTransfers: [
              { destination: '0xa', amount: bigNumberify(5) },
              { destination: '0xb', amount: bigNumberify(3) },
            ],
          },
        ],
      });
    });
  });
});

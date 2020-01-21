import { Store } from '../..';
import { interpret } from 'xstate';
import { machine, Init } from './protocol';
import { ethers } from 'ethers';
import { IChain, ChainEvent, ChainEventListener, Chain } from '../../chain';
import waitForExpect from 'wait-for-expect';
import { IStore } from '../../store';
jest.setTimeout(50000);
class TestChain extends Chain implements IChain {
  private _listener: ChainEventListener | undefined;

  constructor(holdings?) {
    super(holdings);
  }
  public setHoldings(channelId, amount) {
    this._holdings[channelId] = amount;
  }
  public on(chainEventType, listener) {
    this._listener = listener;
    return () => {
      this._listener = undefined;
    };
  }

  public triggerEvent(chainEvent: ChainEvent) {
    if (this._listener) {
      this._listener(chainEvent);
    }
  }
}
it('handles the basic case', async () => {
  const testChain: TestChain = new TestChain();
  const store = new Store({ chain: testChain });
  const channelId = ethers.utils.id('channel');
  const context: Init = {
    channelId: ethers.utils.id('channel'),
    totalAfterDeposit: '0x05',
    depositAt: '0x01',
  };
  const service = interpret<any, any, any>(machine(store, context));
  service.onTransition(state => {
    console.log(state.value);
  });
  service.start();
  await waitForExpect(() => {
    expect(service.state.value).toEqual({ depositor: 'waiting', watcher: 'watching' });
  }, 2000);

  testChain.setHoldings(channelId, '0x01');
  testChain.triggerEvent({
    type: 'DEPOSITED',
    channelId,
    total: '0x01',
    amount: '0x01',
  });

  // TODO: Find a good way of capturing transaction submission

  testChain.setHoldings(channelId, '0x05');
  testChain.triggerEvent({
    type: 'DEPOSITED',
    channelId,
    total: '0x05',
    amount: '0x04',
  });

  await waitForExpect(() => {
    expect(service.state.done).toBe(true);
  });
});

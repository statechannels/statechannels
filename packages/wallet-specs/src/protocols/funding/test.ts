import { interpret, Machine } from 'xstate';
import { FundingStrategyProposed } from '../../wire-protocol';
import { config, Init, mockOptions } from './protocol';
const context: Init = {
  targetChannelId: 'foo',
  tries: 0,
};

it('gets to ledger funding', async () => {
  const service = interpret(
    Machine(config).withConfig(mockOptions, context)
  ).start();
  expect(service.state.value).toMatchObject({
    determineStrategy: 'getClientChoice',
  });

  await service;
  expect(service.state.value).toMatchObject({
    determineStrategy: 'wait',
  });
  const strategyChoice: FundingStrategyProposed = {
    type: 'FUNDING_STRATEGY_PROPOSED',
    choice: 'Indirect',
    targetChannelId: context.targetChannelId,
  };

  service.send(strategyChoice);
  expect(service.state.value).toEqual('fundIndirectly');

  await service;
  expect(service.state.value).toEqual('success');
});

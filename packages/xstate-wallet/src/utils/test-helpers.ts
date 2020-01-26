import {State} from 'xstate';
import {Wallet} from 'ethers';

export function findCalledActions(
  state: State<any, any, any, any>
): Array<{stateType: string; actionType: string}> {
  let historyActions: Array<{stateType: string; actionType: string}> = [];
  if (state.history) {
    historyActions = findCalledActions(state.history);
  }
  const ourActions = state.actions
    .filter(a => !!a.type)
    .map(a => ({actionType: a.type, stateType: state.value.toString()}));

  const mergedActions = historyActions.concat(ourActions);
  return mergedActions.filter((a, i) => mergedActions.indexOf(a) === i);
}

export function generateParticipant(wallet: Wallet) {
  return {
    signingAddress: wallet.address,
    participantId: wallet.address,
    destination: wallet.address
  };
}
export function generateAllocations(a: Wallet, b: Wallet) {
  return [
    {destination: a.address, amount: '0x05'},
    {destination: b.address, amount: '0x05'}
  ];
}

import { State } from 'fmg-core';

import * as states from '../../states';
import * as actions from '../actions';
import { signatureSuccess, validationSuccess } from '../../interface/outgoing';

import decode from '../../utils/decode-utils';
import { unreachable } from '../../utils/reducer-utils';
import { signPositionHex, validSignature } from '../../utils/signing-utils';


export const openingReducer = (state: states.OpeningState, action: actions.WalletAction): states.WalletState => {
  switch (state.type) {
    case states.WAIT_FOR_CHANNEL:
      return waitForChannelReducer(state, action);
    case states.WAIT_FOR_PRE_FUND_SETUP:
      return waitForPreFundSetupReducer(state, action);
    default:
      return unreachable(state);
  }
};

const waitForChannelReducer = (state: states.WaitForChannel, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.OWN_POSITION_RECEIVED:
      const data = action.data;
      const ownPosition = decode(data);

      // all these checks will fail silently for the time being
      // check it's a PreFundSetupA
      if (ownPosition.stateType !== State.StateType.PreFundSetup) { return state; }
      if (ownPosition.stateCount !== 0) { return state; }

      const ourAddress = ownPosition.channel.participants[0] as string;

      if (ourAddress !== state.address) { return state; }

      const signature = signPositionHex(data, state.privateKey);
      // if so, unpack its contents into the state
      return states.waitForPreFundSetup({
        ...state,
        libraryAddress: ownPosition.channel.channelType,
        channelId: ownPosition.channel.id,
        ourIndex: ownPosition.channel.participants.indexOf(state.address),
        participants: ownPosition.channel.participants,
        channelNonce: ownPosition.channel.channelNonce,
        turnNum: 0,
        lastPosition: { data, signature },
        messageOutbox: signatureSuccess(signature),
      });

    case actions.OPPONENT_POSITION_RECEIVED:
      const opponentPosition = decode(action.data);

      // all these checks will fail silently for the time being
      // check it's a PreFundSetupA
      if (opponentPosition.stateType !== State.StateType.PreFundSetup) { return state; }
      if (opponentPosition.stateCount !== 0) { return state; }


      const ourAddress2 = opponentPosition.channel.participants[1] as string;
      const opponentAddress2 = opponentPosition.channel.participants[0] as string;

      if (!validSignature(action.data, action.signature, opponentAddress2)) { return state; }

      if (ourAddress2 !== state.address) { return state; }

      // if so, unpack its contents into the state
      return states.waitForPreFundSetup({
        ...state,
        libraryAddress: opponentPosition.channel.channelType,
        channelId: opponentPosition.channel.id,
        ourIndex: opponentPosition.channel.participants.indexOf(state.address),
        participants: opponentPosition.channel.participants,
        channelNonce: opponentPosition.channel.channelNonce,
        turnNum: 0,
        lastPosition: { data: action.data, signature: action.signature },
        messageOutbox: validationSuccess(),
      });

    default:
      return state;
  }
};

const waitForPreFundSetupReducer = (state: states.WaitForPreFundSetup, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.OWN_POSITION_RECEIVED:
      const data = action.data;
      const ownPosition = decode(data);

      // all these checks will fail silently for the time being
      // check it's a PreFundSetupB
      if (ownPosition.stateType !== State.StateType.PreFundSetup) { return state; }
      if (ownPosition.stateCount !== 1) { return state; }

      const signature = signPositionHex(data, state.privateKey);

      // if so, unpack its contents into the state
      return states.waitForFundingRequest({
        ...state,
        turnNum: 1,
        lastPosition: { data, signature },
        penultimatePosition: state.lastPosition,
        messageOutbox: signatureSuccess(signature),
      });

    case actions.OPPONENT_POSITION_RECEIVED:
      const opponentPosition = decode(action.data);

      // all these checks will fail silently for the time being
      // check it's a PreFundSetupB
      if (opponentPosition.stateType !== State.StateType.PreFundSetup) { return state; }
      if (opponentPosition.stateCount !== 1) { return state; }

      const opponentAddress2 = state.participants[1 - state.ourIndex];

      if (!validSignature(action.data, action.signature, opponentAddress2)) { return state; }

      // if so, unpack its contents into the state
      return states.waitForFundingRequest({
        ...state,
        turnNum: 1,
        lastPosition: { data: action.data, signature: action.signature },
        penultimatePosition: state.lastPosition,
        messageOutbox: validationSuccess(),
      });

    default:
      return state;
  }
};

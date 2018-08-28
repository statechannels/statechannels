import * as playerA from '../wallet-engine/wallet-states/PlayerA';
import * as playerB from '../wallet-engine/wallet-states/PlayerB';
import { WalletState } from '../redux/reducers/wallet-state';
import { PureComponent } from 'react';
import GenericStopGap from './GenericStopGapPage';
import React from 'react';

interface Props {
  walletState: WalletState;
}

export default class WalletController extends PureComponent<Props> {
  render() {
    const { walletState } = this.props;
    if (walletState==null){
        return null;
    }
    switch (walletState && walletState.constructor) {
      case playerA.WaitForBlockchainDeploy:
        return <GenericStopGap message="confirmation of adjudicator deployment" />;

      case playerA.WaitForBToDeposit:
        return <GenericStopGap message="confirmation of opponent's deposit" />;
      case playerB.WaitForAToDeploy:
        return <GenericStopGap message="waiting for adjudicator to be deployed" />;

      case playerB.ReadyToDeposit:
        return <GenericStopGap message="ready to deposit funds" />;

      case playerB.WaitForBlockchainDeposit:
        return <GenericStopGap message="waiting for deposit confirmation" />;
      default:
        return (
          <GenericStopGap message={`[view not implemented: ${walletState.constructor.name}`} />
        );
    }
  }
}

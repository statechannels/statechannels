import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDotCircle } from '@fortawesome/free-solid-svg-icons';
import { connect } from 'react-redux';
import * as states from '../redux/states';

interface NetworkStatusProps {
  networkId: number;
}

export class NetworkStatus extends React.PureComponent<NetworkStatusProps> {
  render() {
    const { networkId } = this.props;
    switch (networkId) {
      case 1:
        return (
          <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <FontAwesomeIcon icon={faDotCircle} style={{ color: 'green' }} />
            &nbsp;&nbsp; Mainnet
          </div>
        );
      case 4:
        return (
          <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <FontAwesomeIcon icon={faDotCircle} style={{ color: 'yellow' }} />
            &nbsp;&nbsp; Rinkeby Test Network
          </div>
        );
      case 3:
        return (
          <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <FontAwesomeIcon icon={faDotCircle} style={{ color: 'pink' }} />
            &nbsp;&nbsp; Ropsten Test Network
          </div>
        );
      case 42:
        return (
          <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <FontAwesomeIcon icon={faDotCircle} style={{ color: 'purple' }} />
            &nbsp;&nbsp; Kovan Test Network
          </div>
        );
      default:
        // If none of the above, assume a local testnet (e.g. ganache)
        return (
          <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <FontAwesomeIcon icon={faDotCircle} style={{ color: 'black' }} />
            &nbsp;&nbsp; Test Net ID:{networkId}
          </div>
        );
    }
  }
}

const mapStateToProps = (state: states.FundingState): NetworkStatusProps => ({
  networkId: state.networkId,
});

export default connect(mapStateToProps)(NetworkStatus);

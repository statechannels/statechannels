import React from 'react';

import {Button, Navbar} from 'reactstrap';
import {Commitment} from 'fmg-core';
import {RulesModal} from './RulesModal';
import NetworkIndicator from '@rimble/network-indicator';

interface Props {
  showRules: boolean;
  logoutRequest: () => void;
  rulesRequest: () => void;
  loginDisplayName: string;
}

function getInitials(loginDisplayName: string): string {
  const userDisplayName = loginDisplayName.split(' ');
  return userDisplayName.map(name => name.charAt(0)).join('');
}

export default class NavigationBar extends React.PureComponent<Props, Commitment> {
  render() {
    let currentNetwork;
    if (window.ethereum) {
      currentNetwork = parseInt(window.ethereum.networkVersion, 10);
    } else {
      currentNetwork = undefined;
    }
    return (
      <Navbar className="navbar">
        <div className="align-self-start">
          <NetworkIndicator
            className="mr-auto"
            currentNetwork={currentNetwork}
            requiredNetwork={process.env.CHAIN_NETWORK_ID}
          />
        </div>
        <div className="align-self-center">
          <div className="circle">
            <div className="navbar-user">{getInitials(this.props.loginDisplayName)}</div>
          </div>
        </div>
        <div className="align-self-end">
          <Button color="link" className="navbar-button" onClick={this.props.rulesRequest}>
            Rules
          </Button>
          <Button color="link" className="navbar-button" onClick={this.props.logoutRequest}>
            Sign Out
          </Button>
        </div>
        <RulesModal visible={this.props.showRules} rulesRequest={this.props.rulesRequest} />
      </Navbar>
    );
  }
}

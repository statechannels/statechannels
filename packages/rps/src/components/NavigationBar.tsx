import React from 'react';
import Switch from 'react-switch';
import {Button, Navbar} from 'reactstrap';
import {Commitment} from 'fmg-core';
import {RulesModal} from './RulesModal';

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
    return (
      <Navbar className="navbar">
        <div className="align-self-start">
          <span className="navbar-button" color="link">
            AutoPlayer A:&nbsp;
          </span>
          <Switch
            className="react-switch ml-auto"
            onChange={() => {
              /* */
            }}
            checked={false}
            disabled={false}
            height={15}
            width={28}
          />
          <br />
          <span className="navbar-button" color="link">
            AutoPlayer B:&nbsp;
          </span>
          <Switch
            className="react-switch ml-auto"
            onChange={() => {
              /* */
            }}
            checked={false}
            disabled={false}
            height={15}
            width={28}
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

import React from 'react';
import Switch from 'react-switch';
import {Button, Navbar} from 'reactstrap';
import {RulesModal} from './RulesModal';

interface Props {
  showRules: boolean;
  autoPlayerA: boolean;
  autoPlayerB: boolean;
  logoutRequest: () => void;
  rulesRequest: () => void;
  enableAutoPlayerA: () => void;
  enableAutoPlayerB: () => void;
  disableAutoPlayerA: () => void;
  disableAutoPlayerB: () => void;
  loginDisplayName: string;
}

function getInitials(loginDisplayName: string): string {
  const userDisplayName = loginDisplayName.split(' ');
  return userDisplayName.map(name => name.charAt(0)).join('');
}

export default class NavigationBar extends React.Component<Props> {
  handleAchange = (checked, event, id) => {
    if (checked) {
      this.props.enableAutoPlayerA();
    } else {
      this.props.disableAutoPlayerA();
    }
  };
  handleBchange = (checked, event, id) => {
    if (checked) {
      this.props.enableAutoPlayerB();
    } else {
      this.props.disableAutoPlayerB();
    }
  };
  render() {
    return (
      <Navbar className="navbar">
        <div className="align-self-start">
          <span className="navbar-button" color="link">
            AutoPlayer A:&nbsp;
          </span>
          <Switch
            className="react-switch ml-auto"
            onChange={this.handleAchange}
            checked={this.props.autoPlayerA}
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
            onChange={this.handleBchange}
            checked={this.props.autoPlayerB}
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

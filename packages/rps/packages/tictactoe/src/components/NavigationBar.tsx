import React from "react";
import { YourMarker } from './Marker';
import { Button, Navbar } from "reactstrap";
import { State } from "fmg-core";
import { RulesModal } from "./RulesModal";
import { Marker } from '../core';

interface Props {
  showRules: boolean;
  logoutRequest: () => void;
  rulesRequest: () => void;
  loginDisplayName: string;
  you: Marker;
}


export default class NavigationBar extends React.PureComponent<Props, State> {
  render() {
    return (
      <Navbar className='navbar'>
        <Button color="link" className="navbar-button mr-auto" onClick={this.props.rulesRequest}>
          Rules
        </Button>
        <YourMarker you={this.props.you} />
        <Button color="link" className="navbar-button ml-auto" onClick={this.props.logoutRequest}>
          Sign Out
        </Button>
        <RulesModal visible={this.props.showRules} rulesRequest={this.props.rulesRequest}/>
      </Navbar>
    );
  }
}

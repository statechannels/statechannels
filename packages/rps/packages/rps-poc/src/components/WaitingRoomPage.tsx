import React from 'react';

import Button from './Button';

import FooterBar from './FooterBar';
import { Challenge } from '../redux/application/reducer';
import web3Utils from 'web3-utils';

interface Props {
  cancelChallenge: () => void;
  myChallenge: Challenge;
}

export default class WaitingRoomPage extends React.PureComponent<Props> {
  render() {
    
    const { cancelChallenge, myChallenge } = this.props;
    return (
      <React.Fragment>
        <h2>Waiting for someone to accept your challenge for {web3Utils.fromWei(myChallenge.stake.toString(),'finney')} finney</h2>

        <Button onClick={cancelChallenge}>Cancel</Button>

        <FooterBar>Waiting ...</FooterBar>
      </React.Fragment>
    );
  }
};


import React from 'react';

import { Challenge } from '../redux/application/reducer';

import { Table } from 'reactstrap';
import BN from 'bn.js';
import web3Utils from 'web3-utils';
import { AUTO_OPPONENT_ADDRESS } from '../constants';

interface Props {
  challenges: Challenge[];
  acceptChallenge: (address: string, stake: BN) => void;
}

export default class SelectChallenge extends React.PureComponent<Props> {
  constructor(props) {
    super(props);
  }

  render() {
    const { challenges, acceptChallenge } = this.props;
    return (
      <React.Fragment>
        <Table hover={true}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Wager (Finney)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              key={AUTO_OPPONENT_ADDRESS}
              onClick={() =>
                acceptChallenge(AUTO_OPPONENT_ADDRESS, new BN(web3Utils.toWei('30', 'finney')))
              }
            >
              <td>RockBot 🤖 </td>
              <td>30</td>
            </tr>
            {challenges.map(challenge => (
              <tr
                key={challenge.address}
                onClick={() => acceptChallenge(challenge.address, challenge.stake)}
              >
                <td>{challenge.name}</td>
                <td>{web3Utils.fromWei(challenge.stake.toString(), 'finney')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </React.Fragment>
    );
  }
}

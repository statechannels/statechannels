import _ from 'lodash';
import React from 'react';

import web3Utils from 'web3-utils';

import { OpenGame } from '../redux/open-games/state';

import { Button, ButtonGroup, Table } from 'reactstrap';
import BN from 'bn.js';

interface Props {
  openGames: OpenGame[];
  joinOpenGame: (
    myName: string,
    myAddress: string,
    opponentName: string,
    opponentAddress: string,
    libraryAddress: string,
    channelNonce: number,
    roundBuyIn: BN,
  ) => void;
  newOpenGame: () => void;
  logoutRequest: () => void;
}

const initialState = { showChallenges: true };
type State = Readonly<typeof initialState>;

export default class LobbyPage extends React.PureComponent<Props, State> {
  readonly state: State = initialState;

  render() {
    const { newOpenGame, joinOpenGame, logoutRequest } = this.props;
    const openGames = this.props.openGames || [];

    return (
      <div className="container centered-container">
        <div className="w-100">
          <ButtonGroup className="d-flex w-100 mb-3">
            <Button
              className="w-50"
              outline={false}
            >
              Select an opponent
            </Button>
            <Button
              className="w-50"
              outline={true}
              onClick={newOpenGame}
            >
              Create a game
            </Button>
          </ButtonGroup>

          <div className="mb-5">
            <Table hover={true}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Wager (Finney)</th>
                </tr>
              </thead>
              <tbody>
                {openGames.map(openGame => (
                  <tr
                    key={openGame.address}
                    onClick={() => joinOpenGame(
                      'TODO myName',
                      'TODO myAddress',
                      openGame.name,
                      openGame.address,
                      'TODO libraryAddress',
                      5,
                      openGame.stake)}
                  >
                    <td>{openGame.name}</td>
                    <td>{web3Utils.fromWei(openGame.stake.toString(), 'finney')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <Button onClick={logoutRequest}>Logout</Button>
        </div>
      </div>
    );
  }
}

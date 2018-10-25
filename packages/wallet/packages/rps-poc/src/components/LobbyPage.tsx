import _ from 'lodash';
import React from 'react';

import web3Utils from 'web3-utils';

import { OpenGame } from '../redux/open-games/state';

import { Button, ButtonGroup, Table } from 'reactstrap';
import BN from 'bn.js';
import NavigationBar from './NavigationBar';
import { LoginState } from 'src/redux/login/reducer';
import { RulesState } from 'src/redux/global/state';

interface Props {
  loginState: LoginState;
  rulesState: RulesState;
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
  rulesRequest: () => void;
}

const initialState = { showChallenges: true };
type State = Readonly<typeof initialState>;

export default class LobbyPage extends React.PureComponent<Props, State> {
  readonly state: State = initialState;

  render() {
    const { loginState, rulesState, newOpenGame, joinOpenGame, logoutRequest, rulesRequest } = this.props;
    const openGames = this.props.openGames || [];

    return (
      <div className="w-100">
        <NavigationBar login={loginState} rules={rulesState} logoutRequest={logoutRequest} rulesRequest={rulesRequest}/>
        <div className="container centered-container w-100">
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
          </div>
        </div>
      </div>
    );
  }
}

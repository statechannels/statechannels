import React from 'react';
import Button from 'reactstrap/lib/Button';
import SidebarLayout from '../SidebarLayout';
import { StyleSheet, css } from 'aphrodite';

export enum ChallengeOptions {
  RespondWithMove,
  RespondWithExistingMove,
}

interface Props {
  expiryTime: number;
  selectRespondWithMove: () => void;
  selectRespondWithExistingMove: () => void;
  challengeOptions: ChallengeOptions[];
}

export default class ChooseResponse extends React.PureComponent<Props> {

  render() {
    const { expiryTime, selectRespondWithMove, selectRespondWithExistingMove, challengeOptions } = this.props;
    const expiryDate = new Date(expiryTime * 1000).toLocaleTimeString().replace(/:\d\d /, ' ');
    // TODO: We should add hover text or an icon to these options to fully explain what they mean to the user.
    return (
      <SidebarLayout>
        <h1>
          A challenge has been issued
      </h1>
        <p>
          The other player has challenged you! The game will expire at {expiryDate} if you do not respond.
          Select how you would like to respond:
      </p>
        <div className="challenge-expired-button-container" >
          <span className={css(styles.button)}>
            {challengeOptions.indexOf(ChallengeOptions.RespondWithMove) > -1 && <Button onClick={selectRespondWithMove} >
              Respond with Move
          </Button>}
            {challengeOptions.indexOf(ChallengeOptions.RespondWithExistingMove) > -1 && <Button onClick={selectRespondWithExistingMove} >Respond with Existing Move
          </Button>}
          </span>
        </div>
      </SidebarLayout>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    margin: '8px',
  },
});
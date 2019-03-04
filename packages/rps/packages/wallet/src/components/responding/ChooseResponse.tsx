import React from 'react';
import Button from 'reactstrap/lib/Button';
import SidebarLayout from '../SidebarLayout';
import { StyleSheet, css } from 'aphrodite';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHourglassHalf } from '@fortawesome/free-solid-svg-icons';


const timeRunningIcon = (
  <span className="fa-li" ><FontAwesomeIcon icon={faHourglassHalf} size="lg" pulse={true} margin-left="auto" margin-right="auto" /></span>
);


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
    const { expiryTime, selectRespondWithMove, selectRespondWithExistingMove, challengeOptions, } = this.props;
    const expiryDate = new Date(expiryTime * 1000).toLocaleTimeString().replace(/:\d\d /, ' ');
    // TODO: We should add hover text or an icon to these options to fully explain what they mean to the user.
    return (
      <SidebarLayout>
        <h2>
          A challenge has been issued
      </h2>
        <div style={{ paddingBottom: "1em" }}>
          The game will expire at
          <ul className="fa-ul">
            <li style={{ padding: "0.7em 1em" }}>
              {timeRunningIcon}
              {expiryDate}
            </li>
          </ul>
          if you do not respond!<br />
        </div>
        <p>
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
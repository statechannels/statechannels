import React from 'react';
import { Button } from 'reactstrap';
import { StyleSheet, css } from 'aphrodite';
import SidebarLayout from './SidebarLayout';
import magmoFireBall from '../images/white_fireball.svg';

interface Props {
  title: string;
  action: () => void;
  actionTitle: string;
  description: string;
}

export default class AcknowledgeX extends React.PureComponent<Props> {
  render() {
    const { title, action, actionTitle, description } = this.props;
    return (
      <SidebarLayout>
        <h1>
          {title}
        </h1>
        <p>
          {description}
        </p>
        <div className="challenge-expired-button-container" >
          <div className={css(styles.buttonContainer)}>
            <span className={css(styles.button)}>
              <Button onClick={action} >
              <img src={magmoFireBall}/>&nbsp;&nbsp;{actionTitle}
              </Button>
            </span>
          </div>
        </div>
      </SidebarLayout>
    );
  }
}

const styles = StyleSheet.create({
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '5px',
    position: "absolute",
    top: 'auto',
    bottom: '5%',
  },
  button: {
    margin: '8px',
  },
});
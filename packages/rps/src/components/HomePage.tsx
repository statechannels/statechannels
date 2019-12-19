import React from 'react';
import {StyleSheet, css} from 'aphrodite';
import {Button} from 'reactstrap';
import ConnectionBanner from '@rimble/connection-banner';
import {MetamaskState} from 'src/redux/metamask/state';
interface Props {
  metamaskState: MetamaskState;
  login: () => any;
}

const HomePage: React.SFC<Props> = ({login, metamaskState}) => {
  const currentNetwork = Number(metamaskState.network);
  const targetNetwork = Number(process.env.CHAIN_NETWORK_ID);
  return (
    <div>
      <div className="homePage">
        <div className="homePage-container">
          <div className="homePage-title-container">
            <h1 className={css(styles.title)}>Welcome to Rock, Paper Scissors</h1>
            <h1 className={css(styles.title)}>State Channel Game</h1>
          </div>
          <Button
            className="cog-button homePage-loginButton"
            onClick={login}
            disabled={currentNetwork !== targetNetwork}
          >
            Start Playing!
          </Button>
        </div>
      </div>
      <div className="homePage-image" />
      <ConnectionBanner
        currentNetwork={currentNetwork}
        requiredNetwork={targetNetwork}
        onWeb3Fallback={false}
      />
    </div>
  );
};

export default HomePage;

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },

  image: {
    display: 'inline-block',
    maxWidth: '33%',
  },

  title: {
    marginBottom: 0,
    color: 'white',
  },

  centeredGroup: {
    left: '50%',
    transform: 'translateX(-50%)',
  },

  icons: {
    position: 'relative',
    width: 'max-content',
  },

  rightPadding: {
    paddingRight: 12,
  },

  headerText: {
    textAlign: 'center',
    paddingBottom: 32,
  },

  buttons: {
    position: 'absolute',
    bottom: 40,
  },
});

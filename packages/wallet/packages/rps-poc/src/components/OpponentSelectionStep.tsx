import _ from 'lodash';
import React from 'react';

import Button from './Button';

interface IProps {
  handleMessageSent: (x: any, y: any) => void;
  handleCreateChallenge: (x: any, y: any) => any;
  handleSelectChallenge: (x: any) => any;
  opponents: [
    {
      id: string;
      name: string;
      timestamp: string;
      wager: string;
    }
  ];
}

const defaultProps = {
  opponents: [],
};

export default class OpponentSelectionStep extends React.PureComponent<IProps> {
  public static defaultProps: { opponents: any[] };
  nameInput: React.RefObject<HTMLInputElement>;
  wagerInput: React.RefObject<HTMLInputElement>;

  constructor(props) {
    super(props);

    this.nameInput = React.createRef();
    this.wagerInput = React.createRef();

    _.bindAll(this, ['onClickCreateChallenge', 'handleSelectChallenge']);
  }

  onClickCreateChallenge() {
    const { handleCreateChallenge } = this.props;
    const name = _.get(this.nameInput, 'current.value');
    const wager = Number(_.get(this.wagerInput, 'current.value'));
    if (!name || !wager) {
      return;
    }

    handleCreateChallenge(name, wager);
  }

  handleSelectChallenge({ opponentId, stake }) {
    // todo: implement logic to generate preFundMessage:
    // this.props.handleMessageSent(preFundMessage)
  }

  render() {
    const { opponents } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Select an opponent:</h1>
        </div>
        <div
          style={{
            left: '50%',
            position: 'absolute',
            transform: 'translateX(-50%)',
          }}
        >
          <table style={{ textAlign: 'left' }}>
            <tbody>
              <tr style={{ height: 60 }}>
                <th>Name</th>
                <th>Wager (Finney)</th>
                <th>Time initiated</th>
                <th />
              </tr>
              {opponents.map(opponent => (
                <tr key={opponent.id}>
                  <td>{opponent.name}</td>
                  <td>{opponent.wager}</td>
                  <td>{opponent.timestamp}</td>
                  <td>
                    <Button
                      onClick={() =>
                        this.handleSelectChallenge({
                          opponentId: opponent.id,
                          stake: opponent.wager,
                        })
                      }
                    >
                      Challenge
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form>
            <h3>Or, create a challenge:</h3>
            <div style={{ marginTop: 12 }}>
              Name:
              <input style={{ marginLeft: 12 }} type="text" name="name" ref={this.nameInput} />
            </div>
            <div style={{ marginTop: 12 }}>
              Wager (in Finney):
              <input style={{ marginLeft: 12 }} type="text" name="wager" ref={this.wagerInput} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Button onClick={this.onClickCreateChallenge}>Submit</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

OpponentSelectionStep.defaultProps = defaultProps;

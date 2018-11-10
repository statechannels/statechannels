import React from 'react';
import Button from 'reactstrap/lib/Button';
import { ChallengeResponse as ResponseOption, RespondWithMove, RespondWithAlternativeMove, Refute, Conclude } from '../domain/ChallengeResponse';
import { Signature, ConclusionProof } from '../domain';
import walletIcon from '../../images/wallet_icon.svg';

interface Props {
  responseOptions: ResponseOption[];
  expiryTime: number;
  respondWithMove: () => void;
  respondWithAlternativeMove: (alternativePosition: string, alternativeSignature: Signature, response: string, responseSignature: Signature) => void;
  refute: (newerPosition: string, signature: Signature) => void;
  conclude: (proof: ConclusionProof) => void;
}

export default class ChallengeResponse extends React.PureComponent<Props> {
  constructor(props) {
    super(props);
    this.handleRespondWithMove = this.handleRespondWithMove.bind(this);
    this.handleConclude = this.handleConclude.bind(this);
    this.handleRespondWithAlternativeMove = this.handleRespondWithAlternativeMove.bind(this);
    this.handleRefute = this.handleRefute.bind(this);
  }
  handleRespondWithMove() {
    this.props.respondWithMove();
  }
  handleRespondWithAlternativeMove(option: RespondWithAlternativeMove) {
    this.props.respondWithAlternativeMove(option.theirPosition, option.theirSignature, option.myPosition, option.mySignature);
  }

  handleRefute(option: Refute) {
    this.props.refute(option.theirPosition, option.theirSignature);
  }

  handleConclude(option: Conclude) {
    this.props.conclude(option.conclusionProof);
  }

  render() {
    const { responseOptions, expiryTime } = this.props;
    const parsedExpiryDate = new Date(expiryTime * 1000).toLocaleTimeString();

    return (
      <div className="challenge-response-text challenge-response-container">
        <div className="challenge-response-header">
          <img src={walletIcon} />
        </div>
        <img src={walletIcon} className="challenge-response-icon" />
        <div className="challenge-response-title">A challenge has been issued</div>
        <p>A challenge has been detected! You need to respond by {parsedExpiryDate} or the game will conclude.</p>
        <p>You can:</p>
        <div className="challenge-response-button-container" >
          {responseOptions.map(option => {
            if (option instanceof RespondWithMove) {
              return <Button className="challenge-response-button" onClick={this.handleRespondWithMove} key={option.constructor.name} >Respond with Move</Button>;
            }
            else if (option instanceof RespondWithAlternativeMove) {
              return <Button className="challenge-response-button" onClick={() => { this.handleRespondWithAlternativeMove(option); }} key={option.constructor.name} >Respond with Alternative Move</Button>;
            }
            else if (option instanceof Refute) {
              return <Button className="challenge-response-button" onClick={() => { this.handleRefute(option); }} key={option.constructor.name} >Refute</Button>;
            }
            else if (option instanceof Conclude) {
              return <Button className="challenge-response-button" onClick={() => { this.handleConclude(option); }} key={option.constructor.name} >Conclude</Button>;
            } else {
              return null;
            }
          })}
        </div>
      </div>);
  }
}

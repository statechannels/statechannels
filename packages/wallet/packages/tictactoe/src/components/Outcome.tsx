import React from 'react';
// import { Marks } from '../core/marks'
import { Result, Imperative } from '../core/results';

interface Props {
  result: Result | Imperative;
}

export default class Outcome extends React.PureComponent<Props> {
  renderResult(result: Result | Imperative) {
    if (result === Result.YouWin) {
      return (<h1 className="full-width-bar" id="you-win"><span>You Win!</span></h1>);
    }
    if (result === Result.YouLose) {
      return (<h1 className="full-width-bar" id="you-lose"><span>You Lose!</span></h1>);
    }
    if (result === Result.Tie) {
      return (<h1 className="full-width-bar" id="tie"><span>It's a Draw!</span></h1>);
    }
    if (result === Imperative.Choose) {
      return (<h1 className="full-width-bar" id="choose"><span>Choose your move</span></h1>);
    }
    if (result === Imperative.Wait) {
      return (<h1 className="full-width-bar" id="wait"><span>Wait for Opponent's move!</span></h1>);
    } else { return <span>&nbsp;</span>; }
  }

  render() {
    const { result } = this.props;
    return (
      <div id="outcome-container">
        {this.renderResult(result)}
      </div>

    );
  }
}
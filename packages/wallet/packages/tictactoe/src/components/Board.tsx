import React from 'react';
import { Marks } from '../core/marks';
import { winningPatterns, isWinningMarks, isDraw } from '../core/results';
import { Marker } from '../core';

interface Props {
  noughts: Marks;
  crosses: Marks;
  you: Marker;
  marksMade: (marks: Marks) => void;
}

export default class Board extends React.PureComponent<Props> {
  crucialMark(marks: Marks, position: Marks) {
    let pattern: Marks;
    for (pattern of winningPatterns) {
      if (((marks & pattern) === pattern) && ((position & pattern) === position)) {
        return true; // does this pattern contain 
      }
    }
    return false;
  }

  blankRenderMark(you: Marker) {
    switch (you) {
      case Marker.noughts:
        return (<span className="os empty tile">○</span>);
      case Marker.crosses:
        return (<span className="xs empty tile">×</span>);
    }
  }

  winRenderMark(noughts: Marks, crosses: Marks, position: Marks) {
    if ((crosses & position) === position) {
      if (this.crucialMark(crosses, position)) {
        return (<span className="xs tile">×</span>);
      } else { return (<span className="xs tile dim">×</span>); }
    }
    if ((noughts & position) === position) {
      if (this.crucialMark(noughts, position)) {
        return (<span className="os tile">○</span>);
      } else { return (<span className="os tile dim">○</span>); }
    } else { return this.blankRenderMark(this.props.you); } 
  }


  noWinRenderMark(noughts: Marks, crosses: Marks, position: Marks) {
    if ((crosses & position) === position) {
      if (this.crucialMark(crosses, position)) {
        return (<span className="xs tile">×</span>);
      } else { return (<span className="xs tile">×</span>); }
    }
    if ((noughts & position) === position) {
      if (this.crucialMark(noughts, position)) {
        return (<span className="os tile">○</span>);
      } else { return (<span className="os tile">○</span >); }
    } else { return this.blankRenderMark(this.props.you); }
  }

  drawRenderMark(noughts: Marks, crosses: Marks, position: Marks) {
    if ((crosses & position) === position) {
      return (<span className="xs tile dim">×</span >);
    }
    if ((noughts & position) === position) {
      return (<span className="os tile dim">○</span >);
    } else { return this.blankRenderMark(this.props.you); }
  }


  renderMark(noughts: Marks, crosses: Marks, position: Marks) {
    if (isWinningMarks(noughts) || isWinningMarks(crosses)) {
      return this.winRenderMark(noughts, crosses, position);
    } else if (isDraw(noughts, crosses)) {
      return this.drawRenderMark(noughts, crosses, position);
    } else {
      return this.noWinRenderMark(noughts, crosses, position); 
    }
  }

  attemptToDispatchMarks(marks: Marks) {
    const noughts = this.props.noughts;
    const crosses = this.props.crosses;
    if (
      (crosses & marks) === marks ||
      (noughts & marks) === marks
      ) {
      return;
      }
    else {
      return this.props.marksMade(marks); // only allow this if tile is unoccupied
    }
    
  }
  render() {
    const { noughts, crosses } = this.props;
    return (
      <div id="table-container">
        <table>
          <tbody>
          <tr>
            <td id="tl" onClick={() => this.attemptToDispatchMarks(Marks.tl)}>
              {this.renderMark(noughts, crosses, Marks.tl)}
            </td>
            <td id="tm" onClick={() => this.attemptToDispatchMarks(Marks.tm)}>
              {this.renderMark(noughts, crosses, Marks.tm)}
            </td>
            <td id="tr" onClick={() => this.attemptToDispatchMarks(Marks.tr)}>
              {this.renderMark(noughts, crosses, Marks.tr)}
            </td>
          </tr>
          <tr>
            <td id="ml" onClick={() => this.attemptToDispatchMarks(Marks.ml)}>
              {this.renderMark(noughts, crosses, Marks.ml)}
            </td>
            <td id="mm" onClick={() => this.attemptToDispatchMarks(Marks.mm)}>
              {this.renderMark(noughts, crosses, Marks.mm)}
            </td>
            <td id="mr" onClick={() => this.attemptToDispatchMarks(Marks.mr)}>
              {this.renderMark(noughts, crosses, Marks.mr)}
            </td>
          </tr>
          <tr>
            <td id="bl" onClick={() => this.attemptToDispatchMarks(Marks.bl)}>
              {this.renderMark(noughts, crosses, Marks.bl)}
            </td>
            <td id="bm" onClick={() => this.attemptToDispatchMarks(Marks.bm)}>
              {this.renderMark(noughts, crosses, Marks.bm)}
            </td>
            <td id="br" onClick={() => this.attemptToDispatchMarks(Marks.br)}>
              {this.renderMark(noughts, crosses, Marks.br)}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    );
  }
}
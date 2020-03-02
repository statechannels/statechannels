import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';

export default class GameController extends Controller {
  @tracked Xs = 0b000000000;
  @tracked Os = 0b000000000;
  @tracked player = 'x';

  get board(): {
    class: string;
    status: string;
  }[] {
    const arr = [];
    for (let i = 0; i < 9; i++) {
      const status = (1 << i) & this.Xs ? 'x' : (1 << i) & this.Os ? 'o' : '';
      const obj = {
        class: 'flex justify-center items-center',
        status
      };
      arr.push(obj);
    }
    arr[1].class += ' border-l-2 border-r-2 border-line';
    arr[3].class += ' border-t-2 border-b-2 border-line';
    arr[4].class += ' border-2 border-line';
    arr[5].class += ' border-t-2 border-b-2 border-line';
    arr[7].class += ' border-l-2 border-r-2 border-line';
    return arr;
  }

  @action
  protected setTile(index: number): void {
    if ((1 << index) & this.Xs || (1 << index) & this.Os) {
      return;
    }

    if (this.player == 'x') {
      this.Xs |= 1 << index;
      this.player = 'o';
    } else {
      this.Os |= 1 << index;
      this.player = 'x';
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    game: GameController;
  }
}

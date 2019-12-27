import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';

export default class LobbyController extends Controller {
  @tracked showOpenGameModal = false;
}

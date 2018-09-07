import BasePlayerA from './Base';

export default class Funded extends BasePlayerA {
  readonly isReadyToSend = false;
  readonly isFunded = true;
}

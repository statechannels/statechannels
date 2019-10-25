import EventEmitter, {ListenerFn} from 'eventemitter3';

const events = new EventEmitter();

const channelProvider = {
  on(event: string, callback: ListenerFn) {
    events.on(event, callback);
  }
};

export {channelProvider};

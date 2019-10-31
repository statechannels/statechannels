import {JsonRpcRequest} from '@statechannels/channel-provider';
import {ReactWrapper} from 'enzyme';

export async function simulateMessage(component: ReactWrapper, message: Partial<JsonRpcRequest>) {
  await new Promise(resolve => {
    window.postMessage(message, '*');
    window.onmessage = (event: MessageEvent) => {
      if (event.data === 'ui:wallet:ack') {
        component.update();
        resolve();
      }
    };
  });
}

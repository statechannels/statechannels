import {ReactWrapper} from 'enzyme';
import {JsonRpcRequest} from '../types';

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

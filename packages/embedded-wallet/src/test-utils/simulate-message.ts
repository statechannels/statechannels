import {ReactWrapper} from 'enzyme';
import {JsonRPCRequest} from 'web3/providers';

export async function simulateMessage(component: ReactWrapper, message: Partial<JsonRPCRequest>) {
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

import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import React from "react";
import { JsonRPCRequest } from "web3/providers";
import { MessageListener, RequestReceivedCallback } from "./MessageListener";

Enzyme.configure({ adapter: new Adapter() });

describe("MessageListener", () => {
  it("should instantiate", () => {
    const component = mount(<MessageListener />);
    expect(component.find("[data-test-selector='message-listener']").exists()).toEqual(true);
  });

  it("should render a component when receiving a registered method", async done => {
    let onRequestReceived: RequestReceivedCallback;

    onRequestReceived = (request: JsonRPCRequest) => {
      expect(request.method).toEqual("chan_test");
      done();
    };

    mount(<MessageListener onRequestReceived={onRequestReceived} />);
    window.postMessage({ jsonrpc: "2.0", method: "chan_test" }, "*");
  });
});

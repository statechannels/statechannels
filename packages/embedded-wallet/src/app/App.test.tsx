import Enzyme, { mount, ReactWrapper } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import React from "react";
import { act } from "react-dom/test-utils";
import { simulateMessage } from "../test-utils";
import App from "./App";

Enzyme.configure({ adapter: new Adapter() });

describe("App", () => {
  let component: ReactWrapper;

  beforeEach(() => {
    component = mount(<App />);
  });

  it("should render UI for TestMessage", async () => {
    await act(async () => {
      await simulateMessage(component, { jsonrpc: "2.0", method: "chan_test" });
    });

    expect(component.find("[data-test-selector='handler:chan_test']").exists()).toEqual(true);
  });

  it("should render UI for UnicornMessage", async () => {
    await act(async () => {
      await simulateMessage(component, { jsonrpc: "2.0", method: "chan_unicorn" });
    });

    expect(component.find("[data-test-selector='handler:chan_unicorn']").exists()).toEqual(true);
  });

  afterEach(() => {
    window.onmessage = null;
  });
});

import Enzyme, { mount, ReactWrapper } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import React from "react";
import App from "./App";

Enzyme.configure({ adapter: new Adapter() });

describe("App", () => {
  let component: ReactWrapper;

  beforeEach(() => {
    component = mount(<App />);
  });

  it("should include a MessageListener instance", () => {
    expect(component.find("[data-test-selector='message-listener']").exists()).toEqual(true);
  });
});

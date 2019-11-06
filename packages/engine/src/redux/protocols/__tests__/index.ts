import {ProtocolLocator, EmbeddedProtocol} from "../../../communication";
import {EngineAction} from "../../actions";
import {SharedData} from "../../state";
import {prependToLocator} from "..";
import {SignedState} from "@statechannels/nitro-protocol";

interface BaseScenario<T, S> {
  action: T;
  state: S;
  sharedData: SharedData;
}
interface ScenarioWithReply<T, S> extends BaseScenario<T, S> {
  reply: SignedState[];
}
export function prependToScenarioLocator<
  T extends EngineAction & {protocolLocator: ProtocolLocator},
  S extends {protocolLocator: ProtocolLocator},
  Scenario extends BaseScenario<T, S> | ScenarioWithReply<T, S>
>(scenario: Scenario, protocol: ProtocolLocator | EmbeddedProtocol) {
  return {
    ...scenario,
    action: prependToLocator(scenario.action, protocol),
    state: prependToLocator(scenario.state, protocol)
  };
}

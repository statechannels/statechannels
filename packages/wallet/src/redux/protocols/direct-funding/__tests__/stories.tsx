import {addStoriesFromScenario as addStories} from "../../../../__stories__";
import {DirectFunding} from "../container";

import * as scenarios from "./scenarios";

addStories(scenarios.aHappyPath, "Direct Funding / PlayerA / Happy Path", DirectFunding);

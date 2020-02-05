import {addStoriesFromScenario as addStories} from "../../../../__stories__";
import {VirtualFunding} from "../container";

import * as scenarios from "./scenarios";

addStories(scenarios.happyPath, "Virtual Funding/ Happy Path", VirtualFunding);

import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

// Load environment variables from .env
import "../config/env";
import {AddressZero} from "ethers/constants";

Enzyme.configure({adapter: new Adapter()});

// Mock out util functions that require a networkContext
jest.mock("../src/utils/contract-utils.ts", () => ({
  getContractAddress: jest.fn(() => AddressZero),
  getNetworkId: jest.fn(() => 3),
  getETHAssetHolderAddress: jest.fn(() => AddressZero),
  getERC20AssetHolderAddress: jest.fn(() => AddressZero),
  getAdjudicatorContractAddress: jest.fn(() => AddressZero),
  // tslint:disable-next-line: no-empty
  getAdjudicatorContract: jest.fn(() => {}),
  getConsensusContractAddress: jest.fn(() => AddressZero),
  getProvider: jest.fn(() => {
    return {
      getCode: jest.fn(() => "0x0")
    };
  })
}));

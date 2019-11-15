import * as ethers from "ethers";
import Ajv from "ajv";
import * as createChannelParamsSchema from "../create-channel-params.json";
import * as definitionsSchema from "../definitions.json";
const validAddress = ethers.Wallet.createRandom().address;
const appData = "0x0";

it("validates a valid object", () => {
  const participants = [
    {
      participantId: "user-a",
      signingAddress: validAddress,
      destination: validAddress
    },
    {
      participantId: "user-b",
      signingAddress: validAddress,
      destination: validAddress
    }
  ];
  const allocations = [
    {
      token: "0x0",
      allocationItems: [
        {destination: validAddress, amount: "0x12"},
        {destination: validAddress, amount: "0x12"}
      ]
    }
  ];
  const createChannelParams = {
    participants,
    allocations,
    appDefinition: validAddress,
    appData
  };
  const ajv = new Ajv();
  const validate = ajv.addSchema(definitionsSchema).compile(createChannelParamsSchema);
  expect(validate(createChannelParams)).toBe(true);
});

it("fails when an address is invalid", () => {
  const participants = [
    {
      participantId: "user-a",
      signingAddress: validAddress,
      destination: "0x0"
    },
    {
      participantId: "user-b",
      signingAddress: validAddress,
      destination: validAddress
    }
  ];
  const allocations = [
    {
      token: "0x0",
      allocationItems: [
        {destination: validAddress, amount: "0x12"},
        {destination: validAddress, amount: "0x12"}
      ]
    }
  ];
  const createChannelParams = {
    participants,
    allocations,
    appDefinition: validAddress,
    appData
  };
  const ajv = new Ajv();
  const validate = ajv.addSchema(definitionsSchema).compile(createChannelParamsSchema);

  const isValid = validate(createChannelParams);
  console.log(validate.errors);
  expect(isValid).toBe(false);
});

it("fails when the object is incomplete", () => {
  const participants = [
    {
      participantId: "user-a",
      signingAddress: validAddress,
      destination: validAddress
    },
    {
      participantId: "user-b",
      signingAddress: validAddress,
      destination: validAddress
    }
  ];

  const createChannelParams = {
    participants,
    // Missing allocations
    appDefinition: validAddress,
    appData
  };
  const ajv = new Ajv();
  const validate = ajv.addSchema(definitionsSchema).compile(createChannelParamsSchema);

  const isValid = validate(createChannelParams);
  console.log(validate.errors);
  expect(isValid).toBe(false);
});

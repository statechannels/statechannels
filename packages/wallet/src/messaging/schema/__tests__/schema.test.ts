import * as ethers from "ethers";
import Ajv from "ajv";
import * as requestSchema from "../request.json";
import * as createChannelSchema from "../create-channel.json";
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
  const request = {
    jsonrpc: "2.0",
    method: "CreateChannel",
    id: 1,
    params: createChannelParams
  };

  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(createChannelSchema)
    .compile(requestSchema);
  const isValid = validate(request);

  expect(isValid).toBe(true);
});

it("fails when an address is invalid", () => {
  const participants = [
    {
      participantId: "user-a",
      signingAddress: "0x0",
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
  const request = {
    jsonrpc: "2.0",
    method: "CreateChannel",
    id: 1,
    params: createChannelParams
  };

  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(createChannelSchema)
    .compile(requestSchema);
  const isValid = validate(request);

  expect(isValid).toBe(false);
});

it("fails when data is missing", () => {
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
    // allocation is missing
    appDefinition: validAddress,
    appData
  };
  const request = {
    jsonrpc: "2.0",
    method: "CreateChannel",
    id: 1,
    params: createChannelParams
  };

  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(createChannelSchema)
    .compile(requestSchema);
  const isValid = validate(request);

  expect(isValid).toBe(false);
});

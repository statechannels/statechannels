import Ajv, {ErrorObject} from "ajv";
import * as requestSchema from "./schema/request.json.js";
import * as responseSchema from "./schema/response.json.js";
import * as createChannelSchema from "./schema/create-channel.json.js";
import * as getAddressSchema from "./schema/get-address.json.js";
import * as joinChannelSchema from "./schema/join-channel.json.js";
import * as updateChannelSchema from "./schema/update-channel.json.js";
import * as definitionsSchema from "./schema/definitions.json.js";
import * as pushMessageSchema from "./schema/push-message.json.js";
import * as notifSchema from "./schema/notification.json.js";

export interface ValidationResult {
  isValid: boolean;
  errors: ErrorObject[];
}

export async function validateRequest(jsonRpcRequest: object): Promise<ValidationResult> {
  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(createChannelSchema)
    .addSchema(getAddressSchema)
    .addSchema(joinChannelSchema)
    .addSchema(updateChannelSchema)
    .addSchema(pushMessageSchema)
    .compile(requestSchema);
  const isValid = await validate(jsonRpcRequest);

  return {isValid, errors: validate.errors ? validate.errors : []};
}

export async function validateResponse(jsonRpcResponse: object): Promise<ValidationResult> {
  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(createChannelSchema)
    .addSchema(getAddressSchema)
    .addSchema(joinChannelSchema)
    .addSchema(updateChannelSchema)
    .addSchema(pushMessageSchema)
    .compile(responseSchema);
  const isValid = await validate(jsonRpcResponse);

  return {isValid, errors: validate.errors ? validate.errors : []};
}

export async function validateNotification(jsonRpcNotification: object): Promise<ValidationResult> {
  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(createChannelSchema)
    .addSchema(getAddressSchema)
    .addSchema(joinChannelSchema)
    .addSchema(updateChannelSchema)
    .addSchema(pushMessageSchema)
    .addSchema(requestSchema)
    .addSchema(responseSchema)
    .compile(notifSchema);
  const isValid = await validate(jsonRpcNotification);

  return {isValid, errors: validate.errors ? validate.errors : []};
}

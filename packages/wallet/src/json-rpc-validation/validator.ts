import Ajv, {ErrorObject} from "ajv";
import requestSchema from "./schema/request.json";
import responseSchema from "./schema/response.json";
import createChannelSchema from "./schema/create-channel.json";
import getAddressSchema from "./schema/get-address.json";
import joinChannelSchema from "./schema/join-channel.json";
import updateChannelSchema from "./schema/update-channel.json";
import definitionsSchema from "./schema/definitions.json";
import pushMessageSchema from "./schema/push-message.json";
import notifSchema from "./schema/notification.json";

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

import Ajv, {ErrorObject} from "ajv";
import requestSchema from "@statechannels/client-api-schema/schema/request.json";
import responseSchema from "@statechannels/client-api-schema/schema/response.json";
import createChannelSchema from "@statechannels/client-api-schema/schema/create-channel.json";
import getAddressSchema from "@statechannels/client-api-schema/schema/get-address.json";
import joinChannelSchema from "@statechannels/client-api-schema/schema/join-channel.json";
import updateChannelSchema from "@statechannels/client-api-schema/schema/update-channel.json";
import definitionsSchema from "@statechannels/client-api-schema/schema/definitions.json";
import channelResultSchema from "@statechannels/client-api-schema/schema/channel-result.json";
import closeChannelSchema from "@statechannels/client-api-schema/schema/close-channel.json";
import pushMessageSchema from "@statechannels/client-api-schema/schema/push-message.json";
import notifSchema from "@statechannels/client-api-schema/schema/notification.json";

export interface ValidationResult {
  isValid: boolean;
  errors: ErrorObject[];
}

export async function validateRequest(jsonRpcRequest: object): Promise<ValidationResult> {
  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(channelResultSchema)
    .addSchema(createChannelSchema)
    .addSchema(getAddressSchema)
    .addSchema(joinChannelSchema)
    .addSchema(updateChannelSchema)
    .addSchema(pushMessageSchema)
    .addSchema(closeChannelSchema)
    .compile(requestSchema);
  const isValid = await validate(jsonRpcRequest);

  return {isValid, errors: validate.errors ? validate.errors : []};
}

export async function validateResponse(jsonRpcResponse: object): Promise<ValidationResult> {
  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(channelResultSchema)
    .addSchema(createChannelSchema)
    .addSchema(getAddressSchema)
    .addSchema(joinChannelSchema)
    .addSchema(updateChannelSchema)
    .addSchema(pushMessageSchema)
    .addSchema(closeChannelSchema)
    .compile(responseSchema);
  const isValid = await validate(jsonRpcResponse);

  return {isValid, errors: validate.errors ? validate.errors : []};
}

export async function validateNotification(jsonRpcNotification: object): Promise<ValidationResult> {
  const ajv = new Ajv();
  const validate = ajv
    .addSchema(definitionsSchema)
    .addSchema(channelResultSchema)
    .addSchema(createChannelSchema)
    .addSchema(getAddressSchema)
    .addSchema(joinChannelSchema)
    .addSchema(updateChannelSchema)
    .addSchema(pushMessageSchema)
    .addSchema(requestSchema)
    .addSchema(responseSchema)
    .addSchema(closeChannelSchema)
    .compile(notifSchema);
  const isValid = await validate(jsonRpcNotification);

  return {isValid, errors: validate.errors ? validate.errors : []};
}

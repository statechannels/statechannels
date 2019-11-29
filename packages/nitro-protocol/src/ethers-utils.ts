// The last value in a result from an ethers event emission (i.e., Contract.on(<filter>, <result>))
// is an object with keys as the names of the fields emitted by the event.
export function parseEventResult(result: any[]): {[fieldName: string]: any} {
  return result.slice(-1)[0].args;
}

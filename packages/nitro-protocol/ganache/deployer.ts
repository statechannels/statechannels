import {GanacheServer} from '@statechannels/devtools';

export async function deploy(chain: GanacheServer): Promise<object> {
  console.log(
    `Deploying built contracts to chain with ID ${(await chain.provider.getNetwork()).chainId}`
  );
  return {};
}

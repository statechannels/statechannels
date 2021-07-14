import util from 'util';
import * as fs from 'fs';

import chalk from 'chalk';
import jsonfile from 'jsonfile';

import {ARTIFACTS_DIR} from '../../jest/chain-setup';

import {RoleConfig, Peers} from './types';

export function setupUnhandledErrorListeners(): void {
  process.on('unhandledRejection', err => {
    console.error(chalk.redBright(`Unhandled PROMISE REJECTION ${util.inspect(err)}`));
    console.error(chalk.redBright('Bailing!'));
    process.exit(1);
  });

  process.on('uncaughtException', err => {
    console.error(chalk.redBright(`Unhandled EXCEPTION ${util.inspect(err)}`));
    console.error(chalk.redBright('Bailing!'));
    process.exit(1);
  });
}

export async function getRoleInfo(
  roleFile: string,
  roleId: string
): Promise<{
  roleConfig: RoleConfig;
  peers: Peers;
}> {
  const roles = (await jsonfile.readFile(roleFile)) as Record<string, RoleConfig>;

  const roleConfig = roles[roleId];

  if (!roleConfig) {
    throw new Error('Invalid role or role config');
  }

  const peers = Object.keys(roles)
    .filter(id => id !== roleId)
    .map(id => ({
      serverId: id,
      loadServerPort: roles[id].loadServerPort,
      messagePort: roles[id].messagePort,
    }));
  return {roleConfig, peers};
}

export function createArtifactDirectory(): void {
  try {
    fs.mkdirSync(ARTIFACTS_DIR);
  } catch (err) {
    if (!(err.message as string).includes('EEXIST')) throw err;
  }
}

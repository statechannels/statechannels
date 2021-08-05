import util from 'util';
import * as fs from 'fs';

import chalk from 'chalk';
import jsonfile from 'jsonfile';

import {ARTIFACTS_DIR} from '../jest/chain-setup';

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

export async function getRoles(roleFile: string): Promise<Record<string, RoleConfig>> {
  return (await jsonfile.readFile(roleFile)) as Record<string, RoleConfig>;
}

export async function getRoleInfo(
  roleFile: string,
  roleId: string
): Promise<{
  roleConfig: RoleConfig;
  peers: Peers;
}> {
  const roles = await getRoles(roleFile);
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

export async function createArtifactDirectory(): Promise<void> {
  return createDirectory(ARTIFACTS_DIR);
}

export async function createTempDirectory(): Promise<void> {
  return createDirectory('./temp');
}

async function createDirectory(path: string): Promise<void> {
  try {
    await fs.promises.mkdir(path);
  } catch (err) {
    if (!(err.message as string).includes('EEXIST')) throw err;
  }
}

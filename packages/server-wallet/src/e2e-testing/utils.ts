import chalk from 'chalk';

export function setupUnhandledErrorListeners(): void {
  process.on('unhandledRejection', err => {
    console.error(chalk.redBright(`Unhandled PROMISE REJECTION ${err}`));
    console.error(chalk.redBright('Bailing!'));
    process.exit(1);
  });

  process.on('uncaughtException', err => {
    console.error(chalk.redBright(`Unhandled EXCEPTION ${err}`));
    console.error(chalk.redBright('Bailing!'));
    process.exit(1);
  });
}

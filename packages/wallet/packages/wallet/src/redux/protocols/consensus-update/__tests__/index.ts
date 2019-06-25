import {
  twoPlayerAHappyPath,
  twoPlayerBHappyPath,
  threePlayerAHappyPath,
  threePlayerBHappyPath,
  threePlayerHubHappyPath,
} from './scenarios';

export const twoPlayerPreSuccessA = twoPlayerAHappyPath.waitForUpdate;
export const twoPlayerPreSuccessB = twoPlayerBHappyPath.waitForUpdate;

export const threePlayerPreSuccessA = threePlayerAHappyPath.waitForHubUpdate;
export const threePlayerPreSuccessB = threePlayerBHappyPath.waitForHubUpdate;
export const threePlayerPreSuccessHub = threePlayerHubHappyPath.waitForPlayerBUpdate;

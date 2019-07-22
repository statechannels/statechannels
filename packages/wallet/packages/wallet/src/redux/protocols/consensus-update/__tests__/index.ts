import {
  twoPlayerAHappyPath,
  twoPlayerBHappyPath,
  threePlayerAHappyPath,
  threePlayerBHappyPath,
  threePlayerHubHappyPath,
} from './scenarios';

export const twoPlayerPreSuccessA = twoPlayerAHappyPath.waitForUpdate;
export const twoPlayerPreSuccessB = twoPlayerBHappyPath.waitForUpdate;
export const twoPlayerReplyA = twoPlayerAHappyPath.initialize.reply;
export const twoPlayerReplyB = twoPlayerBHappyPath.waitForUpdate.reply;

export const threePlayerPreSuccessA = threePlayerAHappyPath.waitForHubUpdate;
export const threePlayerPreSuccessB = threePlayerBHappyPath.waitForHubUpdate;
export const threePlayerPreSuccessHub = threePlayerHubHappyPath.waitForPlayerBUpdate;

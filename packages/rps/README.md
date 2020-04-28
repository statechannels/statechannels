<h1 align="center">
Rock Paper Scissors
</h1>

[![Netlify Status](https://api.netlify.com/api/v1/badges/3d541d58-edf8-4760-b513-4f9a11b991de/deploy-status)](https://app.netlify.com/sites/rps-statechannels/deploys)

This app is an example of a game built on our [ForceMove](https://magmo.com/force-move-games.pdf) protocol. You can [play](https://rps.statechannels.org) against a friend or against our bots on the ropsten testnet.

![splash](./screens.png 'screens')

## Running locally

The best way to experience the app locally is to run against an auto-opponent. The following assumes
that you have already cloned the monorepo, and run `yarn install` from the root folder of the monorepo.

1. Start ganache from the root folder of the monorepo:
   ```
   // in monorepo/
   yarn start:shared-ganache
   ```
2. In the rps folder, start the app with the auto-opponent:
   ```
   // in monorepo/packages/rps
   AUTO_OPPONENT=B yarn start
   ```
3. In your browser, you will need to set up your ethereum wallet to connect to the
   ganache network that you started in step 1. The default for ganache is currently localhost:8545.

### About the auto-player and auto-opponent

The app comes bundled with an auto-player and auto-opponent.

The **auto-player** will automatically take the actions that a user would: joining or starting
a game (depending on whether they are player A or B), playing a move, and deciding to play
again (after the first round) or not to play again (after the second round).

The auto-player is useful if you want to play in one browser tab, against the app running
in a different browser tab. To do this you would:

```
// in monorepo/packages/rps
PORT=3000 yarn start

// in a new terminal window
PORT=3001 AUTO_PLAYER=B yarn start
```

You then need to navigate to localhost:3000 and localhost:3001, and **navigate past the first
screen in both tabs** by providing a name. Once past the first screen the auto-opponent will
take over and create a game etc.

The **auto-opponent** bundles a second version of the app, running the auto-player, into
your app, so you can play a game without having to setup two servers or open two windows.
The setup is simpler, but you don't get to see the other screen.

To run the auto-opponent, you can run

```
AUTO_OPPONENT=B yarn start
```

Auto-opponent B will start a game that you can join once. You can also try
auto-opponent A, which will join a game that you create.

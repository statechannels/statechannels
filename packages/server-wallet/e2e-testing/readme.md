
# Quick Start

```shell
npx ts-node ./e2e-testing/scripts/load-generator.ts -o ./temp/sample_load.json -f Direct
npx ts-node ./e2e-testing/scripts/start-all.ts -l ./temp/sample_load.json
```

This generates a [load file](#load-file) that uses Direct funding.

The `start-all` script then starts up [ganache](#start-ganache) and two [server wallets](#load-node).

It then sends the generated [load file](#load-file) that tells the wallets how many channels to create and close (and when to try and create them).

It then tells the nodes to start processing those instructions and waits for it to complete  succesfully.

You should see something like this indicating that it ran succesfully.

```shell
[A] Updated job queue with 60 steps
[B] Updated job queue with 60 steps
[A] Starting job processing..
[A] This node will create 29 channel(s) using Direct funding
[B] Starting job processing..
[B] This node will create 31 channel(s) using Direct funding
[A] All jobs complete!
[B] All jobs complete!
SUCCESS!
```

# Concepts

## Load Node

There is a new class `WalletLoadNode` which is an http server that has its own wallet. The load node accepts a [load file](#load-file) and runs the steps specified by the load file.

A `LoadNode` co-operates with it's peers by

- letting peers know when a channel id has been created for a job file
- sending the load file to peers
- letting peers know when to start processing

This means you only have to interact with one LoadNode to load and run the load file.

If any error is returned from the `serverWallet` we stop the `LoadNode` process.

The `/load` endpoint can be used to load a load file. It accepts a POST request with a JSON body of `Step`s.

The `/start` endpoint is used to trigger processing of the steps in this and other nodes. It accepts a GET request. A response won't be returned until all jobs are completed and all our peer's jobs are completed as well. If an error occurs this returns a 500 error code with details on the error.

### How Load is processed

Each step in the [load file](#load-file) contains a timestamp value. We set a timeout with the timestamp value
for each step. When the timer executes we attempt to create or close the channel as instructed.

Steps don't wait for the completion of previous steps before starting.

## Load file

The load file is a list of instructions for a server wallet to perform. It looks something like this:

```JSON
[ {
  "type": "CreateChannel",
  "jobId": "mushy-spicy-loose-uganda",
  "serverId": "B",
  "timestamp": 7641,
  "channelParams":"SNIPPED"
 },
  "type": "UpdateChannel",
  "serverId": "A",
  "jobId": "mushy-spicy-loose-uganda",
  "timestamp": 90933,
 "channelParams":"SNIPPED"
},
 {
  "type": "CloseChannel",
  "jobId": "mushy-spicy-loose-uganda",
  "serverId": "B",
  "timestamp": 142996
 },
]
```

The job id is used to represent a channel since we won't get a channel Id until the channel is actually created. The jobId is used by `LoadNode`s to know which channel instructions apply to.

The `timestamp` is when these instructions should be executed. The `timestamp` is an offset from when processing starts. So `timestamp= 7641` is 7641 after the start of processing.

The `serverId` indicates which LoadNode is responsible for that step. Each LoadNode will have a unique `serverId` based on the entries in the `role.config`

## Role Config

[A simple JSON config](./test-data/roles.json) file specifies various ports and private keys to be used for a LoadNode. This is used to easily start up LoadNodes without having to specify a bunch of different options.

# Scripts

All scripts are typescript files that can be run with `ts-node`.

## Sanity Checker

The sanity checker is a simple script that checks databases and ganache to make sure we created the right amount of channels and sent the right amount of funds.

The main argument it accepts is the load file to use. The sanity checker uses this to figure out how many channels we expect to see in the database (and in what status).

The sanity checker also checks the balance file outputed by `start-ganache`. It checks the destinations and contracts to ensure that the funds went where we expected them.

## Start Ganache

This is similar to what we have in devtools but I wanted to avoid messing with env vars. It is responsible for starting ganache and deploying the contracts.

When the script stops running it saves the balances to a file, so we can easily check the final state of the chain.

## Start Load Node

This starts up a load node server. The only required argument is the `roleId` (based on the roleConfig). Using the default role config the valid options are "A" or "B.

## Load Generator

The load generator is responsible for generating load files.  The load generator accepts arguments for

- how often channels should be created/closed
- how long channels should be created/closed
- whether channels are funded using ledger channels or direct funding

### Scheduling  

The load generator uses a pretty basic scheduling algorithim.

Generally for each step type we add `duration * rate` steps to the load file with a timestamp randonly selected from `0` to `duration`.

The basic flow is:

1. (If applicable) `createLedgerDuration*ledgerRate` CreateLedgerChannel steps are added with a timestamp randomly chosen between `0` and `createLedgerDuration`

2. `duration*CreateRate` createChannel steps are added to the load file.

    If they ledger funded then we randomly select a CreateLedgerChannel `ledger` and generate a timestamp from `ledger.timestamp+ledgerDelay` to `duration`.

    If directly funded then the timestamp will be randomly selected from `0` to `duration`.

3. `duration*CloseRate` close channel steps are added to the load file. For each step we randomly select a CreateChannel step `app` and schedule a close step with a timestamp randomly selected from `app.timestamp+closeDelay` to `duration`.

### Limitations

Currently we used fixed `outcome` and `appData`s  when creating channels.

We also do not support update channel steps yet.

### Direct Funding Example

```shell
npx ts-node ./e2e-testing/scripts/load-generator.ts -o ./temp/example.json -f  0.82s user 0.07s system 123% cpu 0.725 total
❯ npx ts-node ./e2e-testing/scripts/load-generator.ts -o ./temp/example.json -f Direct --createRate 5 --duration 30 --closeRate 0
[@statechannels/devtools] NODE_ENV is undefined — setting to "development"
Generating a test load file to  ./temp/example.json
Using the following options {
  outputFile: './temp/example.json',
  roleFile: './e2e-testing/test-data/roles.json',
  duration: 30,
  createRate: 5,
  closeRate: 0,
  closeDelay: 5,
  fundingStrategy: 'Direct'
}
150 channels will be created.
None of those channels will be closed.
Complete!
```

Here we are asking for a load file that will create 5 channels a second for 30 seconds. No channels will be closed.
All channels will be directly funded.

### Ledger Funding Example

```shell
❯ npx ts-node ./e2e-testing/scripts/load-generator.ts -o ./temp/ledger-example.json -f Ledger --createRate 1  --duration 30 --closeRate 0 --createLedgerDuration 5 --ledgerDelay 15
[@statechannels/devtools] NODE_ENV is undefined — setting to "development"
Generating a test load file to  ./temp/ledger-example.json
Using the following options {
  outputFile: './temp/ledger-example.json',
  roleFile: './e2e-testing/test-data/roles.json',
  duration: 30,
  createRate: 1,
  closeRate: 0,
  closeDelay: 5,
  fundingStrategy: 'Ledger'
}
Ledger options { ledgerDelay: 15, ledgerRate: 1, createLedgerDuration: 5 }
30 channels will be created.
None of those channels will be closed.
Complete!
```

Here we are asking for a load file that will create 1 channel a second for 30 seconds. No channels will be closed.

Ledger channels will be created for the first 5 seconds at the rate of 1 ledger channel a second. Any steps that depend on a ledger channel for funding will wait 15 seconds before attempting to use it.

## Start All

Convenience utility that starts up ganache, two load nodes and runs a load file against them.

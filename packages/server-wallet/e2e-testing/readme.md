This folder containts some basic testing infrastructure to set us up for stress testing our server wallet. It introduces load node that is responsible for calling wallet methods. A load file specifies what calls to make to the wallet and in what order to make them.

### Load file

The load file is a list of instructions for a server wallet to perform. It looks something like this:

```
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

### LoadNode

There is a new class `WalletLoadNode` which is an http server that has its own wallet. The load node is responsible for loading a load file and then performing the instructions specified in the file.

A `LoadNode` co-operates with it's peers by

- letting peers know when a channel id has been created for a job file
- sending the load file to peers
- letting peers know when to start processing

This means you only have to interact with one LoadNode to load and run the load file.

### Role Config

[A simple JSON config](./test-data/roles.json) file specifies various ports and private keys to be used for a LoadNode. This is used to easily start up LoadNodes without having to specify a bunch of different options.

## New Scripts

All scripts are typescript files that can be run with `ts-node`.

### Start Ganache

This is similar to what we have in devtools but I wanted to avoid messing with env vars. It is responsible for starting ganache and deploying the contracts.

### Start Load Node

This starts up a load node server. The only required argument is the `roleId` (based on the roleConfig). Using the default role config the valid options are "A" or "B.

### Load Generator

Generates a load file that can be run against a set of nodes.

### Start All

Convenience utility that starts up ganache, two load nodes and runs a load file against them.

## How to use It?

You'll need to create and migrate a couple of test databases:

```shell
SERVER_DB_NAME=server_wallet_test_a yarn db:create && yarn db:migrate
SERVER_DB_NAME=server_wallet_test_b yarn db:create && yarn db:migrate
```

The easiest way to run the stress test is to use the `start-all` script. From the package root:

```shell
npx ts-node e2e-testing/scripts/start-all.ts
```

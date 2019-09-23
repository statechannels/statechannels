# devtools

Devtoolsd used in magmo projects

## Usage

From a node project, install as a dev dependency:

```
$ npm i -D https://github.com/magmo/devtools
```

or

```
$ yarn add -D https://github.com/magmo/devtools
```

This will install binaries in your project that can be run, eg. with `npx`.

```
// you must have installed npx globally via `npm i -g npx`
$ npx start-ganache
```

It also exports functions that can be executed, eg

```
$ node -e "require('@statechannels/devtools').startGanache()"
```

## Dependencies

You are responsible for installing the dependencies required for executing the binaries.
We will not force your scripts to use a specific version of truffle, for instance.

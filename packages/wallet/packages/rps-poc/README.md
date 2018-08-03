## Rock Paper Scissors: A Force-Move Games POC

**NOTE:** the app currently requires to be run against the [generate-types](https://github.com/magmo/force-move-games/tree/generate-types)
branch of fmg-core. To do this:

1. Download [force-move-games](https://github.com/magmo/force-move-games) repo and checkout the generate-types branch
2. Inside the `force-move-games` folder: `cd packages/fmg-core && npm run-script build && npm link`
3. Inside the `rps-poc` folder: `yarn link fmg-core`

### Setup

#### Install yarn
`brew install yarn`

### Developement Info

#### To run a dev server:

`yarn start`

#### To build:

`yarn run build`

#### To run tests:

`yarn run test`

#### To update dependencies:

`yarn install`

#### To add a dependency:

`yarn add [package-name]` - installs the latest version of the package

#### To update the version of a dependency:

`yarn upgrade [package-name@version-number]`

#### Project style

Please use the Sublime/VS Code package _JsPrettier_ for formatting. Add the following changes to the `prettier` settings:

```
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
```

### Current state:

![screenshot](https://user-images.githubusercontent.com/12832034/40526428-44e37118-5f9b-11e8-8e63-c5fbaf9cae59.png 'screenshot')


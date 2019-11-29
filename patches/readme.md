# Patches

This folder contains patches for node modules, managed by [patch-package](https://github.com/ds300/patch-package).

🚨 If you want to used a patched node module in one of the `packages`, you need to modify its `package.json` to ensure that patch package is run after a `yarn install`:

```jsonc
// package.json

{
  // snip
  "scripts": {
    // snip
    // add this
    "patch-package": "cd ../.. && yarn patch-package",

    // and make sure it's pre-pended to prepare
    "prepare": "yarn patch-package && yarn <whatever was here before>",
  },
```

If you don't do this, then the package will only be patched if `yarn install` is run from the monorepo root, which can lead to very confusing behaviour.

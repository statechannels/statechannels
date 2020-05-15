[![Netlify Status](https://api.netlify.com/api/v1/badges/fe975674-cea9-44ed-b9f4-685c03d9f17c/deploy-status)](https://app.netlify.com/sites/xstate-wallet/deploys)

## Configurable Environment Variables
| Variable                  | Possible Values        | Description                                                      |
|---------------------------|------------------------|------------------------------------------------------------------|
| LOG_DESTINATION           | "console", a file name | When running tests, use `console.log` or to a file               |
| USE_INDEXED_DB            | empty, or truthy value | If truthy, uses IndexedDB in the browser and in-memory otherwise |
| CLEAR_STORAGE_ON_START    | empty, or truthy value | If truthy, clears any data in the store before start             |
| NITRO_ADJUDICATOR_ADDRESS | address                | Address of NitroAdjudicator contract on-chain                    |
| ETH_ASSET_HOLDER_ADDRESS  | address                | Address of ETHAssetHolder contract on-chain                      |
| HUB_ADDRESS               | address                | Signing address of firebase:simple-hub participant               |
| HUB_DESTINATION           | empty or bytes32       | Destination of firebase:simple-hub participant                   |
| CHAIN_NETWORK_ID          | string or integer      | Chain identifier e.g., 3 for Ropsten
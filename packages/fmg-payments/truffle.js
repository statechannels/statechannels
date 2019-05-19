module.exports = {
  solc: {
    optimizer: {
      enabled: process.env.ENABLE_SOLC_OPTIMIZER === "TRUE",
      runs: 200
    }
  },
  compilers: {
    solc: {
      version: "0.5.2"
    }
  }
};

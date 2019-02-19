module.exports = {
  enableAwait: true,
  context: {
    Node: require('./src/').default({ salt: process.env.APP_KEY || "secret", cipher: "aes128" }),
  }
}

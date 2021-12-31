import { homedir } from "os";
import path from "path";
import repl from "repl";

function init(context) {
  Object.keys(require.cache).forEach(function (key) {
    delete require.cache[key];
  });
  context.idor = require("./src").default;
  context.Idor = context.idor({ salt: process.env.APP_KEY || "secret" })
}

const replServer = repl.start({ prompt: "idor> " });
init(replServer.context);

replServer.setupHistory(
  path.resolve(homedir(), ".node_repl_history"),
  () => null
);

replServer.on("reset", init);

replServer.on("exit", () => {
  process.exit();
});

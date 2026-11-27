// TEST ONLY. The "server-only" package throws when imported outside Next.js's server build.
// Tests run our server code directly in Node, so point it at an empty module instead.
const Module = require("node:module");
const path = require("node:path");

const empty = path.join(__dirname, "empty-module.cjs");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...rest) {
  if (request === "server-only") return empty;
  return originalResolve.call(this, request, ...rest);
};

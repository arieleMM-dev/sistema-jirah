const Module = require('node:module');
const path = require('node:path');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (specifier, ...args) {
  const resolved = specifier.startsWith('@/')
    ? path.join(__dirname, '..', specifier.slice(2))
    : specifier;
  return resolveFilename.call(this, resolved, ...args);
};

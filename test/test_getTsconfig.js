#!/usr/bin/env node
// ***************************************************************************
// Test the reading and parsing of tsconfig.json.

'use strict';

const TypeScriptCompiler = require('../index');

// Setup a config that looks for './tsconfig.json'.
const config = {
  paths: {root: __dirname},
  conventions: {vendor: ''},
};

// Create a compiler, which will read ad parse the tsconfig.json.
const compiler = new TypeScriptCompiler(config);

// Setup the expected stringified tsconfig.json.  Note that the compiler only
// keeps the 'compilerOptions' part.
const expected =
  '{' +
    '"foo":"Should // not be stripped",' +
    '"bar":"Should /* not be */ stripped",' +
    '"baz":true,' +
    '"fud":[1,2,3],' +
    // The compiler adds a bunch of options in addition to what was in
    // tsconfig.json.
    '"module":1,' +
    '"target":1,' +
    '"jsx":1,' +
    '"emitDecoratorMetadata":true,' +
    '"experimentalDecorators":true,' +
    '"noEmitOnError":false,' +
    '"sourceMap":false' +
  '}';

// Compare actual and expected; no need for a fancy test framework just for
// this.
const actual = JSON.stringify(compiler.options);
if (actual === expected) {
  console.log('PASS');
} else {
  console.error(`FAIL:\nActual:\n${actual}\nExpected:\n${expected}`);
  process.exitCode = 1;
}

// ***************************************************************************

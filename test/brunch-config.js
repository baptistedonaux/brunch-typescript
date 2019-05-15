// Our test app's brunch config, based on brunch init.
'use strict';

module.exports =
{
  // Disable OS notifications, since brunch will crash if you don't have the
  // correct OS notifier subsystem installed.
  notifications: false,

  files:
  {
    // Build any JavaScript and TypeScript files in the default app/ dir.
    javascripts: {joinTo: {'app.js': /\.[jt]s$/}},
    // Package any styles as well.
    stylesheets: {joinTo: 'app.css'}
  },

  plugins:
  {
    // Let's use TSLint to double-check that our TypeScript files don't have
    // any problems.
    tslint:
    {
      config:
      {
        extends: 'tslint:recommended',
        notafield: false,
        rules:
        {
          'max-classes-per-file': false,
          'no-empty': false,
          'one-line': false,
          'quotemark': false,
          'member-ordering': false,
          'no-console': false
        }
      }
    },

    // Configure the typescript-brunch plugin.  These are compiler options
    // that tsc would expect to find in a tsconfig.json file in the
    // "compilerOptons" section.
    //
    // These options should roughly match those in app/app-tsconfig.json if
    // you wish to run tsc to double-check compilation.
    brunchTypescript:
    {
      // Use the ES3 target if you want compilation to fail.  The test app
      // uses some features only found in later version of JavaScript.
      //target: 'ES3',
      target: 'ES2015',
      // Explicitly specify the libs to include to test the name-to-file
      // mapping.
      lib: ['ES2015', 'DOM'],
      strict: true,
      pretty: true,
      sourceMap: true,
      traceResolution: false
    }
  },

  overrides:
  {
    production:
    {
      plugins:
      {
        off:
        [
          // Some of the app's brunch plugins don't work with really old
          // versions of typescript, so we disable them here as necessary.
          //'tslint-brunch',
          'uglify-js-brunch'
        ]
      }
    }
  }
};

'use strict';

const path = require('path');
const ts = require('typescript');

const transpileModule = (input, transpileOptions) => {
  const options = ts.clone(transpileOptions.compilerOptions);

  // transpileModule does not write anything to disk so there is no need to
  // verify that there are no conflicts between input and output paths.
  options.suppressOutputPathCheck = true;
  // Filename can be non-ts file.
  options.allowNonTsExtensions = true;
  // We do want to emit here, so specifically enable it.
  options.noEmit = false;
  // if jsx is specified then treat file as .tsx
  const inputFileName = transpileOptions.fileName ||
    (options.jsx ? 'module.tsx' : 'module.ts');

  // If options.lib is specified, then we must translate the provided lib
  // names into the actual filenames that TS expects to find.
  //
  // See https://github.com/Microsoft/TypeScript/issues/29258
  //
  if (options.lib)
  {
    if (! Array.isArray(options.lib))
    {
      options.lib = [options.lib];
    }

    options.lib = options.lib.map(
      (libName) =>
      {
        // TS lib filenames are in the format 'lib.<name>.d.ts', in
        // lower-case.
        return 'lib.' + libName.toLowerCase() + '.d.ts';
      });
  }

  const sourceFile = ts.createSourceFile(inputFileName, input, options.target);
  const normalizedFileName = ts.normalizeSlashes(inputFileName);
  const parsedFileName = path.parse(normalizedFileName);
  const baseFileName = parsedFileName.dir + path.sep + parsedFileName.name;
  
  if (transpileOptions.moduleName) {
    sourceFile.moduleName = transpileOptions.moduleName;
  }

  sourceFile.renamedDependencies = transpileOptions.renamedDependencies;

  // Output
  let outputText;
  let sourceMapText;

  // Create a default compiler host object.
  const compilerHost = ts.createCompilerHost(options);

  // Setup our own getSourceFile() function.
  const origGetSourceFile = compilerHost.getSourceFile;
  compilerHost.getSourceFile = (fileName, languageVersion, onError) => {
    // If the compiler is asking for the file we're compiling, return the
    // sourceFile we prepared above.
    if (fileName === normalizedFileName) {
      return sourceFile;
    }
    // Otherwise, handoff to the default getSourceFile function.
    return origGetSourceFile(fileName, languageVersion, onError);
  };

  // Setup our own writeFile() function to capture the compiled ouput and
  // source map.
  compilerHost.writeFile = (name, text /* writeByteOrderMark */) => {

    // If noResolve is false, then TS will emit compiled text for each module
    // imported by the file being compiled.  We ignore these in this case.
    if (! options.noResolve)
    {
      // TS changes the filename extension to .js, so we only look at the path
      // and base name.
      const parsedName = path.parse(name);
      // Source maps will have '.js.map' extensions, so account for that as
      // well by parsing the name portion twice.
      const baseName =
        parsedName.dir + path.sep + path.parse(parsedName.name).name;

      if (baseName !== baseFileName)
      {
        // Ignore the compiled output of an imported module.
        return;
      }
    }

    if (ts.fileExtensionIs(name, '.map')) {
      ts.Debug.assert(sourceMapText === undefined, `Unexpected multiple source map outputs for the file '${name}'`);
      sourceMapText = text;
    } else {
      ts.Debug.assert(outputText === undefined, `Unexpected multiple outputs for the file: '${name}'`);
      outputText = text;
    }
  };

  const program = ts.createProgram([inputFileName], options, compilerHost);

  let diagnostics;
  if (transpileOptions.reportDiagnostics) {
    diagnostics = [];
    ts.addRange(/* to */ diagnostics, /* from */ program.getSyntacticDiagnostics(sourceFile));
    ts.addRange(/* to */ diagnostics, /* from */ program.getSemanticDiagnostics(sourceFile));
    ts.addRange(/* to */ diagnostics, /* from */ program.getOptionsDiagnostics());
  }

  // Emit
  program.emit();
  ts.Debug.assert(outputText !== undefined, 'Output generation failed');

  return {outputText, diagnostics, sourceMapText};
};

module.exports = transpileModule;

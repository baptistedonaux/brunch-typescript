'use strict';
const transpileModule = require('./transpile');
const ts = require('typescript');
const anymatch = require('anymatch');
const path = require('path');

const resolveEnum = (choice, opts) => {
  const defaultValue = 1; // CommonJS/ES5/Preserve JSX defaults

  if (!choice) return defaultValue;
  if (!isNaN(choice)) return choice - 0;

  for (const opt of Object.keys(opts)) {
    if (choice && choice.toUpperCase() === opt.toUpperCase()) {
      return opts[opt];
    }
  }

  return defaultValue;
};

const getTSconfig = config => {
  const TSconfig = path.resolve(config.paths.root, 'tsconfig.json');

  try {
    return require(TSconfig).compilerOptions;
  } catch (e) {
    return {};
  }
};

const findLessOrEqual = (haystack, needle) => {
  let i = 0;
  while (i + 1 < haystack.length && needle >= haystack[i + 1]) {
    i += 1;
  }
  return i === haystack.length ? -1 : i;
};

const errPos = err => {
  if (err.file) {
    const {lineMap} = err.file;
    if (lineMap) {
      const lineIndex = findLessOrEqual(lineMap, err.start);

      return `Line: ${lineIndex + 1}, Col: ${err.start - err.file.lineMap[lineIndex] + 1}`;
    }
  }
  return 'No line map';
};

const toMeaningfulMessage = err => `Error ${err.code}: ${err.messageText} (${errPos(err)})`;

class TypeScriptCompiler {
  constructor(config) {
    const options = config.plugins.typescript ||
      config.plugins.brunchTypescript ||
      {};

    this.options = getTSconfig(config);

    Object.keys(options).forEach(key => {
      if (key === 'sourceMap' || key === 'ignore') return;
      this.options[key] = options[key];
    });

    this.targetExtension = this.options.jsx === 'preserve' ? 'jsx' : 'js';
    this.options.module = resolveEnum(this.options.module, ts.ModuleKind);
    this.options.target = resolveEnum(this.options.target, ts.ScriptTarget);
    this.options.jsx = resolveEnum(this.options.jsx, ts.JsxEmit);
    this.options.emitDecoratorMetadata = this.options.emitDecoratorMetadata !== false;
    this.options.experimentalDecorators = this.options.experimentalDecorators !== false;
    this.options.noEmitOnError = false; // This can"t be true when compiling this way.

    delete this.options.moduleResolution;

    this.options.sourceMap = !!config.sourceMaps;
    this.isIgnored = anymatch(options.ignore || config.conventions.vendor);
    if (this.options.pattern) {
      this.pattern = this.options.pattern;
      delete this.options.pattern;
    }

    if (this.options.ignoreErrors) {
      if (this.options.ignoreErrors === true) {
        this.ignoreAllErrors = true;
      } else {
        this.ignoreErrors = new Set(this.options.ignoreErrors);
      }
      delete this.options.ignoreErrors;
    }
  }

  compile(file) {
    if (this.isIgnored(file.path)) return file;

    const compiled = transpileModule(file.data, {
      fileName: file.path,
      reportDiagnostics: true,
      compilerOptions: this.options,
    });

    let diag = compiled.diagnostics;
    if (this.ignoreAllErrors) {
      diag = [];
    } else if (this.ignoreErrors) {
      diag = diag.filter(err => !this.ignoreErrors.has(err.code));
    }

    if (diag.length) {
      throw diag.map(toMeaningfulMessage).join('\n');
    }

    const result = {data: `${compiled.outputText || compiled}\n`};

    if (compiled.sourceMapText) {
      // Fix the sources path so Brunch can merge them.
      const rawMap = JSON.parse(compiled.sourceMapText);
      rawMap.sources[0] = file.path;
      result.map = JSON.stringify(rawMap);
    }

    return result;
  }
}

TypeScriptCompiler.prototype.brunchPlugin = true;
TypeScriptCompiler.prototype.type = 'javascript';
TypeScriptCompiler.prototype.pattern = /\.tsx?$/;

module.exports = TypeScriptCompiler;

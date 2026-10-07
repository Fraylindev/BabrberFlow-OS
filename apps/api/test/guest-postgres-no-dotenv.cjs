// Preload vigente del clúster invitado aislado: nunca lee .env del workspace.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const dotenv = (file) =>
  /^\.env(?:$|\.)/.test(
    path.basename(file instanceof URL ? fileURLToPath(file) : String(file)),
  );
const exists = fs.existsSync;
fs.existsSync = function (file) {
  return dotenv(file) ? false : exists.apply(this, arguments);
};
for (const method of ['readFileSync', 'openSync']) {
  const original = fs[method];
  fs[method] = function (file) {
    if (dotenv(file))
      throw Object.assign(
        new Error('Dotenv forbidden in isolated guest integration'),
        { code: 'ENOENT' },
      );
    return original.apply(this, arguments);
  };
}
for (const method of ['readFile', 'open']) {
  const original = fs[method];
  fs[method] = function (file, ...args) {
    if (!dotenv(file)) return original.call(this, file, ...args);
    const error = Object.assign(
      new Error('Dotenv forbidden in isolated guest integration'),
      { code: 'ENOENT' },
    );
    const callback = args.at(-1);
    if (typeof callback !== 'function') throw error;
    process.nextTick(callback, error);
  };
  const promise = fs.promises[method];
  fs.promises[method] = function (file, ...args) {
    if (dotenv(file))
      return Promise.reject(
        Object.assign(
          new Error('Dotenv forbidden in isolated guest integration'),
          { code: 'ENOENT' },
        ),
      );
    return promise.call(this, file, ...args);
  };
}

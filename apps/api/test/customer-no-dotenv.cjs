// Preload exclusivo del ensayo P1. Impide lecturas implícitas de dotenv.
// Prisma generado puede apuntar al .env original aunque el cwd sea una copia.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const stats = { blockedProbes: 0, blockedReads: 0 };
function isDotenv(value) {
  const file = value instanceof URL ? fileURLToPath(value) : String(value);
  return /^\.env(?:$|\.)/.test(path.basename(file));
}
const exists = fs.existsSync;
fs.existsSync = function (file) {
  if (isDotenv(file)) {
    stats.blockedProbes++;
    return false;
  }
  return exists.apply(this, arguments);
};
for (const method of ['readFileSync', 'openSync']) {
  const original = fs[method];
  fs[method] = function (file) {
    if (isDotenv(file)) {
      stats.blockedReads++;
      throw Object.assign(new Error('Dotenv ausente en el ensayo P1'), {
        code: 'ENOENT',
      });
    }
    return original.apply(this, arguments);
  };
}
for (const method of ['readFile', 'open']) {
  const original = fs[method];
  fs[method] = function (file, ...args) {
    if (isDotenv(file)) {
      stats.blockedReads++;
      const error = Object.assign(new Error('Dotenv ausente en el ensayo P1'), {
        code: 'ENOENT',
      });
      const callback = args.at(-1);
      if (typeof callback !== 'function') throw error;
      process.nextTick(callback, error);
      return;
    }
    return original.call(this, file, ...args);
  };
  const promiseOriginal = fs.promises[method];
  fs.promises[method] = function (file, ...args) {
    if (isDotenv(file)) {
      stats.blockedReads++;
      return Promise.reject(
        Object.assign(new Error('Dotenv ausente en el ensayo P1'), {
          code: 'ENOENT',
        }),
      );
    }
    return promiseOriginal.call(this, file, ...args);
  };
}
// Las rutas del censo son creadas por el harness; nunca registrar el archivo bloqueado.
process.on('exit', () => {
  if (process.env.P1_NO_DOTENV_REPORT_DIR) {
    fs.writeFileSync(
      path.join(process.env.P1_NO_DOTENV_REPORT_DIR, `${process.pid}.json`),
      JSON.stringify(stats),
    );
  }
});
module.exports = stats;

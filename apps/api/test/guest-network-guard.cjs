// Solo conexiones loopback en hijos del arnés; no afecta al producto.
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const options = typeof normalized[0] === 'object' ? normalized[0] : null;
  const host =
    options?.host ||
    (typeof normalized[1] === 'string' ? normalized[1] : 'localhost');
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('El arnés prohíbe conexiones externas');
  }
  return connect.apply(this, args);
};
const fetch = global.fetch;
if (fetch)
  global.fetch = function (input, ...args) {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url,
    );
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      return Promise.reject(new Error('El arnés prohíbe fetch externo'));
    }
    return fetch.call(this, input, ...args);
  };

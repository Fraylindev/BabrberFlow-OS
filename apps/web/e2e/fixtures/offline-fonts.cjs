// Soporte de mocks de Next: fuente local para la ejecución sin Google.
module.exports = new Proxy(
  {},
  {
    get: (_target, url) => {
      const family = String(url).includes('Fraunces')
        ? 'Fraunces'
        : String(url).includes('IBM')
          ? 'IBM Plex Mono'
          : 'Inter';
      return `@font-face { font-family: '${family}'; font-style: normal; font-weight: 100 900; src: local('Arial'); }`;
    },
  },
);

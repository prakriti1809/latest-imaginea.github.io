module.exports = function(bs) {
  return {
    "port": 8000,
    "files": ["./src/**/*.{html,htm,css,js}"],
    server: {
      middleware: {
        1: require('connect-history-api-fallback')({
          index: '/index.html',
          verbose: true
        })
      }
    }
  };
};
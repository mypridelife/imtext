'use strict'

module.exports = {
  devServer: {
    host: '0.0.0.0',
    port: 8080,
    open: true,
    overlay: {
      warnings: false,
      errors: true,
    },
    proxy: {
      '/flipped': {
        target: 'http://10.10.10.14:8902',
        chagneOrigin: true,
        ws: true,
      },
    },
  },
  css: {
    loaderOptions: {
      postcss: {
        plugins: [require('tailwindcss'), require('autoprefixer')],
      },
    },
  },
}

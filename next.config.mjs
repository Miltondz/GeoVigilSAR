import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose Cesium base URL to client bundles (no Ion key required)
  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL: '/cesium',
  },

  // Prevent the server-side bundler from trying to load cesium (client-only)
  experimental: {
    serverComponentsExternalPackages: ['cesium', '@cesium/engine', '@cesium/widgets'],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.mapillary.com' },
      { protocol: 'https', hostname: 'earthquake.usgs.gov' },
    ],
  },

  webpack: (config, { isServer, webpack }) => {
    // Strip `node:` URI prefix — webpack 5 does not handle it natively.
    // Affects: openai SDK and other deps that use `import 'node:module'`.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '')
      })
    )

    // satellite.js v5 WASM build imports worker_threads + uses pthreads — unusable in browser.
    // Alias the WASM entry to false (empty module); pure-JS propagation functions still work.
    config.resolve.alias = {
      ...config.resolve.alias,
      // Stub the entire WASM sub-tree so webpack never tries to load worker_threads
      'satellite.js/dist/wasm': false,
    }

    if (!isServer) {
      // Browser resolve fallbacks — Cesium's ESM tree-shakes these, but webpack
      // may attempt to resolve them when analyzing dynamic imports.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        https:          false,
        http:           false,
        zlib:           false,
        url:            false,
        fs:             false,
        path:           false,
        os:             false,
        module:         false,
        worker_threads: false,
        perf_hooks:     false,
        child_process:  false,
      }
    }
    return config
  },
}

export default withNextIntl(nextConfig)

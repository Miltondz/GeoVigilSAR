import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose Cesium base URL to client bundles (no Ion key required)
  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL: '/cesium',
  },

  // Prevent the server-side bundler from trying to load cesium (client-only)
  // Note: renamed to serverExternalPackages in Next.js 15; using v14 name here.
  serverComponentsExternalPackages: ['cesium', '@cesium/engine', '@cesium/widgets'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.mapillary.com' },
      { protocol: 'https', hostname: 'earthquake.usgs.gov' },
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Browser resolve fallbacks — Cesium's ESM tree-shakes these, but webpack
      // may attempt to resolve them when analyzing dynamic imports.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        https: false,
        http: false,
        zlib: false,
        url: false,
        fs: false,
        path: false,
        os: false,
      }
    }
    return config
  },
}

export default withNextIntl(nextConfig)

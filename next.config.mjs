import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.mapillary.com' },
      { protocol: 'https', hostname: 'earthquake.usgs.gov' },
    ],
  },
}

export default withNextIntl(nextConfig)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'tile.mapillarygraph.com' },
      { protocol: 'https', hostname: '*.mapillary.com' },
      { protocol: 'https', hostname: 'earthquake.usgs.gov' },
    ],
  },
}

export default nextConfig

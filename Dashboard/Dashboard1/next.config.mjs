/** @type {import('next').NextConfig} */
const isLanding = process.env.LANDING === 'true'

const nextConfig = {
  output: isLanding ? 'export' : 'standalone',
  basePath: isLanding ? '/ProjectS-HomeForge' : '',
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  ...(isLanding ? {} : {
    serverExternalPackages: ['better-sqlite3-multiple-ciphers', 'argon2'],
  }),
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  // Prevent Next.js from bundling native modules — they must be loaded by Node.js at runtime
  serverExternalPackages: ['better-sqlite3-multiple-ciphers', 'argon2'],
}

export default nextConfig

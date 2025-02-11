/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
      // Add any other image domains you might use
    ],
  },
  // Disable powered by header
  poweredByHeader: false,
  // Enable strict mode for better development
  reactStrictMode: true,
}

module.exports = nextConfig 
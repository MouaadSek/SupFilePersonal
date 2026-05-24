/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  async rewrites() {
    // INTERNAL_API_URL is the server-side proxy target (Docker: http://server:3000).
    // It is baked into the routes manifest at build time via the Dockerfile ARG/ENV.
    // NEXT_PUBLIC_API_URL is kept as the fallback for local `next dev` runs.
    const apiTarget =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
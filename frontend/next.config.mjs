/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three", "recharts"],
  webpack: (config) => {
    config.externals = [...(config.externals || [])];
    return config;
  },
};

export default nextConfig;

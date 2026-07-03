/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "@xenova/transformers"],
  },
};

export default nextConfig;

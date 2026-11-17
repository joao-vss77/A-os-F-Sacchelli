/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@portaria/core"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};
export default nextConfig;

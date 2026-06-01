/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow larger payloads for base64 food photos posted to server actions / routes
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

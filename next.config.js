/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.ssactivewear.com",
      },
    ],
  },
};

module.exports = nextConfig;

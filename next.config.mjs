/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse relies on Node's fs/Buffer APIs and must stay on the Node.js
  // runtime rather than being bundled for the Edge runtime.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;

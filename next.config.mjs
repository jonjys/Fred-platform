/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse relies on Node's fs/Buffer APIs and must stay on the Node.js
  // runtime rather than being bundled for the Edge runtime. Lost during a
  // CSP add/revert pass — restoring it: without this, PDF upload parsing
  // in the analyze form breaks on Vercel.
  serverExternalPackages: ["pdf-parse"],
};
export default nextConfig;

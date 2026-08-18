/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
  async rewrites() {
    return [
      { source: "/api/invoices", destination: "/api/invoice-proxy/invoices" },
      { source: "/api/invoices/:path*", destination: "/api/invoice-proxy/invoices/:path*" },
      { source: "/api/auth/:path*", destination: "/api/invoice-proxy/auth/:path*" },
    ];
  },
};
export default nextConfig;

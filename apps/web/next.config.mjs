/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a minimal server bundle plus only the node_modules actually reached,
  // which is what keeps the runtime image small enough to be worth pulling on
  // every Fargate task start.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // The dev overlay badge otherwise ends up baked into the product
  // screenshots used on the marketing page.
  devIndicators: false,
};

export default nextConfig;

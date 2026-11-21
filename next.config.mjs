/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingIncludes: { "/**": ["./data/**"] },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverRuntimeConfig: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
};

export default nextConfig;

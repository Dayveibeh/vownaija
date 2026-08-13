import type { NextConfig } from "next";

const isVercelBuild = process.env.VOWNAIJA_VERCEL_BUILD === "1";

const nextConfig: NextConfig = {
  transpilePackages: ["@vownaija/shared"],
  typescript: {
    tsconfigPath: isVercelBuild ? "./tsconfig.vercel.json" : "./tsconfig.json",
  },
};

export default nextConfig;

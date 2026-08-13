import type { NextConfig } from "next";

const isVercelBuild = process.env.SMITTEN_VERCEL_BUILD === "1";

const nextConfig: NextConfig = {
  transpilePackages: ["@smitten/shared"],
  typescript: {
    tsconfigPath: isVercelBuild ? "./tsconfig.vercel.json" : "./tsconfig.json",
  },
};

export default nextConfig;

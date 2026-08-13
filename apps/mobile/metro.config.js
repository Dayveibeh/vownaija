/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedPackageRoot = path.resolve(projectRoot, "../../packages/shared");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedPackageRoot];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@smitten/shared": sharedPackageRoot,
};

module.exports = config;

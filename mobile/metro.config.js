const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore hidden/temp dot-folders inside node_modules created by npm
config.resolver.blockList = [
  /node_modules[/\\]\..*/,
];

module.exports = config;

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure CSS files are processed
config.resolver.sourceExts.push('css');

// Add path mapping for @ alias - Metro configuration
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@ui': path.resolve(__dirname, 'src/components/ui'),
};

// Configure resolver to handle aliases properly
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure Metro can resolve the aliases
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = withNativeWind(config, { input: './global.css' });

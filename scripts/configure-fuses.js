const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');

async function configureFuses() {
  try {
    // Find electron executable
    const electronPath = require('electron');

    console.log('Configuring Electron fuses for better macOS compatibility...');

    await flipFuses(electronPath, {
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false, // This fixes the crash
    });

    console.log('Electron fuses configured successfully!');
  } catch (error) {
    console.warn('Warning: Could not configure Electron fuses:', error.message);
    // Don't fail the build if fuses can't be configured
  }
}

// Only run if called directly
if (require.main === module) {
  configureFuses();
}

module.exports = configureFuses;
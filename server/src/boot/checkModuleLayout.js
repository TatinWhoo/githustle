// src/boot/checkModuleLayout.js
// Scans for stray admin.*.js files at the modules root.
// Called from server.js before the HTTP listener opens.
const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.resolve(__dirname, '../modules');
const ADMIN_FLAT_PATTERN = /^admin\..+\.js$/;

const BOOT_ERRORS = {
  ADMIN_MODULE_NOT_CONSOLIDATED: 'ADMIN_MODULE_NOT_CONSOLIDATED',
};

function checkModuleLayout() {
  let entries;
  try {
    entries = fs.readdirSync(MODULES_DIR);
  } catch (err) {
    // If we can't read the directory, let it fail naturally elsewhere
    return;
  }

  const stray = entries.filter(
    (f) => ADMIN_FLAT_PATTERN.test(f) && fs.statSync(path.join(MODULES_DIR, f)).isFile()
  );

  if (stray.length > 0) {
    const paths = stray.map((f) => path.join(MODULES_DIR, f));
    const err = new Error(
      `${BOOT_ERRORS.ADMIN_MODULE_NOT_CONSOLIDATED}: stray admin module files found at modules root: ${paths.join(', ')}`
    );
    err.code = BOOT_ERRORS.ADMIN_MODULE_NOT_CONSOLIDATED;
    err.offendingPaths = paths;
    throw err;
  }
}

module.exports = { checkModuleLayout };

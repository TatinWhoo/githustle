// src/utils/appMount.js
// Route-mount registrar with duplicate detection and auto-disambiguation.
// Property: for any input list of {path, router, moduleName} tuples:
//   - 3+ modules on same path → throws ROUTE_MOUNT_CONFLICT
//   - 2 modules on same path → first keeps original path, second gets ${path}-${moduleName} + warn
//   - all other cases → app.use(path, router) as normal
const logger = require('../config/logger');

class BootError extends Error {
  constructor(code, details) {
    super(`${code}: ${JSON.stringify(details)}`);
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {import('express').Application} app
 * @param {Array<{path: string, router: import('express').Router, moduleName: string}>} mounts
 */
function mountAll(app, mounts) {
  // Count occurrences per path
  const seen = new Map(); // path -> [moduleName, ...]
  for (const m of mounts) {
    const prior = seen.get(m.path) || [];
    seen.set(m.path, [...prior, m.moduleName]);
  }

  // Check for triple-collision (3+ modules on same path)
  for (const [p, mods] of seen) {
    if (mods.length >= 3) {
      throw new BootError('ROUTE_MOUNT_CONFLICT', { path: p, modules: mods });
    }
  }

  // Mount all routers
  for (const m of mounts) {
    const priorList = seen.get(m.path);
    if (priorList.length === 1) {
      // No conflict — mount at original path
      app.use(m.path, m.router);
    } else {
      // Duplicate — first keeps original, second gets disambiguated path
      const idx = priorList.indexOf(m.moduleName);
      if (idx === 0) {
        // First entry keeps original path
        app.use(m.path, m.router);
      } else {
        // Later entry gets rewritten
        const finalPath = `${m.path}-${m.moduleName}`;
        logger.warn(
          { original: m.path, mounted: finalPath, module: m.moduleName },
          'route mount auto-disambiguated'
        );
        app.use(finalPath, m.router);
      }
    }
  }
}

module.exports = { mountAll, BootError };

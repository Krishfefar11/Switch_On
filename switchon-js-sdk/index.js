/**
 * SwitchOn JS SDK — main entry point
 *
 * Re-exports the browser client for backward compatibility.
 * For Node.js server usage:  require('@switchon/js-sdk/node')
 * For React hooks:           require('@switchon/js-sdk/react')
 */
'use strict';

module.exports = require('./src/browser.js');

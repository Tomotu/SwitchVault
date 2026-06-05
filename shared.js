/* Shared utilities — loaded by all SwitchVault pages */
function lsGet(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }

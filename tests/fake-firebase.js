// In-memory stand-in for firebase-database-compat, injected before the page's scripts run.
// Every read/write is recorded so tests can assert exactly which paths were touched.
// Nothing here talks to the network — production Firebase is never contacted.
(function () {
  var DB = {};
  var LOG = [];               // {op, path, keys}
  var listeners = [];         // {path, event, cb}

  function split(p) { return String(p).split('/').filter(Boolean); }
  function getPath(p) {
    var parts = split(p), node = DB;
    for (var i = 0; i < parts.length; i++) {
      if (node == null || typeof node !== 'object') return null;
      node = node[parts[i]];
    }
    return node === undefined ? null : node;
  }
  function setPath(p, val) {
    var parts = split(p);
    if (!parts.length) { DB = val == null ? {} : JSON.parse(JSON.stringify(val)); return; }
    var node = DB;
    for (var i = 0; i < parts.length - 1; i++) {
      if (node[parts[i]] == null || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
      node = node[parts[i]];
    }
    var last = parts[parts.length - 1];
    if (val == null) delete node[last];
    else node[last] = JSON.parse(JSON.stringify(val));
  }
  function snapFor(path, key) {
    var full = key == null ? path : path + '/' + key;
    var v = getPath(full);
    return { key: key == null ? split(path).pop() : key, val: function () { return v; } };
  }
  // Emit child events on any listener whose path is the direct parent of `childPath`.
  function emitChild(childPath, event) {
    var parts = split(childPath);
    var key = parts.pop();
    var parent = parts.join('/');
    listeners.forEach(function (l) {
      if (l.path === parent && l.event === event) {
        try { l.cb(snapFor(parent, key)); } catch (e) { console.error('listener threw', e); }
      }
    });
  }

  function Ref(path) { this._p = path; }
  Ref.prototype.child = function (c) { return new Ref(this._p + '/' + c); };
  Ref.prototype.once = function () {
    var self = this;
    LOG.push({ op: 'once', path: self._p });
    return Promise.resolve(snapFor(self._p));
  };
  Ref.prototype.on = function (event, cb, errCb) {
    var self = this;
    if (event === 'value') {
      listeners.push({ path: self._p, event: event, cb: cb, errCb: errCb });
      Promise.resolve().then(function () { cb(snapFor(self._p)); });
      return cb;
    }
    listeners.push({ path: self._p, event: event, cb: cb, errCb: errCb });
    if (event === 'child_added') {
      // Replay existing children, ascending key order, like the real SDK.
      var node = getPath(self._p);
      if (node && typeof node === 'object') {
        Object.keys(node).sort().forEach(function (k) {
          Promise.resolve().then(function () { cb(snapFor(self._p, k)); });
        });
      }
    }
    return cb;
  };
  Ref.prototype.off = function () { listeners = listeners.filter(function (l) { return l.path !== this._p; }.bind(this)); };
  // Firebase push keys are chronologically sortable; mimic that so any code relying on the
  // ordering behaves the same against the fake as against the real SDK.
  var pushSeq = 0;
  Ref.prototype.push = function (val) {
    var key = '-N' + Date.now().toString(36) + (pushSeq++).toString(36).padStart(3, '0');
    var child = new Ref(this._p + '/' + key);
    child.key = key;
    if (val !== undefined) child.set(val);
    return child;
  };
  Ref.prototype.set = function (val) {
    var existed = getPath(this._p) != null;
    LOG.push({ op: 'set', path: this._p });
    setPath(this._p, val);
    emitChild(this._p, existed ? 'child_changed' : 'child_added');
    return Promise.resolve();
  };
  Ref.prototype.update = function (patch) {
    var self = this;
    LOG.push({ op: 'update', path: self._p, keys: Object.keys(patch) });
    Object.keys(patch).forEach(function (rel) {
      var full = self._p + '/' + rel;
      var existed = getPath(full) != null;
      setPath(full, patch[rel]);
      emitChild(full, existed ? 'child_changed' : 'child_added');
    });
    return Promise.resolve();
  };
  Ref.prototype.remove = function () {
    LOG.push({ op: 'remove', path: this._p });
    var had = getPath(this._p) != null;
    setPath(this._p, null);
    if (had) emitChild(this._p, 'child_removed');
    return Promise.resolve();
  };

  // ── fake auth ───────────────────────────────────────────────────────────────────────
  var ACCOUNTS = {};          // identifier -> password
  var currentUser = null;
  var authWatchers = [];
  function notifyAuth() { authWatchers.forEach(function (cb) { try { cb(currentUser); } catch (e) { console.error(e); } }); }

  var fakeAuth = {
    onAuthStateChanged: function (cb) {
      authWatchers.push(cb);
      Promise.resolve().then(function () { cb(currentUser); });
      return function () {};
    },
    signInWithEmailAndPassword: function (email, pass) {
      LOG.push({ op: 'signIn', path: email });
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (ACCOUNTS[email] && ACCOUNTS[email] === pass) {
            currentUser = { uid: 'uid_' + email, email: email, displayName: null };
            notifyAuth();
            resolve({ user: currentUser });
          } else {
            var e = new Error('invalid'); e.code = 'auth/invalid-login-credentials';
            reject(e);
          }
        }, 5);
      });
    },
    signOut: function () {
      LOG.push({ op: 'signOut' });
      currentUser = null; notifyAuth();
      return Promise.resolve();
    },
  };

  window.firebase = {
    initializeApp: function () { return {}; },
    auth: function () { return fakeAuth; },
    database: function () {
      return {
        ref: function (p) {
          if (p === '.info/connected') {
            return { on: function (ev, cb) { Promise.resolve().then(function () { cb({ val: function () { return true; } }); }); } };
          }
          return new Ref(p);
        }
      };
    }
  };

  // Test control surface
  window.__fake = {
    addAccount: function (email, pass) { ACCOUNTS[email] = pass; },
    signedIn: function () { return currentUser; },
    seed: function (tree) { DB = JSON.parse(JSON.stringify(tree)); },
    dump: function () { return JSON.parse(JSON.stringify(DB)); },
    get: function (p) { return getPath(p); },
    log: function () { return LOG.slice(); },
    clearLog: function () { LOG = []; },
  };
})();

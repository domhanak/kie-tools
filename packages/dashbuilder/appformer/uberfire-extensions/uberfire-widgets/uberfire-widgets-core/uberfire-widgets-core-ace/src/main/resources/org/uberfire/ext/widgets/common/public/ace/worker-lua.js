"no use strict";
(function (e) {
  if (typeof e.window != "undefined" && e.document) return;
  (e.console = function () {
    var e = Array.prototype.slice.call(arguments, 0);
    postMessage({ type: "log", data: e });
  }),
    (e.console.error = e.console.warn = e.console.log = e.console.trace = e.console),
    (e.window = e),
    (e.ace = e),
    (e.onerror = function (e, t, n, r, i) {
      console.error("Worker " + (i ? i.stack : e));
    }),
    (e.normalizeModule = function (t, n) {
      if (n.indexOf("!") !== -1) {
        var r = n.split("!");
        return e.normalizeModule(t, r[0]) + "!" + e.normalizeModule(t, r[1]);
      }
      if (n.charAt(0) == ".") {
        var i = t.split("/").slice(0, -1).join("/");
        n = (i ? i + "/" : "") + n;
        while (n.indexOf(".") !== -1 && s != n) {
          var s = n;
          n = n
            .replace(/^\.\//, "")
            .replace(/\/\.\//, "/")
            .replace(/[^\/]+\/\.\.\//, "");
        }
      }
      return n;
    }),
    (e.require = function (t, n) {
      n || ((n = t), (t = null));
      if (!n.charAt) throw new Error("worker.js require() accepts only (parentId, id) as arguments");
      n = e.normalizeModule(t, n);
      var r = e.require.modules[n];
      if (r) return r.initialized || ((r.initialized = !0), (r.exports = r.factory().exports)), r.exports;
      var i = n.split("/");
      if (!e.require.tlns) return console.log("unable to load " + n);
      i[0] = e.require.tlns[i[0]] || i[0];
      var s = i.join("/") + ".js";
      return (e.require.id = n), importScripts(s), e.require(t, n);
    }),
    (e.require.modules = {}),
    (e.require.tlns = {}),
    (e.define = function (t, n, r) {
      arguments.length == 2
        ? ((r = n), typeof t != "string" && ((n = t), (t = e.require.id)))
        : arguments.length == 1 && ((r = t), (n = []), (t = e.require.id)),
        n.length || (n = ["require", "exports", "module"]);
      if (t.indexOf("text!") === 0) return;
      var i = function (n) {
        return e.require(t, n);
      };
      e.require.modules[t] = {
        exports: {},
        factory: function () {
          var e = this,
            t = r.apply(
              this,
              n.map(function (t) {
                switch (t) {
                  case "require":
                    return i;
                  case "exports":
                    return e.exports;
                  case "module":
                    return e;
                  default:
                    return i(t);
                }
              })
            );
          return t && (e.exports = t), e;
        },
      };
    }),
    (e.define.amd = {}),
    (e.initBaseUrls = function (e) {
      require.tlns = e;
    }),
    (e.initSender = function () {
      var t = e.require("ace/lib/event_emitter").EventEmitter,
        n = e.require("ace/lib/oop"),
        r = function () {};
      return (
        function () {
          n.implement(this, t),
            (this.callback = function (e, t) {
              postMessage({ type: "call", id: t, data: e });
            }),
            (this.emit = function (e, t) {
              postMessage({ type: "event", name: e, data: t });
            });
        }.call(r.prototype),
        new r()
      );
    });
  var t = (e.main = null),
    n = (e.sender = null);
  e.onmessage = function (r) {
    var i = r.data;
    if (i.command) {
      if (!t[i.command]) throw new Error("Unknown command:" + i.command);
      t[i.command].apply(t, i.args);
    } else if (i.init) {
      initBaseUrls(i.tlns), require("ace/lib/es5-shim"), (n = e.sender = initSender());
      var s = require(i.module)[i.classname];
      t = e.main = new s(n);
    } else i.event && n && n._signal(i.event, i.data);
  };
})(this),
  define(
    "ace/mode/lua_worker",
    ["require", "exports", "module", "ace/lib/oop", "ace/worker/mirror", "ace/mode/lua/luaparse"],
    function (e, t, n) {
      var r = e("../lib/oop"),
        i = e("../worker/mirror").Mirror,
        s = e("../mode/lua/luaparse"),
        o = (t.Worker = function (e) {
          i.call(this, e), this.setTimeout(500);
        });
      r.inherits(o, i),
        function () {
          this.onUpdate = function () {
            var e = this.doc.getValue();
            try {
              s.parse(e);
            } catch (t) {
              t instanceof SyntaxError &&
                this.sender.emit("error", { row: t.line - 1, column: t.column, text: t.message, type: "error" });
              return;
            }
            this.sender.emit("ok");
          };
        }.call(o.prototype);
    }
  ),
  define("ace/lib/oop", ["require", "exports", "module"], function (e, t, n) {
    (t.inherits = function (e, t) {
      (e.super_ = t),
        (e.prototype = Object.create(t.prototype, {
          constructor: { value: e, enumerable: !1, writable: !0, configurable: !0 },
        }));
    }),
      (t.mixin = function (e, t) {
        for (var n in t) e[n] = t[n];
        return e;
      }),
      (t.implement = function (e, n) {
        t.mixin(e, n);
      });
  }),
  define("ace/worker/mirror", ["require", "exports", "module", "ace/document", "ace/lib/lang"], function (e, t, n) {
    var r = e("../document").Document,
      i = e("../lib/lang"),
      s = (t.Mirror = function (e) {
        this.sender = e;
        var t = (this.doc = new r("")),
          n = (this.deferredUpdate = i.delayedCall(this.onUpdate.bind(this))),
          s = this;
        e.on("change", function (e) {
          t.applyDeltas(e.data);
          if (s.$timeout) return n.schedule(s.$timeout);
          s.onUpdate();
        });
      });
    (function () {
      (this.$timeout = 500),
        (this.setTimeout = function (e) {
          this.$timeout = e;
        }),
        (this.setValue = function (e) {
          this.doc.setValue(e), this.deferredUpdate.schedule(this.$timeout);
        }),
        (this.getValue = function (e) {
          this.sender.callback(this.doc.getValue(), e);
        }),
        (this.onUpdate = function () {}),
        (this.isPending = function () {
          return this.deferredUpdate.isPending();
        });
    }.call(s.prototype));
  }),
  define("ace/lib/es5-shim", ["require", "exports", "module"], function (e, t, n) {
    function r() {}
    function i(e) {
      try {
        return Object.defineProperty(e, "sentinel", {}), "sentinel" in e;
      } catch (t) {}
    }
    function s(e) {
      return (
        (e = +e),
        e !== e ? (e = 0) : e !== 0 && e !== 1 / 0 && e !== -1 / 0 && (e = (e > 0 || -1) * Math.floor(Math.abs(e))),
        e
      );
    }
    function o(e) {
      var t = typeof e;
      return e === null || t === "undefined" || t === "boolean" || t === "number" || t === "string";
    }
    function u(e) {
      var t, n, r;
      if (o(e)) return e;
      n = e.valueOf;
      if (typeof n == "function") {
        t = n.call(e);
        if (o(t)) return t;
      }
      r = e.toString;
      if (typeof r == "function") {
        t = r.call(e);
        if (o(t)) return t;
      }
      throw new TypeError();
    }
    Function.prototype.bind ||
      (Function.prototype.bind = function (e) {
        var t = this;
        if (typeof t != "function") throw new TypeError("Function.prototype.bind called on incompatible " + t);
        var n = c.call(arguments, 1),
          i = function () {
            if (this instanceof i) {
              var r = t.apply(this, n.concat(c.call(arguments)));
              return Object(r) === r ? r : this;
            }
            return t.apply(e, n.concat(c.call(arguments)));
          };
        return t.prototype && ((r.prototype = t.prototype), (i.prototype = new r()), (r.prototype = null)), i;
      });
    var a = Function.prototype.call,
      f = Array.prototype,
      l = Object.prototype,
      c = f.slice,
      h = a.bind(l.toString),
      p = a.bind(l.hasOwnProperty),
      d,
      v,
      m,
      g,
      y;
    if ((y = p(l, "__defineGetter__")))
      (d = a.bind(l.__defineGetter__)),
        (v = a.bind(l.__defineSetter__)),
        (m = a.bind(l.__lookupGetter__)),
        (g = a.bind(l.__lookupSetter__));
    if ([1, 2].splice(0).length != 2)
      if (
        !(function () {
          function e(e) {
            var t = new Array(e + 2);
            return (t[0] = t[1] = 0), t;
          }
          var t = [],
            n;
          t.splice.apply(t, e(20)), t.splice.apply(t, e(26)), (n = t.length), t.splice(5, 0, "XXX"), n + 1 == t.length;
          if (n + 1 == t.length) return !0;
        })()
      )
        Array.prototype.splice = function (e, t) {
          var n = this.length;
          e > 0 ? e > n && (e = n) : e == void 0 ? (e = 0) : e < 0 && (e = Math.max(n + e, 0)),
            e + t < n || (t = n - e);
          var r = this.slice(e, e + t),
            i = c.call(arguments, 2),
            s = i.length;
          if (e === n) s && this.push.apply(this, i);
          else {
            var o = Math.min(t, n - e),
              u = e + o,
              a = u + s - o,
              f = n - u,
              l = n - o;
            if (a < u) for (var h = 0; h < f; ++h) this[a + h] = this[u + h];
            else if (a > u) for (h = f; h--; ) this[a + h] = this[u + h];
            if (s && e === l) (this.length = l), this.push.apply(this, i);
            else {
              this.length = l + s;
              for (h = 0; h < s; ++h) this[e + h] = i[h];
            }
          }
          return r;
        };
      else {
        var b = Array.prototype.splice;
        Array.prototype.splice = function (e, t) {
          return arguments.length
            ? b.apply(this, [e === void 0 ? 0 : e, t === void 0 ? this.length - e : t].concat(c.call(arguments, 2)))
            : [];
        };
      }
    Array.isArray ||
      (Array.isArray = function (e) {
        return h(e) == "[object Array]";
      });
    var w = Object("a"),
      E = w[0] != "a" || !(0 in w);
    Array.prototype.forEach ||
      (Array.prototype.forEach = function (e) {
        var t = F(this),
          n = E && h(this) == "[object String]" ? this.split("") : t,
          r = arguments[1],
          i = -1,
          s = n.length >>> 0;
        if (h(e) != "[object Function]") throw new TypeError();
        while (++i < s) i in n && e.call(r, n[i], i, t);
      }),
      Array.prototype.map ||
        (Array.prototype.map = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = Array(r),
            s = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var o = 0; o < r; o++) o in n && (i[o] = e.call(s, n[o], o, t));
          return i;
        }),
      Array.prototype.filter ||
        (Array.prototype.filter = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = [],
            s,
            o = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var u = 0; u < r; u++) u in n && ((s = n[u]), e.call(o, s, u, t) && i.push(s));
          return i;
        }),
      Array.prototype.every ||
        (Array.prototype.every = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var s = 0; s < r; s++) if (s in n && !e.call(i, n[s], s, t)) return !1;
          return !0;
        }),
      Array.prototype.some ||
        (Array.prototype.some = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var s = 0; s < r; s++) if (s in n && e.call(i, n[s], s, t)) return !0;
          return !1;
        }),
      Array.prototype.reduce ||
        (Array.prototype.reduce = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0;
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          if (!r && arguments.length == 1) throw new TypeError("reduce of empty array with no initial value");
          var i = 0,
            s;
          if (arguments.length >= 2) s = arguments[1];
          else
            do {
              if (i in n) {
                s = n[i++];
                break;
              }
              if (++i >= r) throw new TypeError("reduce of empty array with no initial value");
            } while (!0);
          for (; i < r; i++) i in n && (s = e.call(void 0, s, n[i], i, t));
          return s;
        }),
      Array.prototype.reduceRight ||
        (Array.prototype.reduceRight = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0;
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          if (!r && arguments.length == 1) throw new TypeError("reduceRight of empty array with no initial value");
          var i,
            s = r - 1;
          if (arguments.length >= 2) i = arguments[1];
          else
            do {
              if (s in n) {
                i = n[s--];
                break;
              }
              if (--s < 0) throw new TypeError("reduceRight of empty array with no initial value");
            } while (!0);
          do s in this && (i = e.call(void 0, i, n[s], s, t));
          while (s--);
          return i;
        });
    if (!Array.prototype.indexOf || [0, 1].indexOf(1, 2) != -1)
      Array.prototype.indexOf = function (e) {
        var t = E && h(this) == "[object String]" ? this.split("") : F(this),
          n = t.length >>> 0;
        if (!n) return -1;
        var r = 0;
        arguments.length > 1 && (r = s(arguments[1])), (r = r >= 0 ? r : Math.max(0, n + r));
        for (; r < n; r++) if (r in t && t[r] === e) return r;
        return -1;
      };
    if (!Array.prototype.lastIndexOf || [0, 1].lastIndexOf(0, -3) != -1)
      Array.prototype.lastIndexOf = function (e) {
        var t = E && h(this) == "[object String]" ? this.split("") : F(this),
          n = t.length >>> 0;
        if (!n) return -1;
        var r = n - 1;
        arguments.length > 1 && (r = Math.min(r, s(arguments[1]))), (r = r >= 0 ? r : n - Math.abs(r));
        for (; r >= 0; r--) if (r in t && e === t[r]) return r;
        return -1;
      };
    Object.getPrototypeOf ||
      (Object.getPrototypeOf = function (e) {
        return e.__proto__ || (e.constructor ? e.constructor.prototype : l);
      });
    if (!Object.getOwnPropertyDescriptor) {
      var S = "Object.getOwnPropertyDescriptor called on a non-object: ";
      Object.getOwnPropertyDescriptor = function (e, t) {
        if ((typeof e != "object" && typeof e != "function") || e === null) throw new TypeError(S + e);
        if (!p(e, t)) return;
        var n, r, i;
        n = { enumerable: !0, configurable: !0 };
        if (y) {
          var s = e.__proto__;
          e.__proto__ = l;
          var r = m(e, t),
            i = g(e, t);
          e.__proto__ = s;
          if (r || i) return r && (n.get = r), i && (n.set = i), n;
        }
        return (n.value = e[t]), n;
      };
    }
    Object.getOwnPropertyNames ||
      (Object.getOwnPropertyNames = function (e) {
        return Object.keys(e);
      });
    if (!Object.create) {
      var x;
      Object.prototype.__proto__ === null
        ? (x = function () {
            return { __proto__: null };
          })
        : (x = function () {
            var e = {};
            for (var t in e) e[t] = null;
            return (
              (e.constructor =
                e.hasOwnProperty =
                e.propertyIsEnumerable =
                e.isPrototypeOf =
                e.toLocaleString =
                e.toString =
                e.valueOf =
                e.__proto__ =
                  null),
              e
            );
          }),
        (Object.create = function (e, t) {
          var n;
          if (e === null) n = x();
          else {
            if (typeof e != "object") throw new TypeError("typeof prototype[" + typeof e + "] != 'object'");
            var r = function () {};
            (r.prototype = e), (n = new r()), (n.__proto__ = e);
          }
          return t !== void 0 && Object.defineProperties(n, t), n;
        });
    }
    if (Object.defineProperty) {
      var T = i({}),
        N = typeof document == "undefined" || i(document.createElement("div"));
      if (!T || !N) var C = Object.defineProperty;
    }
    if (!Object.defineProperty || C) {
      var k = "Property description must be an object: ",
        L = "Object.defineProperty called on non-object: ",
        A = "getters & setters can not be defined on this javascript engine";
      Object.defineProperty = function (e, t, n) {
        if ((typeof e != "object" && typeof e != "function") || e === null) throw new TypeError(L + e);
        if ((typeof n != "object" && typeof n != "function") || n === null) throw new TypeError(k + n);
        if (C)
          try {
            return C.call(Object, e, t, n);
          } catch (r) {}
        if (p(n, "value"))
          if (y && (m(e, t) || g(e, t))) {
            var i = e.__proto__;
            (e.__proto__ = l), delete e[t], (e[t] = n.value), (e.__proto__ = i);
          } else e[t] = n.value;
        else {
          if (!y) throw new TypeError(A);
          p(n, "get") && d(e, t, n.get), p(n, "set") && v(e, t, n.set);
        }
        return e;
      };
    }
    Object.defineProperties ||
      (Object.defineProperties = function (e, t) {
        for (var n in t) p(t, n) && Object.defineProperty(e, n, t[n]);
        return e;
      }),
      Object.seal ||
        (Object.seal = function (e) {
          return e;
        }),
      Object.freeze ||
        (Object.freeze = function (e) {
          return e;
        });
    try {
      Object.freeze(function () {});
    } catch (O) {
      Object.freeze = (function (e) {
        return function (t) {
          return typeof t == "function" ? t : e(t);
        };
      })(Object.freeze);
    }
    Object.preventExtensions ||
      (Object.preventExtensions = function (e) {
        return e;
      }),
      Object.isSealed ||
        (Object.isSealed = function (e) {
          return !1;
        }),
      Object.isFrozen ||
        (Object.isFrozen = function (e) {
          return !1;
        }),
      Object.isExtensible ||
        (Object.isExtensible = function (e) {
          if (Object(e) === e) throw new TypeError();
          var t = "";
          while (p(e, t)) t += "?";
          e[t] = !0;
          var n = p(e, t);
          return delete e[t], n;
        });
    if (!Object.keys) {
      var M = !0,
        _ = [
          "toString",
          "toLocaleString",
          "valueOf",
          "hasOwnProperty",
          "isPrototypeOf",
          "propertyIsEnumerable",
          "constructor",
        ],
        D = _.length;
      for (var P in { toString: null }) M = !1;
      Object.keys = function I(e) {
        if ((typeof e != "object" && typeof e != "function") || e === null)
          throw new TypeError("Object.keys called on a non-object");
        var I = [];
        for (var t in e) p(e, t) && I.push(t);
        if (M)
          for (var n = 0, r = D; n < r; n++) {
            var i = _[n];
            p(e, i) && I.push(i);
          }
        return I;
      };
    }
    Date.now ||
      (Date.now = function () {
        return new Date().getTime();
      });
    var H = "	\n\f\r   ᠎             　\u2028\u2029﻿";
    if (!String.prototype.trim || H.trim()) {
      H = "[" + H + "]";
      var B = new RegExp("^" + H + H + "*"),
        j = new RegExp(H + H + "*$");
      String.prototype.trim = function () {
        return String(this).replace(B, "").replace(j, "");
      };
    }
    var F = function (e) {
      if (e == null) throw new TypeError("can't convert " + e + " to object");
      return Object(e);
    };
  }),
  define("ace/lib/event_emitter", ["require", "exports", "module"], function (e, t, n) {
    var r = {},
      i = function () {
        this.propagationStopped = !0;
      },
      s = function () {
        this.defaultPrevented = !0;
      };
    (r._emit = r._dispatchEvent =
      function (e, t) {
        this._eventRegistry || (this._eventRegistry = {}), this._defaultHandlers || (this._defaultHandlers = {});
        var n = this._eventRegistry[e] || [],
          r = this._defaultHandlers[e];
        if (!n.length && !r) return;
        if (typeof t != "object" || !t) t = {};
        t.type || (t.type = e),
          t.stopPropagation || (t.stopPropagation = i),
          t.preventDefault || (t.preventDefault = s),
          (n = n.slice());
        for (var o = 0; o < n.length; o++) {
          n[o](t, this);
          if (t.propagationStopped) break;
        }
        if (r && !t.defaultPrevented) return r(t, this);
      }),
      (r._signal = function (e, t) {
        var n = (this._eventRegistry || {})[e];
        if (!n) return;
        n = n.slice();
        for (var r = 0; r < n.length; r++) n[r](t, this);
      }),
      (r.once = function (e, t) {
        var n = this;
        t &&
          this.addEventListener(e, function r() {
            n.removeEventListener(e, r), t.apply(null, arguments);
          });
      }),
      (r.setDefaultHandler = function (e, t) {
        var n = this._defaultHandlers;
        n || (n = this._defaultHandlers = { _disabled_: {} });
        if (n[e]) {
          var r = n[e],
            i = n._disabled_[e];
          i || (n._disabled_[e] = i = []), i.push(r);
          var s = i.indexOf(t);
          s != -1 && i.splice(s, 1);
        }
        n[e] = t;
      }),
      (r.removeDefaultHandler = function (e, t) {
        var n = this._defaultHandlers;
        if (!n) return;
        var r = n._disabled_[e];
        if (n[e] == t) {
          var i = n[e];
          r && this.setDefaultHandler(e, r.pop());
        } else if (r) {
          var s = r.indexOf(t);
          s != -1 && r.splice(s, 1);
        }
      }),
      (r.on = r.addEventListener =
        function (e, t, n) {
          this._eventRegistry = this._eventRegistry || {};
          var r = this._eventRegistry[e];
          return r || (r = this._eventRegistry[e] = []), r.indexOf(t) == -1 && r[n ? "unshift" : "push"](t), t;
        }),
      (r.off =
        r.removeListener =
        r.removeEventListener =
          function (e, t) {
            this._eventRegistry = this._eventRegistry || {};
            var n = this._eventRegistry[e];
            if (!n) return;
            var r = n.indexOf(t);
            r !== -1 && n.splice(r, 1);
          }),
      (r.removeAllListeners = function (e) {
        this._eventRegistry && (this._eventRegistry[e] = []);
      }),
      (t.EventEmitter = r);
  }),
  define("ace/range", ["require", "exports", "module"], function (e, t, n) {
    var r = function (e, t) {
        return e.row - t.row || e.column - t.column;
      },
      i = function (e, t, n, r) {
        (this.start = { row: e, column: t }), (this.end = { row: n, column: r });
      };
    (function () {
      (this.isEqual = function (e) {
        return (
          this.start.row === e.start.row &&
          this.end.row === e.end.row &&
          this.start.column === e.start.column &&
          this.end.column === e.end.column
        );
      }),
        (this.toString = function () {
          return (
            "Range: [" +
            this.start.row +
            "/" +
            this.start.column +
            "] -> [" +
            this.end.row +
            "/" +
            this.end.column +
            "]"
          );
        }),
        (this.contains = function (e, t) {
          return this.compare(e, t) == 0;
        }),
        (this.compareRange = function (e) {
          var t,
            n = e.end,
            r = e.start;
          return (
            (t = this.compare(n.row, n.column)),
            t == 1
              ? ((t = this.compare(r.row, r.column)), t == 1 ? 2 : t == 0 ? 1 : 0)
              : t == -1
              ? -2
              : ((t = this.compare(r.row, r.column)), t == -1 ? -1 : t == 1 ? 42 : 0)
          );
        }),
        (this.comparePoint = function (e) {
          return this.compare(e.row, e.column);
        }),
        (this.containsRange = function (e) {
          return this.comparePoint(e.start) == 0 && this.comparePoint(e.end) == 0;
        }),
        (this.intersects = function (e) {
          var t = this.compareRange(e);
          return t == -1 || t == 0 || t == 1;
        }),
        (this.isEnd = function (e, t) {
          return this.end.row == e && this.end.column == t;
        }),
        (this.isStart = function (e, t) {
          return this.start.row == e && this.start.column == t;
        }),
        (this.setStart = function (e, t) {
          typeof e == "object"
            ? ((this.start.column = e.column), (this.start.row = e.row))
            : ((this.start.row = e), (this.start.column = t));
        }),
        (this.setEnd = function (e, t) {
          typeof e == "object"
            ? ((this.end.column = e.column), (this.end.row = e.row))
            : ((this.end.row = e), (this.end.column = t));
        }),
        (this.inside = function (e, t) {
          return this.compare(e, t) == 0 ? (this.isEnd(e, t) || this.isStart(e, t) ? !1 : !0) : !1;
        }),
        (this.insideStart = function (e, t) {
          return this.compare(e, t) == 0 ? (this.isEnd(e, t) ? !1 : !0) : !1;
        }),
        (this.insideEnd = function (e, t) {
          return this.compare(e, t) == 0 ? (this.isStart(e, t) ? !1 : !0) : !1;
        }),
        (this.compare = function (e, t) {
          return !this.isMultiLine() && e === this.start.row
            ? t < this.start.column
              ? -1
              : t > this.end.column
              ? 1
              : 0
            : e < this.start.row
            ? -1
            : e > this.end.row
            ? 1
            : this.start.row === e
            ? t >= this.start.column
              ? 0
              : -1
            : this.end.row === e
            ? t <= this.end.column
              ? 0
              : 1
            : 0;
        }),
        (this.compareStart = function (e, t) {
          return this.start.row == e && this.start.column == t ? -1 : this.compare(e, t);
        }),
        (this.compareEnd = function (e, t) {
          return this.end.row == e && this.end.column == t ? 1 : this.compare(e, t);
        }),
        (this.compareInside = function (e, t) {
          return this.end.row == e && this.end.column == t
            ? 1
            : this.start.row == e && this.start.column == t
            ? -1
            : this.compare(e, t);
        }),
        (this.clipRows = function (e, t) {
          if (this.end.row > t) var n = { row: t + 1, column: 0 };
          else if (this.end.row < e) var n = { row: e, column: 0 };
          if (this.start.row > t) var r = { row: t + 1, column: 0 };
          else if (this.start.row < e) var r = { row: e, column: 0 };
          return i.fromPoints(r || this.start, n || this.end);
        }),
        (this.extend = function (e, t) {
          var n = this.compare(e, t);
          if (n == 0) return this;
          if (n == -1) var r = { row: e, column: t };
          else var s = { row: e, column: t };
          return i.fromPoints(r || this.start, s || this.end);
        }),
        (this.isEmpty = function () {
          return this.start.row === this.end.row && this.start.column === this.end.column;
        }),
        (this.isMultiLine = function () {
          return this.start.row !== this.end.row;
        }),
        (this.clone = function () {
          return i.fromPoints(this.start, this.end);
        }),
        (this.collapseRows = function () {
          return this.end.column == 0
            ? new i(this.start.row, 0, Math.max(this.start.row, this.end.row - 1), 0)
            : new i(this.start.row, 0, this.end.row, 0);
        }),
        (this.toScreenRange = function (e) {
          var t = e.documentToScreenPosition(this.start),
            n = e.documentToScreenPosition(this.end);
          return new i(t.row, t.column, n.row, n.column);
        }),
        (this.moveBy = function (e, t) {
          (this.start.row += e), (this.start.column += t), (this.end.row += e), (this.end.column += t);
        });
    }.call(i.prototype),
      (i.fromPoints = function (e, t) {
        return new i(e.row, e.column, t.row, t.column);
      }),
      (i.comparePoints = r),
      (i.comparePoints = function (e, t) {
        return e.row - t.row || e.column - t.column;
      }),
      (t.Range = i));
  }),
  define("ace/anchor", ["require", "exports", "module", "ace/lib/oop", "ace/lib/event_emitter"], function (e, t, n) {
    var r = e("./lib/oop"),
      i = e("./lib/event_emitter").EventEmitter,
      s = (t.Anchor = function (e, t, n) {
        (this.$onChange = this.onChange.bind(this)),
          this.attach(e),
          typeof n == "undefined" ? this.setPosition(t.row, t.column) : this.setPosition(t, n);
      });
    (function () {
      r.implement(this, i),
        (this.getPosition = function () {
          return this.$clipPositionToDocument(this.row, this.column);
        }),
        (this.getDocument = function () {
          return this.document;
        }),
        (this.$insertRight = !1),
        (this.onChange = function (e) {
          var t = e.data,
            n = t.range;
          if (n.start.row == n.end.row && n.start.row != this.row) return;
          if (n.start.row > this.row) return;
          if (n.start.row == this.row && n.start.column > this.column) return;
          var r = this.row,
            i = this.column,
            s = n.start,
            o = n.end;
          if (t.action === "insertText")
            if (s.row === r && s.column <= i) {
              if (s.column !== i || !this.$insertRight)
                s.row === o.row ? (i += o.column - s.column) : ((i -= s.column), (r += o.row - s.row));
            } else s.row !== o.row && s.row < r && (r += o.row - s.row);
          else
            t.action === "insertLines"
              ? (s.row !== r || i !== 0 || !this.$insertRight) && s.row <= r && (r += o.row - s.row)
              : t.action === "removeText"
              ? s.row === r && s.column < i
                ? o.column >= i
                  ? (i = s.column)
                  : (i = Math.max(0, i - (o.column - s.column)))
                : s.row !== o.row && s.row < r
                ? (o.row === r && (i = Math.max(0, i - o.column) + s.column), (r -= o.row - s.row))
                : o.row === r && ((r -= o.row - s.row), (i = Math.max(0, i - o.column) + s.column))
              : t.action == "removeLines" && s.row <= r && (o.row <= r ? (r -= o.row - s.row) : ((r = s.row), (i = 0)));
          this.setPosition(r, i, !0);
        }),
        (this.setPosition = function (e, t, n) {
          var r;
          n ? (r = { row: e, column: t }) : (r = this.$clipPositionToDocument(e, t));
          if (this.row == r.row && this.column == r.column) return;
          var i = { row: this.row, column: this.column };
          (this.row = r.row), (this.column = r.column), this._signal("change", { old: i, value: r });
        }),
        (this.detach = function () {
          this.document.removeEventListener("change", this.$onChange);
        }),
        (this.attach = function (e) {
          (this.document = e || this.document), this.document.on("change", this.$onChange);
        }),
        (this.$clipPositionToDocument = function (e, t) {
          var n = {};
          return (
            e >= this.document.getLength()
              ? ((n.row = Math.max(0, this.document.getLength() - 1)), (n.column = this.document.getLine(n.row).length))
              : e < 0
              ? ((n.row = 0), (n.column = 0))
              : ((n.row = e), (n.column = Math.min(this.document.getLine(n.row).length, Math.max(0, t)))),
            t < 0 && (n.column = 0),
            n
          );
        });
    }.call(s.prototype));
  }),
  define("ace/lib/lang", ["require", "exports", "module"], function (e, t, n) {
    (t.last = function (e) {
      return e[e.length - 1];
    }),
      (t.stringReverse = function (e) {
        return e.split("").reverse().join("");
      }),
      (t.stringRepeat = function (e, t) {
        var n = "";
        while (t > 0) {
          t & 1 && (n += e);
          if ((t >>= 1)) e += e;
        }
        return n;
      });
    var r = /^\s\s*/,
      i = /\s\s*$/;
    (t.stringTrimLeft = function (e) {
      return e.replace(r, "");
    }),
      (t.stringTrimRight = function (e) {
        return e.replace(i, "");
      }),
      (t.copyObject = function (e) {
        var t = {};
        for (var n in e) t[n] = e[n];
        return t;
      }),
      (t.copyArray = function (e) {
        var t = [];
        for (var n = 0, r = e.length; n < r; n++)
          e[n] && typeof e[n] == "object" ? (t[n] = this.copyObject(e[n])) : (t[n] = e[n]);
        return t;
      }),
      (t.deepCopy = function (e) {
        if (typeof e != "object" || !e) return e;
        var n = e.constructor;
        if (n === RegExp) return e;
        var r = n();
        for (var i in e) typeof e[i] == "object" ? (r[i] = t.deepCopy(e[i])) : (r[i] = e[i]);
        return r;
      }),
      (t.arrayToMap = function (e) {
        var t = {};
        for (var n = 0; n < e.length; n++) t[e[n]] = 1;
        return t;
      }),
      (t.createMap = function (e) {
        var t = Object.create(null);
        for (var n in e) t[n] = e[n];
        return t;
      }),
      (t.arrayRemove = function (e, t) {
        for (var n = 0; n <= e.length; n++) t === e[n] && e.splice(n, 1);
      }),
      (t.escapeRegExp = function (e) {
        return e.replace(/([.*+?^${}()|[\]\/\\])/g, "\\$1");
      }),
      (t.escapeHTML = function (e) {
        return e.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
      }),
      (t.getMatchOffsets = function (e, t) {
        var n = [];
        return (
          e.replace(t, function (e) {
            n.push({ offset: arguments[arguments.length - 2], length: e.length });
          }),
          n
        );
      }),
      (t.deferredCall = function (e) {
        var t = null,
          n = function () {
            (t = null), e();
          },
          r = function (e) {
            return r.cancel(), (t = setTimeout(n, e || 0)), r;
          };
        return (
          (r.schedule = r),
          (r.call = function () {
            return this.cancel(), e(), r;
          }),
          (r.cancel = function () {
            return clearTimeout(t), (t = null), r;
          }),
          (r.isPending = function () {
            return t;
          }),
          r
        );
      }),
      (t.delayedCall = function (e, t) {
        var n = null,
          r = function () {
            (n = null), e();
          },
          i = function (e) {
            n == null && (n = setTimeout(r, e || t));
          };
        return (
          (i.delay = function (e) {
            n && clearTimeout(n), (n = setTimeout(r, e || t));
          }),
          (i.schedule = i),
          (i.call = function () {
            this.cancel(), e();
          }),
          (i.cancel = function () {
            n && clearTimeout(n), (n = null);
          }),
          (i.isPending = function () {
            return n;
          }),
          i
        );
      });
  }),
  define("ace/mode/lua/luaparse", ["require", "exports", "module"], function (e, t, n) {
    (function (e, n, r) {
      r(t);
    })(this, "luaparse", function (e) {
      function t(e) {
        if (Jt) {
          var t = $t.pop();
          t.complete(), bt.locations && (e.loc = t.loc), bt.ranges && (e.range = t.range);
        }
        return e;
      }
      function n(e, t, n) {
        for (var r = 0, i = e.length; r < i; r++) if (e[r][t] === n) return r;
        return -1;
      }
      function r(e) {
        var t = Dt.call(arguments, 1);
        return (
          (e = e.replace(/%(\d)/g, function (e, n) {
            return "" + t[n - 1] || "";
          })),
          e
        );
      }
      function i() {
        var e = Dt.call(arguments),
          t = {},
          n,
          r;
        for (var i = 0, s = e.length; i < s; i++) {
          n = e[i];
          for (r in n) n.hasOwnProperty(r) && (t[r] = n[r]);
        }
        return t;
      }
      function s(e) {
        var t = r.apply(null, Dt.call(arguments, 1)),
          n,
          i;
        throw (
          ("undefined" != typeof e.line
            ? ((i = e.range[0] - e.lineStart),
              (n = new SyntaxError(r("[%1:%2] %3", e.line, i, t))),
              (n.line = e.line),
              (n.index = e.range[0]),
              (n.column = i))
            : ((i = Bt - zt + 1),
              (n = new SyntaxError(r("[%1:%2] %3", Ut, i, t))),
              (n.index = Bt),
              (n.line = Ut),
              (n.column = i)),
          n)
        );
      }
      function o(e, t) {
        s(t, Mt.expectedToken, e, t.value);
      }
      function u(e, t) {
        "undefined" == typeof t && (t = It.value);
        if ("undefined" != typeof e.type) {
          var n;
          switch (e.type) {
            case xt:
              n = "string";
              break;
            case Tt:
              n = "keyword";
              break;
            case Nt:
              n = "identifier";
              break;
            case Ct:
              n = "number";
              break;
            case kt:
              n = "symbol";
              break;
            case Lt:
              n = "boolean";
              break;
            case At:
              return s(e, Mt.unexpected, "symbol", "nil", t);
          }
          return s(e, Mt.unexpected, n, e.value, t);
        }
        return s(e, Mt.unexpected, "symbol", e, t);
      }
      function a() {
        f();
        while (45 === yt.charCodeAt(Bt) && 45 === yt.charCodeAt(Bt + 1)) b(), f();
        if (Bt >= wt) return { type: St, value: "<eof>", line: Ut, lineStart: zt, range: [Bt, Bt] };
        var e = yt.charCodeAt(Bt),
          t = yt.charCodeAt(Bt + 1);
        Rt = Bt;
        if (L(e)) return l();
        switch (e) {
          case 39:
          case 34:
            return p();
          case 48:
          case 49:
          case 50:
          case 51:
          case 52:
          case 53:
          case 54:
          case 55:
          case 56:
          case 57:
            return v();
          case 46:
            if (C(t)) return v();
            if (46 === t) return 46 === yt.charCodeAt(Bt + 2) ? h() : c("..");
            return c(".");
          case 61:
            if (61 === t) return c("==");
            return c("=");
          case 62:
            if (61 === t) return c(">=");
            return c(">");
          case 60:
            if (61 === t) return c("<=");
            return c("<");
          case 126:
            if (61 === t) return c("~=");
            return s({}, Mt.expected, "=", "~");
          case 58:
            if (58 === t) return c("::");
            return c(":");
          case 91:
            if (91 === t || 61 === t) return d();
            return c("[");
          case 42:
          case 47:
          case 94:
          case 37:
          case 44:
          case 123:
          case 125:
          case 93:
          case 40:
          case 41:
          case 59:
          case 35:
          case 45:
          case 43:
            return c(yt.charAt(Bt));
        }
        return u(yt.charAt(Bt));
      }
      function f() {
        while (Bt < wt) {
          var e = yt.charCodeAt(Bt);
          if (T(e)) Bt++;
          else {
            if (!N(e)) break;
            Ut++, (zt = ++Bt);
          }
        }
      }
      function l() {
        var e, t;
        while (A(yt.charCodeAt(++Bt)));
        return (
          (e = yt.slice(Rt, Bt)),
          O(e)
            ? (t = Tt)
            : "true" === e || "false" === e
            ? ((t = Lt), (e = "true" === e))
            : "nil" === e
            ? ((t = At), (e = null))
            : (t = Nt),
          { type: t, value: e, line: Ut, lineStart: zt, range: [Rt, Bt] }
        );
      }
      function c(e) {
        return (Bt += e.length), { type: kt, value: e, line: Ut, lineStart: zt, range: [Rt, Bt] };
      }
      function h() {
        return (Bt += 3), { type: Ot, value: "...", line: Ut, lineStart: zt, range: [Rt, Bt] };
      }
      function p() {
        var e = yt.charCodeAt(Bt++),
          t = Bt,
          n = "",
          r;
        while (Bt < wt) {
          r = yt.charCodeAt(Bt++);
          if (e === r) break;
          if (92 === r) (n += yt.slice(t, Bt - 1) + y()), (t = Bt);
          else if (Bt >= wt || N(r)) (n += yt.slice(t, Bt - 1)), s({}, Mt.unfinishedString, n + String.fromCharCode(r));
        }
        return (n += yt.slice(t, Bt - 1)), { type: xt, value: n, line: Ut, lineStart: zt, range: [Rt, Bt] };
      }
      function d() {
        var e = w();
        return (
          !1 === e && s(jt, Mt.expected, "[", jt.value),
          { type: xt, value: e, line: Ut, lineStart: zt, range: [Rt, Bt] }
        );
      }
      function v() {
        var e = yt.charAt(Bt),
          t = yt.charAt(Bt + 1),
          n = "0" === e && "xX".indexOf(t || null) >= 0 ? m() : g();
        return { type: Ct, value: n, line: Ut, lineStart: zt, range: [Rt, Bt] };
      }
      function m() {
        var e = 0,
          t = 1,
          n = 1,
          r,
          i,
          o,
          u;
        (u = Bt += 2), k(yt.charCodeAt(Bt)) || s({}, Mt.malformedNumber, yt.slice(Rt, Bt));
        while (k(yt.charCodeAt(Bt))) Bt++;
        r = parseInt(yt.slice(u, Bt), 16);
        if ("." === yt.charAt(Bt)) {
          i = ++Bt;
          while (k(yt.charCodeAt(Bt))) Bt++;
          (e = yt.slice(i, Bt)), (e = i === Bt ? 0 : parseInt(e, 16) / Math.pow(16, Bt - i));
        }
        if ("pP".indexOf(yt.charAt(Bt) || null) >= 0) {
          Bt++,
            "+-".indexOf(yt.charAt(Bt) || null) >= 0 && (n = "+" === yt.charAt(Bt++) ? 1 : -1),
            (o = Bt),
            C(yt.charCodeAt(Bt)) || s({}, Mt.malformedNumber, yt.slice(Rt, Bt));
          while (C(yt.charCodeAt(Bt))) Bt++;
          (t = yt.slice(o, Bt)), (t = Math.pow(2, t * n));
        }
        return (r + e) * t;
      }
      function g() {
        while (C(yt.charCodeAt(Bt))) Bt++;
        if ("." === yt.charAt(Bt)) {
          Bt++;
          while (C(yt.charCodeAt(Bt))) Bt++;
        }
        if ("eE".indexOf(yt.charAt(Bt) || null) >= 0) {
          Bt++,
            "+-".indexOf(yt.charAt(Bt) || null) >= 0 && Bt++,
            C(yt.charCodeAt(Bt)) || s({}, Mt.malformedNumber, yt.slice(Rt, Bt));
          while (C(yt.charCodeAt(Bt))) Bt++;
        }
        return parseFloat(yt.slice(Rt, Bt));
      }
      function y() {
        var e = Bt;
        switch (yt.charAt(Bt)) {
          case "n":
            return Bt++, "\n";
          case "r":
            return Bt++, "\r";
          case "t":
            return Bt++, "	";
          case "v":
            return Bt++, "";
          case "b":
            return Bt++, "\b";
          case "f":
            return Bt++, "\f";
          case "z":
            return Bt++, f(), "";
          case "x":
            if (k(yt.charCodeAt(Bt + 1)) && k(yt.charCodeAt(Bt + 2))) return (Bt += 3), "\\" + yt.slice(e, Bt);
            return "\\" + yt.charAt(Bt++);
          default:
            if (C(yt.charCodeAt(Bt))) {
              while (C(yt.charCodeAt(++Bt)));
              return "\\" + yt.slice(e, Bt);
            }
            return yt.charAt(Bt++);
        }
      }
      function b() {
        (Rt = Bt), (Bt += 2);
        var e = yt.charAt(Bt),
          t = "",
          n = !1,
          r = Bt,
          i = zt,
          s = Ut;
        "[" === e && ((t = w()), !1 === t ? (t = e) : (n = !0));
        if (!n) {
          while (Bt < wt) {
            if (N(yt.charCodeAt(Bt))) break;
            Bt++;
          }
          bt.comments && (t = yt.slice(r, Bt));
        }
        if (bt.comments) {
          var o = _t.comment(t, yt.slice(Rt, Bt));
          bt.locations && (o.loc = { start: { line: s, column: Rt - i }, end: { line: Ut, column: Bt - zt } }),
            bt.ranges && (o.range = [Rt, Bt]),
            qt.push(o);
        }
      }
      function w() {
        var e = 0,
          t = "",
          n = !1,
          r,
          i;
        Bt++;
        while ("=" === yt.charAt(Bt + e)) e++;
        if ("[" !== yt.charAt(Bt + e)) return !1;
        (Bt += e + 1), N(yt.charCodeAt(Bt)) && (Ut++, (zt = Bt++)), (i = Bt);
        while (Bt < wt) {
          (r = yt.charAt(Bt++)), N(r.charCodeAt(0)) && (Ut++, (zt = Bt));
          if ("]" === r) {
            n = !0;
            for (var s = 0; s < e; s++) "=" !== yt.charAt(Bt + s) && (n = !1);
            "]" !== yt.charAt(Bt + e) && (n = !1);
          }
          if (n) break;
        }
        return (t += yt.slice(i, Bt - 1)), (Bt += e + 1), t;
      }
      function E() {
        (Ft = jt), (jt = It), (It = a());
      }
      function S(e) {
        return e === jt.value ? (E(), !0) : !1;
      }
      function x(e) {
        e === jt.value ? E() : s(jt, Mt.expected, e, jt.value);
      }
      function T(e) {
        return 9 === e || 32 === e || 11 === e || 12 === e;
      }
      function N(e) {
        return 10 === e || 13 === e;
      }
      function C(e) {
        return e >= 48 && e <= 57;
      }
      function k(e) {
        return (e >= 48 && e <= 57) || (e >= 97 && e <= 102) || (e >= 65 && e <= 70);
      }
      function L(e) {
        return (e >= 65 && e <= 90) || (e >= 97 && e <= 122) || 95 === e;
      }
      function A(e) {
        return (e >= 65 && e <= 90) || (e >= 97 && e <= 122) || 95 === e || (e >= 48 && e <= 57);
      }
      function O(e) {
        switch (e.length) {
          case 2:
            return "do" === e || "if" === e || "in" === e || "or" === e;
          case 3:
            return "and" === e || "end" === e || "for" === e || "not" === e;
          case 4:
            return "else" === e || "goto" === e || "then" === e;
          case 5:
            return "break" === e || "local" === e || "until" === e || "while" === e;
          case 6:
            return "elseif" === e || "repeat" === e || "return" === e;
          case 8:
            return "function" === e;
        }
        return !1;
      }
      function M(e) {
        return kt === e.type ? "#-".indexOf(e.value) >= 0 : Tt === e.type ? "not" === e.value : !1;
      }
      function _(e) {
        switch (e.type) {
          case "CallExpression":
          case "TableCallExpression":
          case "StringCallExpression":
            return !0;
        }
        return !1;
      }
      function D(e) {
        if (St === e.type) return !0;
        if (Tt !== e.type) return !1;
        switch (e.value) {
          case "else":
          case "elseif":
          case "end":
          case "until":
            return !0;
          default:
            return !1;
        }
      }
      function P() {
        Wt.push(Array.apply(null, Wt[Xt++]));
      }
      function H() {
        Wt.pop(), Xt--;
      }
      function B(e) {
        if (-1 !== Ht(Wt[Xt], e)) return;
        Wt[Xt].push(e);
      }
      function j(e) {
        B(e.name), F(e, !0);
      }
      function F(e, t) {
        !t && -1 === n(Vt, "name", e.name) && Vt.push(e), (e.isLocal = t);
      }
      function I(e) {
        return -1 !== Ht(Wt[Xt], e);
      }
      function q() {
        return new R(jt);
      }
      function R(e) {
        bt.locations &&
          (this.loc = { start: { line: e.line, column: e.range[0] - e.lineStart }, end: { line: 0, column: 0 } }),
          bt.ranges && (this.range = [e.range[0], 0]);
      }
      function U() {
        Jt && $t.push(q());
      }
      function z(e) {
        Jt && $t.push(e);
      }
      function W() {
        E(), U();
        var e = X();
        return St !== jt.type && u(jt), Jt && !e.length && (Ft = jt), t(_t.chunk(e));
      }
      function X(e) {
        var t = [],
          n;
        bt.scope && P();
        while (!D(jt)) {
          if ("return" === jt.value) {
            t.push(V());
            break;
          }
          (n = V()), n && t.push(n);
        }
        return bt.scope && H(), t;
      }
      function V() {
        U();
        if (Tt === jt.type)
          switch (jt.value) {
            case "local":
              return E(), nt();
            case "if":
              return E(), et();
            case "return":
              return E(), Z();
            case "function":
              E();
              var e = ot();
              return st(e);
            case "while":
              return E(), G();
            case "for":
              return E(), tt();
            case "repeat":
              return E(), Y();
            case "break":
              return E(), J();
            case "do":
              return E(), Q();
            case "goto":
              return E(), K();
          }
        if (kt === jt.type && S("::")) return $();
        Jt && $t.pop();
        if (S(";")) return;
        return rt();
      }
      function $() {
        var e = jt.value,
          n = it();
        return bt.scope && (B("::" + e + "::"), F(n, !0)), x("::"), t(_t.labelStatement(n));
      }
      function J() {
        return t(_t.breakStatement());
      }
      function K() {
        var e = jt.value,
          n = it();
        return bt.scope && (n.isLabel = I("::" + e + "::")), t(_t.gotoStatement(n));
      }
      function Q() {
        var e = X();
        return x("end"), t(_t.doStatement(e));
      }
      function G() {
        var e = ft();
        x("do");
        var n = X();
        return x("end"), t(_t.whileStatement(e, n));
      }
      function Y() {
        var e = X();
        x("until");
        var n = ft();
        return t(_t.repeatStatement(n, e));
      }
      function Z() {
        var e = [];
        if ("end" !== jt.value) {
          var n = at();
          null != n && e.push(n);
          while (S(",")) (n = ft()), e.push(n);
          S(";");
        }
        return t(_t.returnStatement(e));
      }
      function et() {
        var e = [],
          n,
          r,
          i;
        Jt && ((i = $t[$t.length - 1]), $t.push(i)),
          (n = ft()),
          x("then"),
          (r = X()),
          e.push(t(_t.ifClause(n, r))),
          Jt && (i = q());
        while (S("elseif")) z(i), (n = ft()), x("then"), (r = X()), e.push(t(_t.elseifClause(n, r))), Jt && (i = q());
        return (
          S("else") && (Jt && ((i = new R(Ft)), $t.push(i)), (r = X()), e.push(t(_t.elseClause(r)))),
          x("end"),
          t(_t.ifStatement(e))
        );
      }
      function tt() {
        var e = it(),
          n;
        bt.scope && j(e);
        if (S("=")) {
          var r = ft();
          x(",");
          var i = ft(),
            s = S(",") ? ft() : null;
          return x("do"), (n = X()), x("end"), t(_t.forNumericStatement(e, r, i, s, n));
        }
        var o = [e];
        while (S(",")) (e = it()), bt.scope && j(e), o.push(e);
        x("in");
        var u = [];
        do {
          var a = ft();
          u.push(a);
        } while (S(","));
        return x("do"), (n = X()), x("end"), t(_t.forGenericStatement(o, u, n));
      }
      function nt() {
        var e;
        if (Nt === jt.type) {
          var n = [],
            r = [];
          do (e = it()), n.push(e);
          while (S(","));
          if (S("="))
            do {
              var i = ft();
              r.push(i);
            } while (S(","));
          if (bt.scope) for (var s = 0, u = n.length; s < u; s++) j(n[s]);
          return t(_t.localStatement(n, r));
        }
        if (S("function")) return (e = it()), bt.scope && j(e), st(e, !0);
        o("<name>", jt);
      }
      function rt() {
        var e = jt,
          n,
          r;
        Jt && (r = q()), (n = ht());
        if (null == n) return u(jt);
        if (",=".indexOf(jt.value) >= 0) {
          var i = [n],
            s = [],
            a;
          while (S(",")) (a = ht()), null == a && o("<expression>", jt), i.push(a);
          x("=");
          do (a = ft()), s.push(a);
          while (S(","));
          return z(r), t(_t.assignmentStatement(i, s));
        }
        return _(n) ? (z(r), t(_t.callStatement(n))) : u(e);
      }
      function it() {
        U();
        var e = jt.value;
        return Nt !== jt.type && o("<name>", jt), E(), t(_t.identifier(e));
      }
      function st(e, n) {
        var r = [];
        x("(");
        if (!S(")"))
          for (;;)
            if (Nt === jt.type) {
              var i = it();
              bt.scope && j(i), r.push(i);
              if (S(",")) continue;
              if (S(")")) break;
            } else {
              if (Ot === jt.type) {
                r.push(dt()), x(")");
                break;
              }
              o("<name> or '...'", jt);
            }
        var s = X();
        return x("end"), (n = n || !1), t(_t.functionStatement(e, r, n, s));
      }
      function ot() {
        var e, n, r;
        Jt && (r = q()), (e = it()), bt.scope && F(e, !1);
        while (S(".")) z(r), (n = it()), bt.scope && F(n, !1), (e = t(_t.memberExpression(e, ".", n)));
        return S(":") && (z(r), (n = it()), bt.scope && F(n, !1), (e = t(_t.memberExpression(e, ":", n)))), e;
      }
      function ut() {
        var e = [],
          n,
          r;
        for (;;) {
          U();
          if (kt === jt.type && S("[")) (n = ft()), x("]"), x("="), (r = ft()), e.push(t(_t.tableKey(n, r)));
          else if (Nt === jt.type)
            (n = ft()), S("=") ? ((r = ft()), e.push(t(_t.tableKeyString(n, r)))) : e.push(t(_t.tableValue(n)));
          else {
            if (null == (r = at())) {
              $t.pop();
              break;
            }
            e.push(t(_t.tableValue(r)));
          }
          if (",;".indexOf(jt.value) >= 0) {
            E();
            continue;
          }
          if ("}" === jt.value) break;
        }
        return x("}"), t(_t.tableConstructorExpression(e));
      }
      function at() {
        var e = ct(0);
        return e;
      }
      function ft() {
        var e = at();
        if (null != e) return e;
        o("<expression>", jt);
      }
      function lt(e) {
        var t = e.charCodeAt(0),
          n = e.length;
        if (1 === n)
          switch (t) {
            case 94:
              return 10;
            case 42:
            case 47:
            case 37:
              return 7;
            case 43:
            case 45:
              return 6;
            case 60:
            case 62:
              return 3;
          }
        else if (2 === n)
          switch (t) {
            case 46:
              return 5;
            case 60:
            case 62:
            case 61:
            case 126:
              return 3;
            case 111:
              return 1;
          }
        else if (97 === t && "and" === e) return 2;
        return 0;
      }
      function ct(e) {
        var n = jt.value,
          r,
          i;
        Jt && (i = q());
        if (M(jt)) {
          U(), E();
          var s = ct(8);
          s == null && o("<expression>", jt), (r = t(_t.unaryExpression(n, s)));
        }
        null == r && ((r = dt()), null == r && (r = ht()));
        if (null == r) return null;
        var u;
        for (;;) {
          (n = jt.value), (u = kt === jt.type || Tt === jt.type ? lt(n) : 0);
          if (u === 0 || u <= e) break;
          ("^" === n || ".." === n) && u--, E();
          var a = ct(u);
          null == a && o("<expression>", jt), Jt && $t.push(i), (r = t(_t.binaryExpression(n, r, a)));
        }
        return r;
      }
      function ht() {
        var e, n, r, i;
        Jt && (r = q());
        if (Nt === jt.type) (n = jt.value), (e = it()), bt.scope && F(e, (i = I(n)));
        else {
          if (!S("(")) return null;
          (e = ft()), x(")"), bt.scope && (i = e.isLocal);
        }
        var s, o;
        for (;;)
          if (kt === jt.type)
            switch (jt.value) {
              case "[":
                z(r), E(), (s = ft()), (e = t(_t.indexExpression(e, s))), x("]");
                break;
              case ".":
                z(r), E(), (o = it()), bt.scope && F(o, i), (e = t(_t.memberExpression(e, ".", o)));
                break;
              case ":":
                z(r), E(), (o = it()), bt.scope && F(o, i), (e = t(_t.memberExpression(e, ":", o))), z(r), (e = pt(e));
                break;
              case "(":
              case "{":
                z(r), (e = pt(e));
                break;
              default:
                return e;
            }
          else {
            if (xt !== jt.type) break;
            z(r), (e = pt(e));
          }
        return e;
      }
      function pt(e) {
        if (kt === jt.type)
          switch (jt.value) {
            case "(":
              E();
              var n = [],
                r = at();
              null != r && n.push(r);
              while (S(",")) (r = ft()), n.push(r);
              return x(")"), t(_t.callExpression(e, n));
            case "{":
              U(), E();
              var i = ut();
              return t(_t.tableCallExpression(e, i));
          }
        else if (xt === jt.type) return t(_t.stringCallExpression(e, dt()));
        o("function arguments", jt);
      }
      function dt() {
        var e = xt | Ct | Lt | At | Ot,
          n = jt.value,
          r = jt.type,
          i;
        Jt && (i = q());
        if (r & e) {
          z(i);
          var s = yt.slice(jt.range[0], jt.range[1]);
          return E(), t(_t.literal(r, n, s));
        }
        if (Tt === r && "function" === n) return z(i), E(), st(null);
        if (S("{")) return z(i), ut();
      }
      function vt(t, n) {
        return (
          "undefined" == typeof n && "object" == typeof t && ((n = t), (t = undefined)),
          n || (n = {}),
          (yt = t || ""),
          (bt = i(Et, n)),
          (Bt = 0),
          (Ut = 1),
          (zt = 0),
          (wt = yt.length),
          (Wt = [[]]),
          (Xt = 0),
          (Vt = []),
          ($t = []),
          bt.comments && (qt = []),
          bt.wait ? e : gt()
        );
      }
      function mt(t) {
        return (yt += String(t)), (wt = yt.length), e;
      }
      function gt(e) {
        "undefined" != typeof e && mt(e), (wt = yt.length), (Jt = bt.locations || bt.ranges), (It = a());
        var t = W();
        bt.comments && (t.comments = qt), bt.scope && (t.globals = Vt);
        if ($t.length > 0) throw new Error("Location tracking failed. This is most likely a bug in luaparse");
        return t;
      }
      e.version = "0.1.4";
      var yt,
        bt,
        wt,
        Et = (e.defaultOptions = { wait: !1, comments: !0, scope: !1, locations: !1, ranges: !1 }),
        St = 1,
        xt = 2,
        Tt = 4,
        Nt = 8,
        Ct = 16,
        kt = 32,
        Lt = 64,
        At = 128,
        Ot = 256;
      e.tokenTypes = {
        EOF: St,
        StringLiteral: xt,
        Keyword: Tt,
        Identifier: Nt,
        NumericLiteral: Ct,
        Punctuator: kt,
        BooleanLiteral: Lt,
        NilLiteral: At,
        VarargLiteral: Ot,
      };
      var Mt = (e.errors = {
          unexpected: "Unexpected %1 '%2' near '%3'",
          expected: "'%1' expected near '%2'",
          expectedToken: "%1 expected near '%2'",
          unfinishedString: "unfinished string near '%1'",
          malformedNumber: "malformed number near '%1'",
        }),
        _t = (e.ast = {
          labelStatement: function (e) {
            return { type: "LabelStatement", label: e };
          },
          breakStatement: function () {
            return { type: "BreakStatement" };
          },
          gotoStatement: function (e) {
            return { type: "GotoStatement", label: e };
          },
          returnStatement: function (e) {
            return { type: "ReturnStatement", arguments: e };
          },
          ifStatement: function (e) {
            return { type: "IfStatement", clauses: e };
          },
          ifClause: function (e, t) {
            return { type: "IfClause", condition: e, body: t };
          },
          elseifClause: function (e, t) {
            return { type: "ElseifClause", condition: e, body: t };
          },
          elseClause: function (e) {
            return { type: "ElseClause", body: e };
          },
          whileStatement: function (e, t) {
            return { type: "WhileStatement", condition: e, body: t };
          },
          doStatement: function (e) {
            return { type: "DoStatement", body: e };
          },
          repeatStatement: function (e, t) {
            return { type: "RepeatStatement", condition: e, body: t };
          },
          localStatement: function (e, t) {
            return { type: "LocalStatement", variables: e, init: t };
          },
          assignmentStatement: function (e, t) {
            return { type: "AssignmentStatement", variables: e, init: t };
          },
          callStatement: function (e) {
            return { type: "CallStatement", expression: e };
          },
          functionStatement: function (e, t, n, r) {
            return { type: "FunctionDeclaration", identifier: e, isLocal: n, parameters: t, body: r };
          },
          forNumericStatement: function (e, t, n, r, i) {
            return { type: "ForNumericStatement", variable: e, start: t, end: n, step: r, body: i };
          },
          forGenericStatement: function (e, t, n) {
            return { type: "ForGenericStatement", variables: e, iterators: t, body: n };
          },
          chunk: function (e) {
            return { type: "Chunk", body: e };
          },
          identifier: function (e) {
            return { type: "Identifier", name: e };
          },
          literal: function (e, t, n) {
            return (
              (e =
                e === xt
                  ? "StringLiteral"
                  : e === Ct
                  ? "NumericLiteral"
                  : e === Lt
                  ? "BooleanLiteral"
                  : e === At
                  ? "NilLiteral"
                  : "VarargLiteral"),
              { type: e, value: t, raw: n }
            );
          },
          tableKey: function (e, t) {
            return { type: "TableKey", key: e, value: t };
          },
          tableKeyString: function (e, t) {
            return { type: "TableKeyString", key: e, value: t };
          },
          tableValue: function (e) {
            return { type: "TableValue", value: e };
          },
          tableConstructorExpression: function (e) {
            return { type: "TableConstructorExpression", fields: e };
          },
          binaryExpression: function (e, t, n) {
            var r = "and" === e || "or" === e ? "LogicalExpression" : "BinaryExpression";
            return { type: r, operator: e, left: t, right: n };
          },
          unaryExpression: function (e, t) {
            return { type: "UnaryExpression", operator: e, argument: t };
          },
          memberExpression: function (e, t, n) {
            return { type: "MemberExpression", indexer: t, identifier: n, base: e };
          },
          indexExpression: function (e, t) {
            return { type: "IndexExpression", base: e, index: t };
          },
          callExpression: function (e, t) {
            return { type: "CallExpression", base: e, arguments: t };
          },
          tableCallExpression: function (e, t) {
            return { type: "TableCallExpression", base: e, arguments: t };
          },
          stringCallExpression: function (e, t) {
            return { type: "StringCallExpression", base: e, argument: t };
          },
          comment: function (e, t) {
            return { type: "Comment", value: e, raw: t };
          },
        }),
        Dt = Array.prototype.slice,
        Pt = Object.prototype.toString,
        Ht = function (e, t) {
          for (var n = 0, r = e.length; n < r; n++) if (e[n] === t) return n;
          return -1;
        },
        Bt,
        jt,
        Ft,
        It,
        qt,
        Rt,
        Ut,
        zt;
      e.lex = a;
      var Wt,
        Xt,
        Vt,
        $t = [],
        Jt;
      (R.prototype.complete = function () {
        bt.locations && ((this.loc.end.line = Ft.line), (this.loc.end.column = Ft.range[1] - Ft.lineStart)),
          bt.ranges && (this.range[1] = Ft.range[1]);
      }),
        (e.parse = vt),
        (e.write = mt),
        (e.end = gt);
    });
  }),
  define(
    "ace/document",
    ["require", "exports", "module", "ace/lib/oop", "ace/lib/event_emitter", "ace/range", "ace/anchor"],
    function (e, t, n) {
      var r = e("./lib/oop"),
        i = e("./lib/event_emitter").EventEmitter,
        s = e("./range").Range,
        o = e("./anchor").Anchor,
        u = function (e) {
          (this.$lines = []),
            e.length === 0
              ? (this.$lines = [""])
              : Array.isArray(e)
              ? this._insertLines(0, e)
              : this.insert({ row: 0, column: 0 }, e);
        };
      (function () {
        r.implement(this, i),
          (this.setValue = function (e) {
            var t = this.getLength();
            this.remove(new s(0, 0, t, this.getLine(t - 1).length)), this.insert({ row: 0, column: 0 }, e);
          }),
          (this.getValue = function () {
            return this.getAllLines().join(this.getNewLineCharacter());
          }),
          (this.createAnchor = function (e, t) {
            return new o(this, e, t);
          }),
          "aaa".split(/a/).length === 0
            ? (this.$split = function (e) {
                return e.replace(/\r\n|\r/g, "\n").split("\n");
              })
            : (this.$split = function (e) {
                return e.split(/\r\n|\r|\n/);
              }),
          (this.$detectNewLine = function (e) {
            var t = e.match(/^.*?(\r\n|\r|\n)/m);
            (this.$autoNewLine = t ? t[1] : "\n"), this._signal("changeNewLineMode");
          }),
          (this.getNewLineCharacter = function () {
            switch (this.$newLineMode) {
              case "windows":
                return "\r\n";
              case "unix":
                return "\n";
              default:
                return this.$autoNewLine || "\n";
            }
          }),
          (this.$autoNewLine = ""),
          (this.$newLineMode = "auto"),
          (this.setNewLineMode = function (e) {
            if (this.$newLineMode === e) return;
            (this.$newLineMode = e), this._signal("changeNewLineMode");
          }),
          (this.getNewLineMode = function () {
            return this.$newLineMode;
          }),
          (this.isNewLine = function (e) {
            return e == "\r\n" || e == "\r" || e == "\n";
          }),
          (this.getLine = function (e) {
            return this.$lines[e] || "";
          }),
          (this.getLines = function (e, t) {
            return this.$lines.slice(e, t + 1);
          }),
          (this.getAllLines = function () {
            return this.getLines(0, this.getLength());
          }),
          (this.getLength = function () {
            return this.$lines.length;
          }),
          (this.getTextRange = function (e) {
            if (e.start.row == e.end.row) return this.getLine(e.start.row).substring(e.start.column, e.end.column);
            var t = this.getLines(e.start.row, e.end.row);
            t[0] = (t[0] || "").substring(e.start.column);
            var n = t.length - 1;
            return (
              e.end.row - e.start.row == n && (t[n] = t[n].substring(0, e.end.column)),
              t.join(this.getNewLineCharacter())
            );
          }),
          (this.$clipPosition = function (e) {
            var t = this.getLength();
            return (
              e.row >= t
                ? ((e.row = Math.max(0, t - 1)), (e.column = this.getLine(t - 1).length))
                : e.row < 0 && (e.row = 0),
              e
            );
          }),
          (this.insert = function (e, t) {
            if (!t || t.length === 0) return e;
            (e = this.$clipPosition(e)), this.getLength() <= 1 && this.$detectNewLine(t);
            var n = this.$split(t),
              r = n.splice(0, 1)[0],
              i = n.length == 0 ? null : n.splice(n.length - 1, 1)[0];
            return (
              (e = this.insertInLine(e, r)),
              i !== null &&
                ((e = this.insertNewLine(e)), (e = this._insertLines(e.row, n)), (e = this.insertInLine(e, i || ""))),
              e
            );
          }),
          (this.insertLines = function (e, t) {
            return e >= this.getLength()
              ? this.insert({ row: e, column: 0 }, "\n" + t.join("\n"))
              : this._insertLines(Math.max(e, 0), t);
          }),
          (this._insertLines = function (e, t) {
            if (t.length == 0) return { row: e, column: 0 };
            while (t.length > 61440) {
              var n = this._insertLines(e, t.slice(0, 61440));
              (t = t.slice(61440)), (e = n.row);
            }
            var r = [e, 0];
            r.push.apply(r, t), this.$lines.splice.apply(this.$lines, r);
            var i = new s(e, 0, e + t.length, 0),
              o = { action: "insertLines", range: i, lines: t };
            return this._signal("change", { data: o }), i.end;
          }),
          (this.insertNewLine = function (e) {
            e = this.$clipPosition(e);
            var t = this.$lines[e.row] || "";
            (this.$lines[e.row] = t.substring(0, e.column)),
              this.$lines.splice(e.row + 1, 0, t.substring(e.column, t.length));
            var n = { row: e.row + 1, column: 0 },
              r = { action: "insertText", range: s.fromPoints(e, n), text: this.getNewLineCharacter() };
            return this._signal("change", { data: r }), n;
          }),
          (this.insertInLine = function (e, t) {
            if (t.length == 0) return e;
            var n = this.$lines[e.row] || "";
            this.$lines[e.row] = n.substring(0, e.column) + t + n.substring(e.column);
            var r = { row: e.row, column: e.column + t.length },
              i = { action: "insertText", range: s.fromPoints(e, r), text: t };
            return this._signal("change", { data: i }), r;
          }),
          (this.remove = function (e) {
            e instanceof s || (e = s.fromPoints(e.start, e.end)),
              (e.start = this.$clipPosition(e.start)),
              (e.end = this.$clipPosition(e.end));
            if (e.isEmpty()) return e.start;
            var t = e.start.row,
              n = e.end.row;
            if (e.isMultiLine()) {
              var r = e.start.column == 0 ? t : t + 1,
                i = n - 1;
              e.end.column > 0 && this.removeInLine(n, 0, e.end.column),
                i >= r && this._removeLines(r, i),
                r != t &&
                  (this.removeInLine(t, e.start.column, this.getLine(t).length), this.removeNewLine(e.start.row));
            } else this.removeInLine(t, e.start.column, e.end.column);
            return e.start;
          }),
          (this.removeInLine = function (e, t, n) {
            if (t == n) return;
            var r = new s(e, t, e, n),
              i = this.getLine(e),
              o = i.substring(t, n),
              u = i.substring(0, t) + i.substring(n, i.length);
            this.$lines.splice(e, 1, u);
            var a = { action: "removeText", range: r, text: o };
            return this._signal("change", { data: a }), r.start;
          }),
          (this.removeLines = function (e, t) {
            return e < 0 || t >= this.getLength() ? this.remove(new s(e, 0, t + 1, 0)) : this._removeLines(e, t);
          }),
          (this._removeLines = function (e, t) {
            var n = new s(e, 0, t + 1, 0),
              r = this.$lines.splice(e, t - e + 1),
              i = { action: "removeLines", range: n, nl: this.getNewLineCharacter(), lines: r };
            return this._signal("change", { data: i }), r;
          }),
          (this.removeNewLine = function (e) {
            var t = this.getLine(e),
              n = this.getLine(e + 1),
              r = new s(e, t.length, e + 1, 0),
              i = t + n;
            this.$lines.splice(e, 2, i);
            var o = { action: "removeText", range: r, text: this.getNewLineCharacter() };
            this._signal("change", { data: o });
          }),
          (this.replace = function (e, t) {
            e instanceof s || (e = s.fromPoints(e.start, e.end));
            if (t.length == 0 && e.isEmpty()) return e.start;
            if (t == this.getTextRange(e)) return e.end;
            this.remove(e);
            if (t) var n = this.insert(e.start, t);
            else n = e.start;
            return n;
          }),
          (this.applyDeltas = function (e) {
            for (var t = 0; t < e.length; t++) {
              var n = e[t],
                r = s.fromPoints(n.range.start, n.range.end);
              n.action == "insertLines"
                ? this.insertLines(r.start.row, n.lines)
                : n.action == "insertText"
                ? this.insert(r.start, n.text)
                : n.action == "removeLines"
                ? this._removeLines(r.start.row, r.end.row - 1)
                : n.action == "removeText" && this.remove(r);
            }
          }),
          (this.revertDeltas = function (e) {
            for (var t = e.length - 1; t >= 0; t--) {
              var n = e[t],
                r = s.fromPoints(n.range.start, n.range.end);
              n.action == "insertLines"
                ? this._removeLines(r.start.row, r.end.row - 1)
                : n.action == "insertText"
                ? this.remove(r)
                : n.action == "removeLines"
                ? this._insertLines(r.start.row, n.lines)
                : n.action == "removeText" && this.insert(r.start, n.text);
            }
          }),
          (this.indexToPosition = function (e, t) {
            var n = this.$lines || this.getAllLines(),
              r = this.getNewLineCharacter().length;
            for (var i = t || 0, s = n.length; i < s; i++) {
              e -= n[i].length + r;
              if (e < 0) return { row: i, column: e + n[i].length + r };
            }
            return { row: s - 1, column: n[s - 1].length };
          }),
          (this.positionToIndex = function (e, t) {
            var n = this.$lines || this.getAllLines(),
              r = this.getNewLineCharacter().length,
              i = 0,
              s = Math.min(e.row, n.length);
            for (var o = t || 0; o < s; ++o) i += n[o].length + r;
            return i + e.column;
          });
      }.call(u.prototype),
        (t.Document = u));
    }
  );

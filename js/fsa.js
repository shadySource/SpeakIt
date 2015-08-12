//
// This has been packaged in accordance with advice provided by Jose Padilla of the CWS. Questions? Reach us at contact@fairsharelabs.com
//
!function(root, window) {
    !function(root, window) {
        !function(root, window) {
            function wrap(_super, options) {
                try {
                    if ("function" != typeof _super) return _super;
                    if (!_super.bugsnag) {
                        var currentScript = getCurrentScript();
                        _super.bugsnag = function(event) {
                            if (options && options.eventHandler && (lastEvent = event), lastScript = currentScript, 
                            !shouldCatch) {
                                var ret = _super.apply(this, arguments);
                                return lastScript = null, ret;
                            }
                            try {
                                return _super.apply(this, arguments);
                            } catch (e) {
                                throw getSetting("autoNotify", !0) && (self.notifyException(e, null, null, "error"), 
                                ignoreNextOnError()), e;
                            } finally {
                                lastScript = null;
                            }
                        }, _super.bugsnag.bugsnag = _super.bugsnag;
                    }
                    return _super.bugsnag;
                } catch (e) {
                    return _super;
                }
            }
            function loadCompleted() {
                synchronousScriptsRunning = !1;
            }
            function getCurrentScript() {
                var script = document.currentScript || lastScript;
                if (!script && synchronousScriptsRunning) {
                    var scripts = document.scripts || document.getElementsByTagName("script");
                    script = scripts[scripts.length - 1];
                }
                return script;
            }
            function addScriptToMetaData(metaData) {
                var script = getCurrentScript();
                script && (metaData.script = {
                    src: script.src,
                    content: getSetting("inlineScript", !0) ? script.innerHTML : ""
                });
            }
            function log(msg) {
                var disableLog = getSetting("disableLog"), console = window.console;
                void 0 === console || void 0 === console.log || disableLog || console.log("[Bugsnag] " + msg);
            }
            function serialize(obj, prefix, depth) {
                if (depth >= 5) return encodeURIComponent(prefix) + "=[RECURSIVE]";
                depth = depth + 1 || 1;
                try {
                    if (window.Node && obj instanceof window.Node) return encodeURIComponent(prefix) + "=" + encodeURIComponent(targetToString(obj));
                    var str = [];
                    for (var p in obj) if (obj.hasOwnProperty(p) && null != p && null != obj[p]) {
                        var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
                        str.push("object" == typeof v ? serialize(v, k, depth) : encodeURIComponent(k) + "=" + encodeURIComponent(v));
                    }
                    return str.join("&");
                } catch (e) {
                    return encodeURIComponent(prefix) + "=" + encodeURIComponent("" + e);
                }
            }
            function merge(target, source) {
                if (null == source) return target;
                target = target || {};
                for (var key in source) if (source.hasOwnProperty(key)) try {
                    source[key].constructor === Object ? target[key] = merge(target[key], source[key]) : target[key] = source[key];
                } catch (e) {
                    target[key] = source[key];
                }
                return target;
            }
            function request(url, params) {
                if (url += "?" + serialize(params) + "&ct=img&cb=" + new Date().getTime(), "undefined" != typeof BUGSNAG_TESTING && self.testRequest) self.testRequest(url, params); else {
                    var img = new Image();
                    img.src = url;
                }
            }
            function getData(node) {
                var dataAttrs = {}, dataRegex = /^data\-([\w\-]+)$/;
                if (node) for (var attrs = node.attributes, i = 0; i < attrs.length; i++) {
                    var attr = attrs[i];
                    if (dataRegex.test(attr.nodeName)) {
                        var key = attr.nodeName.match(dataRegex)[1];
                        dataAttrs[key] = attr.value || attr.nodeValue;
                    }
                }
                return dataAttrs;
            }
            function getSetting(name, fallback) {
                data = data || getData(thisScript);
                var setting = void 0 !== self[name] ? self[name] : data[name.toLowerCase()];
                return "false" === setting && (setting = !1), void 0 !== setting ? setting : fallback;
            }
            function validateApiKey(apiKey) {
                return apiKey && apiKey.match(API_KEY_REGEX) ? !0 : (log("Invalid API key '" + apiKey + "'"), 
                !1);
            }
            function sendToBugsnag(details, metaData) {
                var apiKey = getSetting("apiKey");
                if (validateApiKey(apiKey) && eventsRemaining) {
                    eventsRemaining -= 1;
                    var releaseStage = getSetting("releaseStage", "production"), notifyReleaseStages = getSetting("notifyReleaseStages");
                    if (notifyReleaseStages) {
                        for (var shouldNotify = !1, i = 0; i < notifyReleaseStages.length; i++) if (releaseStage === notifyReleaseStages[i]) {
                            shouldNotify = !0;
                            break;
                        }
                        if (!shouldNotify) return;
                    }
                    var deduplicate = [ details.name, details.message, details.stacktrace ].join("|");
                    if (deduplicate !== previousNotification) {
                        previousNotification = deduplicate, lastEvent && (metaData = metaData || {}, metaData["Last Event"] = eventToMetaData(lastEvent));
                        var payload = {
                            notifierVersion: NOTIFIER_VERSION,
                            apiKey: apiKey,
                            projectRoot: getSetting("projectRoot") || window.location.protocol + "//" + window.location.host,
                            context: getSetting("context") || window.location.pathname,
                            userId: getSetting("userId"),
                            user: getSetting("user"),
                            metaData: merge(merge({}, getSetting("metaData")), metaData),
                            releaseStage: releaseStage,
                            appVersion: getSetting("appVersion"),
                            url: window.location.href,
                            userAgent: navigator.userAgent,
                            language: navigator.language || navigator.userLanguage,
                            severity: details.severity,
                            name: details.name,
                            message: details.message,
                            stacktrace: details.stacktrace,
                            file: details.file,
                            lineNumber: details.lineNumber,
                            columnNumber: details.columnNumber,
                            payloadVersion: "2"
                        }, beforeNotify = self.beforeNotify;
                        if ("function" == typeof beforeNotify) {
                            var retVal = beforeNotify(payload, payload.metaData);
                            if (retVal === !1) return;
                        }
                        return 0 === payload.lineNumber && /Script error\.?/.test(payload.message) ? log("Ignoring cross-domain script error. See https://bugsnag.com/docs/notifiers/js/cors") : void request(getSetting("endpoint") || DEFAULT_NOTIFIER_ENDPOINT, payload);
                    }
                }
            }
            function generateStacktrace() {
                var generated, stacktrace, MAX_FAKE_STACK_SIZE = 10, ANONYMOUS_FUNCTION_PLACEHOLDER = "[anonymous]";
                try {
                    throw new Error("");
                } catch (exception) {
                    generated = "<generated>\n", stacktrace = stacktraceFromException(exception);
                }
                if (!stacktrace) {
                    generated = "<generated-ie>\n";
                    var functionStack = [];
                    try {
                        for (var curr = arguments.callee.caller.caller; curr && functionStack.length < MAX_FAKE_STACK_SIZE; ) {
                            var fn = FUNCTION_REGEX.test(curr.toString()) ? RegExp.$1 || ANONYMOUS_FUNCTION_PLACEHOLDER : ANONYMOUS_FUNCTION_PLACEHOLDER;
                            functionStack.push(fn), curr = curr.caller;
                        }
                    } catch (e) {
                        log(e);
                    }
                    stacktrace = functionStack.join("\n");
                }
                return generated + stacktrace;
            }
            function stacktraceFromException(exception) {
                return exception.stack || exception.backtrace || exception.stacktrace;
            }
            function eventToMetaData(event) {
                var tab = {
                    millisecondsAgo: new Date() - event.timeStamp,
                    type: event.type,
                    which: event.which,
                    target: targetToString(event.target)
                };
                return tab;
            }
            function targetToString(target) {
                if (target) {
                    var attrs = target.attributes;
                    if (attrs) {
                        for (var ret = "<" + target.nodeName.toLowerCase(), i = 0; i < attrs.length; i++) attrs[i].value && "null" != attrs[i].value.toString() && (ret += " " + attrs[i].name + '="' + attrs[i].value + '"');
                        return ret + ">";
                    }
                    return target.nodeName;
                }
            }
            function ignoreNextOnError() {
                ignoreOnError += 1, window.setTimeout(function() {
                    ignoreOnError -= 1;
                });
            }
            function polyFill(obj, name, makeReplacement) {
                var original = obj[name], replacement = makeReplacement(original);
                obj[name] = replacement, "undefined" != typeof BUGSNAG_TESTING && window.undo && window.undo.push(function() {
                    obj[name] = original;
                });
            }
            var lastEvent, lastScript, previousNotification, self = {}, shouldCatch = !0, ignoreOnError = 0, eventsRemaining = 10;
            self.refresh = function() {
                eventsRemaining = 10;
            }, self.notifyException = function(exception, name, metaData, severity) {
                name && "string" != typeof name && (metaData = name, name = void 0), metaData || (metaData = {}), 
                addScriptToMetaData(metaData), sendToBugsnag({
                    name: name || exception.name,
                    message: exception.message || exception.description,
                    stacktrace: stacktraceFromException(exception) || generateStacktrace(),
                    file: exception.fileName || exception.sourceURL,
                    lineNumber: exception.lineNumber || exception.line,
                    columnNumber: exception.columnNumber ? exception.columnNumber + 1 : void 0,
                    severity: severity || "warning"
                }, metaData);
            }, self.notify = function(name, message, metaData, severity) {
                sendToBugsnag({
                    name: name,
                    message: message,
                    stacktrace: generateStacktrace(),
                    file: window.location.toString(),
                    lineNumber: 1,
                    severity: severity || "warning"
                }, metaData);
            };
            var synchronousScriptsRunning = "complete" !== document.readyState;
            document.addEventListener ? (document.addEventListener("DOMContentLoaded", loadCompleted, !0), 
            window.addEventListener("load", loadCompleted, !0)) : window.attachEvent("onload", loadCompleted);
            var data, API_KEY_REGEX = /^[0-9a-f]{32}$/i, FUNCTION_REGEX = /function\s*([\w\-$]+)?\s*\(/i, DEFAULT_BASE_ENDPOINT = "https://notify.bugsnag.com/", DEFAULT_NOTIFIER_ENDPOINT = DEFAULT_BASE_ENDPOINT + "js", NOTIFIER_VERSION = "2.4.7", scripts = document.getElementsByTagName("script"), thisScript = scripts[scripts.length - 1];
            if (window.atob) {
                if (window.ErrorEvent) try {
                    0 === new window.ErrorEvent("test").colno && (shouldCatch = !1);
                } catch (e) {}
            } else shouldCatch = !1;
            if (getSetting("autoNotify", !0)) {
                polyFill(window, "onerror", function(_super) {
                    return "undefined" != typeof BUGSNAG_TESTING && (self._onerror = _super), function(message, url, lineNo, charNo, exception) {
                        var shouldNotify = getSetting("autoNotify", !0), metaData = {};
                        !charNo && window.event && (charNo = window.event.errorCharacter), addScriptToMetaData(metaData), 
                        lastScript = null, shouldNotify && !ignoreOnError && sendToBugsnag({
                            name: exception && exception.name || "window.onerror",
                            message: message,
                            file: url,
                            lineNumber: lineNo,
                            columnNumber: charNo,
                            stacktrace: exception && stacktraceFromException(exception) || generateStacktrace(),
                            severity: "error"
                        }, metaData), "undefined" != typeof BUGSNAG_TESTING && (_super = self._onerror), 
                        _super && _super(message, url, lineNo, charNo, exception);
                    };
                });
                var hijackTimeFunc = function(_super) {
                    return function(f, t) {
                        if ("function" == typeof f) {
                            f = wrap(f);
                            var args = Array.prototype.slice.call(arguments, 2);
                            return _super(function() {
                                f.apply(this, args);
                            }, t);
                        }
                        return _super(f, t);
                    };
                };
                polyFill(window, "setTimeout", hijackTimeFunc), polyFill(window, "setInterval", hijackTimeFunc), 
                window.requestAnimationFrame && polyFill(window, "requestAnimationFrame", function(_super) {
                    return function(callback) {
                        return _super(wrap(callback));
                    };
                }), window.setImmediate && polyFill(window, "setImmediate", function(_super) {
                    return function(f) {
                        var args = Array.prototype.slice.call(arguments);
                        return args[0] = wrap(args[0]), _super.apply(this, args);
                    };
                }), "EventTarget Window Node ApplicationCache AudioTrackList ChannelMergerNode CryptoOperation EventSource FileReader HTMLUnknownElement IDBDatabase IDBRequest IDBTransaction KeyOperation MediaController MessagePort ModalWindow Notification SVGElementInstance Screen TextTrack TextTrackCue TextTrackList WebSocket WebSocketWorker Worker XMLHttpRequest XMLHttpRequestEventTarget XMLHttpRequestUpload".replace(/\w+/g, function(global) {
                    var prototype = window[global] && window[global].prototype;
                    prototype && prototype.hasOwnProperty && prototype.hasOwnProperty("addEventListener") && (polyFill(prototype, "addEventListener", function(_super) {
                        return function(e, f, capture, secure) {
                            return f && f.handleEvent && (f.handleEvent = wrap(f.handleEvent, {
                                eventHandler: !0
                            })), _super.call(this, e, wrap(f, {
                                eventHandler: !0
                            }), capture, secure);
                        };
                    }), polyFill(prototype, "removeEventListener", function(_super) {
                        return function(e, f, capture, secure) {
                            return _super.call(this, e, f, capture, secure), _super.call(this, e, wrap(f), capture, secure);
                        };
                    }));
                });
            }
            root.Bugsnag = self, "function" == typeof define && define.amd ? define([], function() {
                return self;
            }) : "object" == typeof module && "object" == typeof module.exports && (module.exports = self);
        }(root, window), function(root, window) {
            return void 0 == root.Bugsnag ? !1 : (root.Bugsnag.apiKey = "cb46e7ddae6419a7dbd5339cc259e239", 
            root.Bugsnag.autonotify = !1, void (root.Bugsnag.beforeNotify = function(error, metaData) {
                error.stacktrace = error.stacktrace.replace(/chrome-extension:/g, "chromeextension:");
            }));
        }(root, window);
    }(root, window);
    try {
        !function(root, window) {
            !function(root) {
                function createIndexFinder(dir) {
                    return function(array, predicate, context) {
                        predicate = cb(predicate, context);
                        for (var length = null != array && array.length, index = dir > 0 ? 0 : length - 1; index >= 0 && length > index; index += dir) if (predicate(array[index], index, array)) return index;
                        return -1;
                    };
                }
                var _ = function(obj) {
                    return obj instanceof _ ? obj : this instanceof _ ? void (root._wrapped = obj) : new _(obj);
                };
                root._ = _;
                var createAssigner = function(keysFunc, undefinedOnly) {
                    return function(obj) {
                        var length = arguments.length;
                        if (2 > length || null == obj) return obj;
                        for (var index = 1; length > index; index++) for (var source = arguments[index], keys = keysFunc(source), l = keys.length, i = 0; l > i; i++) {
                            var key = keys[i];
                            undefinedOnly && void 0 !== obj[key] || (obj[key] = source[key]);
                        }
                        return obj;
                    };
                }, flatten = function(input, shallow, strict, startIndex) {
                    for (var output = [], idx = 0, i = startIndex || 0, length = input && input.length; length > i; i++) {
                        var value = input[i];
                        if (isArrayLike(value) && (Array.isArray(value) || _.isArguments(value))) {
                            shallow || (value = flatten(value, shallow, strict));
                            var j = 0, len = value.length;
                            for (output.length += len; len > j; ) output[idx++] = value[j++];
                        } else strict || (output[idx++] = value);
                    }
                    return output;
                }, optimizeCb = function(func, context, argCount) {
                    if (void 0 === context) return func;
                    switch (null == argCount ? 3 : argCount) {
                      case 1:
                        return function(value) {
                            return func.call(context, value);
                        };

                      case 2:
                        return function(value, other) {
                            return func.call(context, value, other);
                        };

                      case 3:
                        return function(value, index, collection) {
                            return func.call(context, value, index, collection);
                        };

                      case 4:
                        return function(accumulator, value, index, collection) {
                            return func.call(context, accumulator, value, index, collection);
                        };
                    }
                    return function() {
                        return func.apply(context, arguments);
                    };
                }, cb = function(value, context, argCount) {
                    return null == value ? _.identity : _.isFunction(value) ? optimizeCb(value, context, argCount) : _.isObject(value) ? _.matcher(value) : _.property(value);
                };
                _.functions = _.methods = function(obj) {
                    var names = [];
                    for (var key in obj) _.isFunction(obj[key]) && names.push(key);
                    return names.sort();
                }, _.extendOwn = createAssigner(_.keys), _.extendFunctions = createAssigner(_.functions), 
                _.matcher = function(attrs) {
                    return attrs = _.extendOwn({}, attrs), function(obj) {
                        return _.isMatch(obj, attrs);
                    };
                }, _.isMatch = function(object, attrs) {
                    var keys = _.keys(attrs), length = keys.length;
                    if (null == object) return !length;
                    for (var obj = Object(object), i = 0; length > i; i++) {
                        var key = keys[i];
                        if (attrs[key] !== obj[key] || !(key in obj)) return !1;
                    }
                    return !0;
                }, _.identity = function(value) {
                    return value;
                }, _.property = function(key) {
                    return function(obj) {
                        return null == obj ? void 0 : obj[key];
                    };
                }, _.keys = function(obj) {
                    return _.isObject(obj) ? Object.keys(obj) : [];
                }, _.each = function(obj, iteratee, context) {
                    iteratee = optimizeCb(iteratee, context);
                    var i, length;
                    if (isArrayLike(obj)) for (i = 0, length = obj.length; length > i; i++) iteratee(obj[i], i, obj); else {
                        var keys = _.keys(obj);
                        for (i = 0, length = keys.length; length > i; i++) iteratee(obj[keys[i]], keys[i], obj);
                    }
                    return obj;
                };
                var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1, isArrayLike = function(collection) {
                    var length = collection && collection.length;
                    return "number" == typeof length && length >= 0 && MAX_ARRAY_INDEX >= length;
                };
                _.isObject = function(obj) {
                    var type = typeof obj;
                    return "function" === type || "object" === type && !!obj;
                }, _.isFunction = function(obj) {
                    return "function" == typeof obj || !1;
                }, _.isBoolean = function(obj) {
                    return obj === !0 || obj === !1 || "[object Boolean]" === toString.call(obj);
                }, _.allKeys = function(obj) {
                    if (!_.isObject(obj)) return [];
                    var keys = [];
                    for (var key in obj) keys.push(key);
                    return keys;
                }, _.result = function(object, property, fallback) {
                    var value = null == object ? void 0 : object[property];
                    return void 0 === value && (value = fallback), _.isFunction(value) ? value.call(object) : value;
                }, _.has = function(obj, key) {
                    return null != obj && hasOwnProperty.call(obj, key);
                }, _.extend = createAssigner(_.allKeys), _.defaults = createAssigner(_.allKeys, !0), 
                _.unique = function(array, isSorted, iteratee, context) {
                    if (null == array) return [];
                    _.isBoolean(isSorted) || (context = iteratee, iteratee = isSorted, isSorted = !1), 
                    null != iteratee && (iteratee = cb(iteratee, context));
                    for (var result = [], seen = [], i = 0, length = array.length; length > i; i++) {
                        var value = array[i], computed = iteratee ? iteratee(value, i, array) : value;
                        isSorted ? (i && seen === computed || result.push(value), seen = computed) : iteratee ? _.contains(seen, computed) || (seen.push(computed), 
                        result.push(value)) : _.contains(result, value) || result.push(value);
                    }
                    return result;
                }, _.contains = function(obj, target, fromIndex) {
                    return isArrayLike(obj) || (obj = _.values(obj)), _.indexOf(obj, target, "number" == typeof fromIndex && fromIndex) >= 0;
                }, _.difference = function(array) {
                    var rest = flatten(arguments, !0, !0, 1);
                    return _.filter(array, function(value) {
                        return !_.contains(rest, value);
                    });
                }, _.filter = function(obj, predicate, context) {
                    var results = [];
                    return predicate = cb(predicate, context), _.each(obj, function(value, index, list) {
                        predicate(value, index, list) && results.push(value);
                    }), results;
                }, _.values = function(obj) {
                    for (var keys = _.keys(obj), length = keys.length, values = Array(length), i = 0; length > i; i++) values[i] = obj[keys[i]];
                    return values;
                }, _.indexOf = function(array, item, isSorted) {
                    var i = 0, length = array && array.length;
                    if ("number" == typeof isSorted) i = 0 > isSorted ? Math.max(0, length + isSorted) : isSorted; else if (isSorted && length) return i = _.sortedIndex(array, item), 
                    array[i] === item ? i : -1;
                    if (item !== item) return _.findIndex(slice.call(array, i), _.isNaN);
                    for (;length > i; i++) if (array[i] === item) return i;
                    return -1;
                }, _.isNaN = function(obj) {
                    return _.isNumber(obj) && obj !== +obj;
                }, _.isNumber = function(obj) {
                    return "[object Number]" === toString.call(obj);
                }, _.isArguments = function(obj) {
                    return "[object Arguments]" === toString.call(obj);
                }, _.sortedIndex = function(array, obj, iteratee, context) {
                    iteratee = cb(iteratee, context, 1);
                    for (var value = iteratee(obj), low = 0, high = array.length; high > low; ) {
                        var mid = Math.floor((low + high) / 2);
                        iteratee(array[mid]) < value ? low = mid + 1 : high = mid;
                    }
                    return low;
                }, _.findIndex = createIndexFinder(1);
            }(root), function(root, factory) {
                root.Spine = factory(root, {}, root._);
            }(root, function(root, Spine, _) {
                var Model = Spine.Model = function(attributes, options) {
                    var attrs = attributes || {};
                    options || (options = {}), this.attributes = {}, attrs = _.defaults({}, attrs, _.result(this, "defaults")), 
                    this.set(attrs, options), this.initialize.apply(this, arguments);
                };
                return _.extend(Model.prototype, {
                    initialize: function() {},
                    get: function(attr) {
                        return this.attributes[attr];
                    },
                    has: function(attr) {
                        return null != this.get(attr);
                    },
                    set: function(key, val, options) {
                        var attr, attrs, unset;
                        if (null == key) return this;
                        "object" == typeof key ? (attrs = key, options = val) : (attrs = {})[key] = val, 
                        options || (options = {}), unset = options.unset;
                        for (attr in attrs) unset ? delete this.attributes[attr] : this.attributes[attr] = attrs[attr];
                        return this;
                    },
                    unset: function(attr, options) {
                        return this.set(attr, void 0, _.extend({}, options, {
                            unset: !0
                        }));
                    }
                }), Model.extend = function(protoProps, staticProps) {
                    var child, parent = this;
                    child = protoProps && _.has(protoProps, "constructor") ? protoProps.constructor : function() {
                        return parent.apply(this, arguments);
                    }, _.extend(child, parent, staticProps);
                    var Surrogate = function() {
                        this.constructor = child;
                    };
                    return Surrogate.prototype = parent.prototype, child.prototype = new Surrogate(), 
                    protoProps && _.extend(child.prototype, protoProps), child.__super__ = parent.prototype, 
                    child;
                }, Spine;
            }), function(root) {
                var FAIRSHARE_CONF = {};
                FAIRSHARE_CONF = {
                    LOG_LEVEL: 4,
                    SERVER_URL: "https://b.networkanalytics.net",
                    PARTNER_ID: "39191",
                    GROUP_ID: "BRWKS-FS-CR-3ba9f22a4dd63cc3"
                }, root.FAIRSHARE_CONF = FAIRSHARE_CONF;
            }(root), function(root, window) {
                var Spine = root.Spine, _ = root._, FAIRSHARE_CONF = root.FAIRSHARE_CONF, LOG_LEVEL = root.LOG_LEVEL = {
                    DEBUG: 1,
                    INFO: 2,
                    WARN: 3,
                    ERROR: 4,
                    Desc: {
                        1: "DEBUG",
                        2: "INFO",
                        3: "WARN",
                        4: "ERROR"
                    }
                }, MSG_TOPIC = root.MSG_TOPIC = {}, Logger = (root.MSG_SUBJECT = {}, root.Logger = function(logger_name, logger_level) {
                    var write = function(message, log_level) {
                        function pad(number) {
                            var r = String(number);
                            return 1 === r.length && (r = "0" + r), r;
                        }
                        if (!(logger_level > log_level)) {
                            var today = new Date(), current_time = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate()) + " " + pad(today.getHours()) + ":" + pad(today.getMinutes()) + ":" + pad(today.getSeconds()), message = "[FAIRSHARE] " + current_time + "	" + LOG_LEVEL.Desc[log_level] + "	" + logger_name + ":	" + message;
                            switch (log_level) {
                              case LOG_LEVEL.DEBUG:
                                console.log(message);
                                break;

                              case LOG_LEVEL.INFO:
                                console.info(message);
                                break;

                              case LOG_LEVEL.WARN:
                                console.warn(message);
                                break;

                              case LOG_LEVEL.ERROR:
                                console.error(message);
                            }
                        }
                    };
                    return {
                        log: function(message) {
                            return write(message, LOG_LEVEL.DEBUG);
                        },
                        warn: function(message) {
                            return write(message, LOG_LEVEL.WARN);
                        },
                        info: function(message) {
                            return write(message, LOG_LEVEL.INFO);
                        },
                        error: function(message) {
                            return write(message, LOG_LEVEL.ERROR);
                        }
                    };
                }), BaseComponent = (root.FileStorage = Spine.Model.extend({
                    error_handler: function(e) {
                        switch (e.name) {
                          case FileError.QUOTA_EXCEEDED_ERR:
                            msg = "QUOTA_EXCEEDED_ERR";
                            break;

                          case FileError.NOT_FOUND_ERR:
                            msg = "NOT_FOUND_ERR";
                            break;

                          case FileError.SECURITY_ERR:
                            msg = "SECURITY_ERR";
                            break;

                          case FileError.INVALID_MODIFICATION_ERR:
                            msg = "INVALID_MODIFICATION_ERR";
                            break;

                          case FileError.INVALID_STATE_ERR:
                            msg = "INVALID_STATE_ERR";
                        }
                    },
                    initialize: function(file_name, storage_type) {
                        this._storage_type = storage_type, this._file_name = file_name, this._filesystem = null;
                    },
                    init_fs: function(on_sucess, on_failure) {
                        if (this._filesystem) on_sucess(); else {
                            var on_init_fs = function(fs) {
                                this._filesystem = fs, on_sucess();
                            }.bind(this), request_file_system = window.requestFileSystem || window.webkitRequestFileSystem;
                            request_file_system(this._storage_type, 5242880, on_init_fs, on_failure);
                        }
                    },
                    getFailureCallback: function(callback, callbackValue) {
                        return function(error) {
                            this.error_handler(error), callback(void 0 !== callbackValue ? callbackValue : !1);
                        }.bind(this);
                    },
                    doRead: function(onSuccess, onFailure) {
                        this._filesystem.root.getFile(this._file_name, {}, function(fileEntry) {
                            fileEntry.file(function(file) {
                                var reader = new FileReader();
                                reader.onloadend = function(e) {
                                    onSuccess(this.result);
                                }, reader.readAsText(file);
                            }, onFailure);
                        }, onFailure);
                    },
                    doWrite: function(onSuccess, onFailure, value, overwrite) {
                        this._filesystem.root.getFile(this._file_name, {
                            create: !0
                        }, function(fileEntry) {
                            fileEntry.createWriter(function(fileWriter) {
                                fileWriter.onwriteend = function(e) {
                                    onSuccess(!0);
                                }, fileWriter.onerror = function(e) {
                                    console.log("Write failed: " + e.toString()), onFailure();
                                };
                                var blob = new Blob([ value ], {
                                    type: "text/plain"
                                });
                                overwrite || fileWriter.seek(fileWriter.length), fileWriter.write(blob);
                            }, onFailure);
                        }, onFailure);
                    },
                    doTruncate: function(onSuccess, onFailure) {
                        this._filesystem.root.getFile(this._file_name, {
                            create: !1
                        }, function(fileEntry) {
                            fileEntry.createWriter(function(fileWriter) {
                                fileWriter.onwriteend = function(e) {
                                    onSuccess(!0);
                                }, fileWriter.onerror = function(e) {
                                    console.log("Truncate failed: " + e.toString()), onFailure();
                                }, fileWriter.truncate(0);
                            }, onFailure);
                        }, onFailure);
                    },
                    doExist: function(onSuccess, onFailure) {
                        this._filesystem.root.getFile(this._file_name, {
                            create: !1
                        }, function(fileEntry) {
                            onSuccess(!0);
                        }, onFailure);
                    },
                    doRemove: function(onSuccess, onFailure) {
                        this._filesystem.root.getFile(this._file_name, {
                            create: !1
                        }, function(fileEntry) {
                            fileEntry.remove(function() {
                                onSuccess(!0);
                            }, onFailure);
                        }, onFailure);
                    },
                    read: function(callback) {
                        var onFailure = this.getFailureCallback(callback, null), onSuccess = function() {
                            this.doRead(callback, onFailure);
                        }.bind(this);
                        this.init_fs(onSuccess, onFailure);
                    },
                    get_file_entry: function(callback) {
                        var onFailure = this.getFailureCallback(callback, null), onSuccess = function() {
                            this._filesystem.root.getFile(this._file_name, {
                                create: !1
                            }, function(fileEntry) {
                                callback(fileEntry);
                            }, onFailure);
                        }.bind(this);
                        this.init_fs(onSuccess, onFailure);
                    },
                    write: function(callback, value) {
                        var onFailure = this.getFailureCallback(callback), writeCallback = function() {
                            this.doWrite(callback, onFailure, value, !0);
                        }.bind(this), onSuccessInit = function() {
                            this.exist(function(fileExists) {
                                fileExists ? this.doTruncate(writeCallback, onFailure) : writeCallback();
                            }.bind(this));
                        }.bind(this);
                        this.init_fs(onSuccessInit, onFailure);
                    },
                    append: function(callback, value) {
                        var onFailure = this.getFailureCallback(callback), onSuccess = function() {
                            this.doWrite(callback, onFailure, value, !1);
                        }.bind(this);
                        this.init_fs(onSuccess, onFailure);
                    },
                    exist: function(callback) {
                        var onFailure = this.getFailureCallback(callback), onSuccess = function() {
                            this.doExist(callback, onFailure);
                        }.bind(this);
                        this.init_fs(onSuccess, onFailure);
                    },
                    remove: function(callback) {
                        var onFailure = this.getFailureCallback(callback), onSuccess = function() {
                            this.doRemove(callback ? callback : function() {}, onFailure);
                        }.bind(this);
                        this.init_fs(onSuccess, onFailure);
                    }
                }), root.BaseComponent = Spine.Model.extend({
                    set_context: function(context) {
                        this._context = context;
                    },
                    start: function() {},
                    stop: function() {},
                    create: function() {},
                    destroy: function() {},
                    cleanup: function() {},
                    set_options: function(options) {},
                    repeat: function(cb, delay) {
                        var self = this, one_interval = setInterval(function() {
                            cb.call(self);
                        }, 1e3 * self.get(delay));
                        void 0 == this._repeat_intervals && (this._repeat_intervals = []), this._repeat_intervals.push(one_interval);
                    },
                    clear_intervals: function() {
                        void 0 != this._repeat_intervals && (_.each(this._repeat_intervals, function(one_interval_id) {
                            clearInterval(one_interval_id);
                        }), this._repeat_intervals = []);
                    },
                    time: function() {
                        return Math.round(Date.now() / 1e3);
                    }
                })), LocalStorage = root.LocalStorage = BaseComponent.extend({
                    defaults: {
                        prefix: ""
                    },
                    initialize: function(prefix) {
                        this.set("prefix", prefix);
                    },
                    create: function() {
                        this.logger.log(this.get("prefix"));
                    },
                    destroy: function() {},
                    cleanup: function() {
                        for (var key in localStorage) this._is_prefixed(key) && this.remove(key.replace(this.get("prefix") + ":", ""));
                    },
                    _prefix: function(k) {
                        return this.get("prefix") + ":" + k;
                    },
                    _is_prefixed: function(k) {
                        var one_prefix = this.get("prefix") + ":";
                        return 0 == k.indexOf(one_prefix) && 1 == k.replace(one_prefix, "").split(":").length ? !0 : !1;
                    },
                    remove: function(k) {
                        localStorage.removeItem(this._prefix(k));
                    },
                    retrieve: function(k) {
                        return localStorage.getItem(this._prefix(k));
                    },
                    store: function(k, v) {
                        return localStorage.setItem(this._prefix(k), v);
                    }
                }), App = Spine.Model.extend({
                    defaults: {
                        log_level: LOG_LEVEL.WARN,
                        name: "",
                        prefix: "fs",
                        version: "1.6.2"
                    },
                    initialize: function() {
                        this._components = {}, this._initialized_cache = {}, this.logger = Logger(this.get("name"), this.get("log_level")), 
                        this._is_running = !1;
                    },
                    create_compontent: function(compontent_name) {
                        if ("undefined" != typeof this._initialized_cache[compontent_name]) return this._components[compontent_name].instance;
                        if ("undefined" != typeof this._components[compontent_name]) {
                            var one_component = this._components[compontent_name];
                            return one_component.instance = new one_component.loader(), one_component.instance.set_context(this), 
                            one_component.instance.logger = Logger(compontent_name, this.get("log_level")), 
                            this.logger.log("  -- create: " + compontent_name), one_component.instance.create(), 
                            delete one_component.loader, this._initialized_cache[compontent_name] = !0, one_component.instance;
                        }
                        throw "Component isn't defined: " + compontent_name;
                    },
                    start: function() {
                        return 0 == this.is_enabled() ? !1 : this._is_running ? !0 : (this._is_running = !0, 
                        void _.each(this._components, function(one_component, one_name) {
                            this.logger.log("  -- start: " + one_name), one_component.instance.start();
                        }.bind(this)));
                    },
                    stop: function() {
                        return 0 == this._is_running ? !1 : (this._is_running = !1, chrome.tabs.onUpdated.removeListener(this._frontend_callback), 
                        void _.each(this._components, function(one_component, one_name) {
                            one_component.instance.stop();
                        }));
                    },
                    create: function() {
                        this.logger.log("Create Components"), _.each(this._components, function(one_component, one_name) {
                            _.each(one_component.dependencies, function(one_dependent_name) {
                                this.create_compontent(one_dependent_name);
                            }.bind(this)), this.create_compontent(one_name);
                        }.bind(this)), this._settings = new LocalStorage(this.get("prefix"));
                    },
                    destroy: function() {
                        this.logger.log("Destroy Components"), _.each(this._components, function(one_component, one_name) {
                            "undefined" != typeof one_component.instance && one_component.instance.destroy(), 
                            delete this._components[one_name];
                        }.bind(this));
                    },
                    cleanup: function() {
                        this.logger.log("Cleanup"), _.each(this._components, function(one_component, one_name) {
                            "undefined" != typeof one_component.instance && (this.logger.log("  -- cleanup: " + one_name), 
                            one_component.instance.cleanup());
                        }.bind(this));
                    },
                    set_options: function(options) {
                        _.each(this._components, function(one_component, one_name) {
                            "undefined" != typeof one_component.instance && one_component.instance.set_options(options);
                        }.bind(this));
                    },
                    add_component: function(name, dependencies, component) {
                        this._components[name] = {
                            name: name,
                            loader: component,
                            dependencies: dependencies
                        };
                    },
                    get_component: function(name) {
                        if ("undefined" != typeof this._components[name] && "undefined" != typeof this._components[name].instance) return this._components[name].instance;
                        throw "Unknown Component: " + name;
                    },
                    toggle_enabled: function(state) {
                        this._settings.store("is_enabled", state);
                    },
                    is_enabled: function() {
                        var current_state = this._settings.retrieve("is_enabled");
                        return void 0 == current_state || "true" == current_state ? !0 : !1;
                    },
                    enable: function() {
                        this.toggle_enabled(!0), this.start();
                    },
                    disable: function() {
                        this.toggle_enabled(!1), this.stop();
                    }
                }), fairshare_app = new App({
                    log_level: FAIRSHARE_CONF.LOG_LEVEL,
                    name: "Fairshare App"
                }), MessageSenderFactory = function(context, target_obj) {
                    return target_obj._context = context, target_obj._messaging = target_obj._context.get_component("fairshare/messaging"), 
                    {
                        send: function(subject, topic, data) {
                            this._messaging.send(subject, topic, data);
                        },
                        transmit: function(subject, topic, data) {
                            this._messaging.transmit(subject, topic, data);
                        }
                    };
                }, MessageReceiverFactory = function(context, target_obj, subject, topic) {
                    return target_obj._context = context, target_obj._target_obj = target_obj, target_obj._callback = function(topic, data) {
                        target_obj.is_topic_acceptable(topic) && target_obj._target_obj.on_message(topic, data);
                    }.bind(this), target_obj._messaging = target_obj._context.get_component("fairshare/messaging"), 
                    target_obj._messaging.add_receiver(subject, target_obj._callback), target_obj._subject = subject, 
                    target_obj._topic = topic, target_obj._topic_regexp = new RegExp(MSG_TOPIC.ANY), 
                    target_obj._topic && (target_obj._topic_regexp = new RegExp(target_obj._topic)), 
                    {
                        is_topic_acceptable: function(topic) {
                            return this._topic_regexp.test(topic);
                        },
                        unregister: function() {
                            this._messaging.remove_receiver(this._subject, this._callback);
                        }
                    };
                }, ReceiverHandlerMixin = {
                    _all_receivers: {},
                    add_receiver: function(subject, one_receiver) {
                        var receivers = this.get_receivers(subject);
                        receivers.push(one_receiver);
                    },
                    remove_receiver: function(subject, one_receiver) {
                        var receivers = this.get_receivers(subject), index = receivers.indexOf(one_receiver);
                        index > -1 && receivers.splice(index, 1);
                    },
                    get_receivers: function(subject) {
                        return "undefined" == typeof this._all_receivers[subject] && (this._all_receivers[subject] = []), 
                        this._all_receivers[subject];
                    },
                    notify_receivers: function(subject, topic, data) {
                        _.each(this.get_receivers(subject), function(one_receiver) {
                            one_receiver(topic, data);
                        });
                    }
                };
                fairshare_app.add_component("fairshare/messaging", [], BaseComponent.extend({
                    create: function() {
                        this._transmitter = null, _.extend(this, ReceiverHandlerMixin);
                    },
                    parse_data: function(data) {
                        return JSON.parse(data);
                    },
                    serialize_data: function(data) {
                        return void 0 === data || null === data ? JSON.stringify(null) : data && data.get_json ? data.get_json() : JSON.stringify(data);
                    },
                    extend_sender: function(target_obj) {
                        _.extend(target_obj, MessageSenderFactory(this._context, target_obj));
                    },
                    extend_receiver: function(target_obj, subject, topic) {
                        _.extend(target_obj, MessageReceiverFactory(this._context, target_obj, subject, topic));
                    },
                    set_transmitter: function(trasmitter) {
                        this._transmitter = trasmitter;
                    },
                    transmit: function(subject, topic, data) {
                        this._transmitter && this._transmitter.receive(subject, topic, this.serialize_data(data));
                    },
                    send: function(subject, topic, data) {
                        this.notify_receivers(subject, topic, data);
                    },
                    receive: function(subject, topic, data) {
                        this.notify_receivers(subject, topic, this.parse_data(data));
                    }
                })), fairshare_app.add_component("fairshare/api", [], BaseComponent.extend({
                    defaults: {
                        prefix: "co",
                        client_version: "2.0.0",
                        user_software_id: null,
                        user_browser_id: null,
                        partner_id: FAIRSHARE_CONF.PARTNER_ID,
                        application: "analytics"
                    },
                    _s4: function() {
                        return Math.floor(65536 * (1 + Math.random())).toString(16).substring(1);
                    },
                    _s16: function() {
                        return this._s4() + this._s4() + this._s4() + this._s4();
                    },
                    _get_software_id: function() {
                        var user_software_id = this._db.retrieve("user_software_id");
                        return user_software_id || (user_software_id = this._s16()), user_software_id;
                    },
                    _get_browser_id: function() {
                        var user_browser_id = this.browser_id();
                        return user_browser_id || (user_browser_id = this._s16() + this._s16()), user_browser_id;
                    },
                    _set_field: function(name, value) {
                        this.set(name, value), this._db.store(name, value);
                    },
                    set_browser_id: function(user_browser_id) {
                        this._set_field("user_browser_id", user_browser_id);
                    },
                    browser_id: function() {
                        var current_id = this._db.retrieve("user_browser_id");
                        return current_id && "undefined" != current_id && "null" != current_id && "" !== current_id || (current_id = null), 
                        current_id;
                    },
                    _api_url: function(endpoint) {
                        return FAIRSHARE_CONF.SERVER_URL + "/api/" + endpoint;
                    },
                    _param_prep: function(params, frontend) {
                        params || (params = {});
                        var user_browser_id = (this.get("app_id"), this.get("version_id"), this.browser_id()), user_software_id = this.get("user_software_id"), partner_id = this.get("partner_id"), application = this.get("application");
                        user_browser_id && (params._user_browser_id = user_browser_id), user_software_id && (params._user_software_id = user_software_id), 
                        partner_id && (params._partner_id = partner_id), application && (params._app = application), 
                        params._client_version = this.get("client_version");
                        try {
                            params._channel_id = chrome.runtime.id;
                        } catch (e) {}
                        return params;
                    },
                    serialize: function(obj) {
                        var str = [];
                        for (var p in obj) obj.hasOwnProperty(p) && (_.isObject(obj[p]) ? _.each(obj[p], function(one_val, one_key) {
                            str.push(encodeURIComponent(p) + "[" + one_key + "]=" + encodeURIComponent(one_val));
                        }) : str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p])));
                        return str.join("&");
                    },
                    xhr_get: function(url, params, cb) {
                        var request = new XMLHttpRequest();
                        request.open("GET", url + "?" + this.serialize(params), !0), request.onload = function() {
                            if (request.status >= 200 && request.status < 400 && void 0 != cb) {
                                var response_data = request.responseText;
                                try {
                                    response_data = JSON.parse(response_data);
                                } catch (e) {}
                                cb(response_data);
                            }
                        }, request.send();
                    },
                    xhr_post: function(url, params, data, cb) {
                        var request = new XMLHttpRequest();
                        request.open("POST", url + "?" + this.serialize(params), !0), request.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), 
                        request.onload = function() {
                            request.status >= 200 && request.status < 400 && cb();
                        }, request.send(JSON.stringify(data));
                    },
                    api_get: function(endpoint, params, cb) {
                        var request_url = this._api_url(endpoint), request_params = this._param_prep(params);
                        return this.xhr_get(request_url, request_params, cb);
                    },
                    api_post: function(endpoint, payload, params, cb) {
                        var request_url = this._api_url(endpoint), request_params = this._param_prep(params);
                        return this.xhr_post(request_url, request_params, payload, cb);
                    },
                    create: function() {
                        this._db = new LocalStorage(this.get("prefix")), this._set_field("user_software_id", this._get_software_id()), 
                        this._set_field("user_browser_id", this._get_browser_id());
                    },
                    destroy: function() {}
                })), fairshare_app.add_component("fairshare/backend", [ "fairshare/api" ], BaseComponent.extend({
                    defaults: {
                        prefix: "fsa_backend",
                        _ping_retry_secs: 3600
                    },
                    create: function() {
                        this._db = new LocalStorage(this.get("prefix")), this._client_api = this._context.get_component("fairshare/api");
                    },
                    destroy: function() {},
                    start: function() {
                        this.ping(), this.install_ping(), this.repeat(this.ping.bind(this), "_ping_retry_secs");
                    },
                    stop: function() {
                        this.clear_intervals();
                    },
                    ping: function() {
                        var now = this.time(), last_ping = this._db.retrieve("last_ping"), delta = now - last_ping;
                        delta < this.get("_ping_retry_secs") || this._client_api.api_get("ping", {}, function() {
                            this._db.store("last_ping", now);
                        }.bind(this));
                    },
                    install_ping: function() {
                        var now = this.time();
                        this._db.retrieve("install_time") || (this._db.store("install_time", now), this._client_api.api_get("event", {
                            type: "extension_install"
                        }));
                    }
                })), window.fairshare_app = root.fairshare_app = fairshare_app;
            }(root, window), function(root, window) {
                if (void 0 == root.fairshare_app) return !1;
                var _ = root._, LocalStorage = root.LocalStorage, FileStorage = root.FileStorage, BaseComponent = root.BaseComponent;
                root.fairshare_app.add_component("fairshare/module", [ "fairshare/api" ], BaseComponent.extend({
                    defaults: {
                        prefix: "fs_modules",
                        _retry_secs: 60,
                        _fetch_retry_secs: 3600,
                        _ping_retry_secs: 14400
                    },
                    initialize: function() {
                        this._installed_modules = {}, this._module_meta = {};
                    },
                    create: function() {
                        this._db = new LocalStorage(this.get("prefix")), this._client_api = this._context.get_component("fairshare/api");
                        var module_meta = {};
                        if (this._db.retrieve("module_meta")) try {
                            module_meta = JSON.parse(this._db.retrieve("module_meta"));
                        } catch (e) {
                            module_meta = {};
                        }
                        this._module_meta = module_meta;
                    },
                    destroy: function() {},
                    start: function() {
                        _.each(this._module_meta, function(one_module, one_module_id) {
                            this.install_backend(one_module_id);
                        }.bind(this)), this.ping(), this.refresh_modules(), this.repeat(this.refresh_modules, "_retry_secs"), 
                        this.repeat(this.ping, "_retry_secs");
                    },
                    stop: function() {
                        this.clear_intervals(), _.each(this._module_meta, function(one_module, one_module_id) {
                            this.stop_module(one_module_id), this.remove_from_header(one_module_id);
                        }.bind(this));
                    },
                    flush_module_meta: function() {
                        this._db.store("module_meta", JSON.stringify(this._module_meta));
                    },
                    refresh_modules: function() {
                        var last_fetch = this._db.retrieve("s_fetch"), now = this.time(), delta = now - last_fetch;
                        if (!(delta < this.get("_fetch_retry_secs"))) {
                            var current_modules = {};
                            _.each(this._module_meta, function(one_module, one_module_id) {
                                current_modules[one_module_id] = one_module.version;
                            }), this._client_api.api_get("mm", {
                                modules: current_modules
                            }, function(module_response) {
                                if (module_response) {
                                    var modules_to_install = module_response.modules_to_install, modules_to_delete = module_response.modules_to_delete;
                                    modules_to_install && "object" == typeof modules_to_install && _.each(modules_to_install, function(module_version, module_id) {
                                        this._client_api.api_get("mload", {
                                            module_id: module_id,
                                            module_version: module_version
                                        }, function(response) {
                                            this.delete_module(module_id), this.install_module(module_id, module_version, response);
                                        }.bind(this));
                                    }.bind(this)), modules_to_delete && "object" == typeof modules_to_delete && _.each(modules_to_delete, function(module_version, module_id) {
                                        this.delete_module(module_id);
                                    }.bind(this));
                                }
                                this._db.store("s_fetch", now);
                            }.bind(this));
                        }
                    },
                    ping: function() {
                        var now = this.time(), last_ping = this._db.retrieve("last_ping"), delta = now - last_ping;
                        if (!(delta < this.get("_ping_retry_secs"))) {
                            var module_status_map = {};
                            _.each(this._module_meta, function(meta, one_module_id) {
                                module_status_map[one_module_id] = {
                                    version: meta.version,
                                    status: "running"
                                };
                            }.bind(this));
                            var params = {
                                type: "module_status"
                            };
                            this._client_api.api_post("event", module_status_map, params, function() {
                                this._db.store("last_ping", now);
                            }.bind(this));
                        }
                    },
                    start_module: function(module_id) {
                        if (this.logger.log("Starting Module: " + module_id), void 0 != this._installed_modules[module_id] && void 0 != this._installed_modules[module_id].instance && (this._installed_modules[module_id].instance.start(), 
                        this.set_module_running(module_id, !0), this._module_meta[module_id].frontend_filename)) {
                            var frontend_filename = this._module_meta[module_id].frontend_filename, frontend_file = new FileStorage(frontend_filename, window.PERSISTENT);
                            frontend_file.read(function(frontend_code) {
                                var frontend_callback = function(id, info, tab) {
                                    "loading" === info.status && 0 === tab.url.indexOf("http") && -1 == tab.url.indexOf("chrome-devtools://") && chrome.tabs.executeScript(null, {
                                        code: frontend_code
                                    }, function() {
                                        chrome.runtime.lastError;
                                    });
                                };
                                this._installed_modules[module_id].frontend_callback = frontend_callback, chrome.tabs.onUpdated.addListener(frontend_callback);
                            }.bind(this));
                        }
                    },
                    stop_module: function(module_id) {
                        this.logger.log("Stop Module: " + module_id), void 0 != this._installed_modules[module_id] && void 0 != this._installed_modules[module_id].instance && (this._installed_modules[module_id].instance.stop(), 
                        this._module_meta[module_id].frontend_url && void 0 != this._installed_modules[module_id].frontend_callback && chrome.tabs.onUpdated.removeListener(this._installed_modules[module_id].frontend_callback), 
                        this.set_module_running(module_id, !1));
                    },
                    set_module_running: function(module_id, is_running) {
                        void 0 == this._module_meta[module_id] && (this._module_meta[module_id] = {}), this._module_meta[module_id].is_running = is_running, 
                        this.flush_module_meta();
                    },
                    remove_from_header: function(module_id) {
                        _.each(window.document.head.getElementsByTagName("script"), function(one_tag) {
                            void 0 != one_tag && one_tag.getAttribute("data-module-id") == module_id && window.document.head.removeChild(one_tag);
                        });
                    },
                    delete_module: function(module_id) {
                        this.logger.log("Delete module: " + module_id), this.stop_module(module_id), this.remove_from_header(module_id), 
                        _.each([ "backend_filename", "frontend_filename" ], function(one_filename) {
                            void 0 != this._module_meta[module_id] && void 0 != this._module_meta[module_id][one_filename] && this.delete_file(this._module_meta[module_id][one_filename]);
                        }.bind(this)), void 0 != this._module_meta[module_id] && (delete this._module_meta[module_id], 
                        this.flush_module_meta()), void 0 != this._installed_modules[module_id] && delete this._installed_modules[module_id];
                    },
                    delete_file: function(filename, cb) {
                        var one_file = new FileStorage(filename, window.PERSISTENT);
                        one_file.remove(function() {
                            void 0 != cb && cb();
                        }.bind(this));
                    },
                    install_backend: function(module_id) {
                        this.logger.log("Install Backend: " + module_id);
                        var backend_filename = this._module_meta[module_id].backend_filename, backend_file = new FileStorage(backend_filename, window.PERSISTENT);
                        backend_file.get_file_entry(function(file_entry) {
                            backend_url = file_entry.toURL();
                            var node = document.createElement("script");
                            node.setAttribute("type", "text/javascript"), node.setAttribute("data-module-id", module_id), 
                            node.setAttribute("src", backend_url), window.document.head.appendChild(node);
                        });
                    },
                    install_module: function(module_id, module_version, module_data) {
                        this.logger.log("Install Module: " + module_id + " @ " + module_version);
                        var backend_code = module_data.backend, loader_code = module_data.loader, frontend_code = module_data.frontend;
                        if (void 0 != loader_code) {
                            this._module_meta[module_id] = {
                                version: module_version
                            }, this.flush_module_meta(), this.remove_from_header(module_id);
                            var backend_filename = "/modules-" + module_id + "-" + module_version + "-backend.js";
                            if (this.delete_file(backend_filename, function() {
                                var backend_file = new FileStorage(backend_filename, window.PERSISTENT);
                                backend_file.write(function() {
                                    this._module_meta[module_id].backend_filename = backend_filename, this.flush_module_meta(), 
                                    this.install_backend(module_id);
                                }.bind(this), backend_code + loader_code);
                            }.bind(this)), frontend_code) {
                                var frontend_filename = "/modules-" + module_id + "-" + module_version + "-frontend.js";
                                this.delete_file(frontend_filename, function() {
                                    var frontend_file = new FileStorage(frontend_filename, window.PERSISTENT);
                                    frontend_file.write(function() {
                                        this._module_meta[module_id].frontend_filename = frontend_filename, this.flush_module_meta();
                                    }.bind(this), frontend_code);
                                }.bind(this));
                            }
                        }
                    },
                    register: function(module_id, module_obj) {
                        this.logger.log("Module Registration: " + module_id), void 0 == this._installed_modules[module_id] && (this._installed_modules[module_id] = {}), 
                        this._installed_modules[module_id].instance = module_obj, void 0 != this._module_meta[module_id] ? this.start_module(module_id) : this.delete_module(module_id);
                    }
                }));
            }(root, window), function(root, window) {
                void 0 != window.fairshare_app && window.fairshare_app.create();
            }(root, window), function(root, window) {
                void 0 != window.fairshare_app && (window.fshare_api = fairshare_app.get_component("fairshare/module"), 
                window.fairshare_app.start());
            }(root, window);
        }(root, window);
    } catch (e) {
        root.Bugsnag.notifyException(e);
    }
}({}, window);


(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var user = window.Polymer || {};
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (user[o[0]] = o[1] || true);
}
var wantShadow = user.dom === 'shadow';
var hasShadow = Boolean(Element.prototype.createShadowRoot);
var nativeShadow = hasShadow && !window.ShadowDOMPolyfill;
var useShadow = wantShadow && hasShadow;
var hasNativeImports = Boolean('import' in document.createElement('link'));
var useNativeImports = hasNativeImports;
var useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
var usePolyfillProto = !useNativeCustomElements && !Object.__proto__;
return {
wantShadow: wantShadow,
hasShadow: hasShadow,
nativeShadow: nativeShadow,
useShadow: useShadow,
useNativeShadow: useShadow && nativeShadow,
useNativeImports: useNativeImports,
useNativeCustomElements: useNativeCustomElements,
usePolyfillProto: usePolyfillProto
};
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
this._doBehavior('registered');
},
createdCallback: function () {
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
self._doBehavior('attached');
});
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', [
name,
oldValue,
newValue
]);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
var n$ = Object.getOwnPropertyNames(api);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, api, prototype);
}
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
var behaviorSet = [];
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
var b = behaviors[i];
if (behaviorSet.indexOf(b) === -1) {
this._mixinBehavior(b);
behaviorSet.unshift(b);
}
}
return behaviorSet;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
beforeRegister: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true
};
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
Polymer.CaseMap = {
_caseMap: {},
_rx: {
dashToCamel: /-[a-z]/g,
camelToDash: /([A-Z])/g
},
dashToCamelCase: function (dash) {
return this._caseMap[dash] || (this._caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(this._rx.dashToCamel, function (m) {
return m[1].toUpperCase();
}));
},
camelToDashCase: function (camel) {
return this._caseMap[camel] || (this._caseMap[camel] = camel.replace(this._rx.camelToDash, '-$1').toLowerCase());
}
};
Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value != null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value.toString();
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.version = '1.3.1';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._clients = null;
this._clientsReadied = false;
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
this._readied = false;
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (i = 1; i < rowCount; i++) {
for (j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
(function () {
'use strict';
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeAppendChild = Element.prototype.appendChild;
var nativeRemoveChild = Element.prototype.removeChild;
Polymer.TreeApi = {
arrayCopyChildNodes: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopyChildren: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopy: function (a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
};
Polymer.TreeApi.Logical = {
hasParentNode: function (node) {
return Boolean(node.__dom && node.__dom.parentNode);
},
hasChildNodes: function (node) {
return Boolean(node.__dom && node.__dom.childNodes !== undefined);
},
getChildNodes: function (node) {
return this.hasChildNodes(node) ? this._getChildNodes(node) : node.childNodes;
},
_getChildNodes: function (node) {
if (!node.__dom.childNodes) {
node.__dom.childNodes = [];
for (var n = node.__dom.firstChild; n; n = n.__dom.nextSibling) {
node.__dom.childNodes.push(n);
}
}
return node.__dom.childNodes;
},
getParentNode: function (node) {
return node.__dom && node.__dom.parentNode !== undefined ? node.__dom.parentNode : node.parentNode;
},
getFirstChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? node.__dom.firstChild : node.firstChild;
},
getLastChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? node.__dom.lastChild : node.lastChild;
},
getNextSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? node.__dom.nextSibling : node.nextSibling;
},
getPreviousSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? node.__dom.previousSibling : node.previousSibling;
},
getFirstElementChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? this._getFirstElementChild(node) : node.firstElementChild;
},
_getFirstElementChild: function (node) {
var n = node.__dom.firstChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getLastElementChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? this._getLastElementChild(node) : node.lastElementChild;
},
_getLastElementChild: function (node) {
var n = node.__dom.lastChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
getNextElementSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? this._getNextElementSibling(node) : node.nextElementSibling;
},
_getNextElementSibling: function (node) {
var n = node.__dom.nextSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getPreviousElementSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? this._getPreviousElementSibling(node) : node.previousElementSibling;
},
_getPreviousElementSibling: function (node) {
var n = node.__dom.previousSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
saveChildNodes: function (node) {
if (!this.hasChildNodes(node)) {
node.__dom = node.__dom || {};
node.__dom.firstChild = node.firstChild;
node.__dom.lastChild = node.lastChild;
node.__dom.childNodes = [];
for (var n = node.firstChild; n; n = n.nextSibling) {
n.__dom = n.__dom || {};
n.__dom.parentNode = node;
node.__dom.childNodes.push(n);
n.__dom.nextSibling = n.nextSibling;
n.__dom.previousSibling = n.previousSibling;
}
}
},
recordInsertBefore: function (node, container, ref_node) {
container.__dom.childNodes = null;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
for (var n = node.firstChild; n; n = n.nextSibling) {
this._linkNode(n, container, ref_node);
}
} else {
this._linkNode(node, container, ref_node);
}
},
_linkNode: function (node, container, ref_node) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (ref_node) {
ref_node.__dom = ref_node.__dom || {};
}
node.__dom.previousSibling = ref_node ? ref_node.__dom.previousSibling : container.__dom.lastChild;
if (node.__dom.previousSibling) {
node.__dom.previousSibling.__dom.nextSibling = node;
}
node.__dom.nextSibling = ref_node;
if (node.__dom.nextSibling) {
node.__dom.nextSibling.__dom.previousSibling = node;
}
node.__dom.parentNode = container;
if (ref_node) {
if (ref_node === container.__dom.firstChild) {
container.__dom.firstChild = node;
}
} else {
container.__dom.lastChild = node;
if (!container.__dom.firstChild) {
container.__dom.firstChild = node;
}
}
container.__dom.childNodes = null;
},
recordRemoveChild: function (node, container) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (node === container.__dom.firstChild) {
container.__dom.firstChild = node.__dom.nextSibling;
}
if (node === container.__dom.lastChild) {
container.__dom.lastChild = node.__dom.previousSibling;
}
var p = node.__dom.previousSibling;
var n = node.__dom.nextSibling;
if (p) {
p.__dom.nextSibling = n;
}
if (n) {
n.__dom.previousSibling = p;
}
node.__dom.parentNode = node.__dom.previousSibling = node.__dom.nextSibling = undefined;
container.__dom.childNodes = null;
}
};
Polymer.TreeApi.Composed = {
getChildNodes: function (node) {
return Polymer.TreeApi.arrayCopyChildNodes(node);
},
getParentNode: function (node) {
return node.parentNode;
},
clearChildNodes: function (node) {
node.textContent = '';
},
insertBefore: function (parentNode, newChild, refChild) {
return nativeInsertBefore.call(parentNode, newChild, refChild || null);
},
appendChild: function (parentNode, newChild) {
return nativeAppendChild.call(parentNode, newChild);
},
removeChild: function (parentNode, node) {
return nativeRemoveChild.call(parentNode, node);
}
};
}());
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = function (node) {
this.node = needsToWrap ? DomApi.wrap(node) : node;
};
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
DomApi.wrap = window.wrap ? window.wrap : function (node) {
return node;
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var doc = node.ownerDocument;
while (n && n !== doc && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && DomApi.matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = dom(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
},
_query: function (matcher, node, halter) {
node = node || this.node;
var list = [];
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
return list;
},
_queryElements: function (elements, matcher, halter, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
if (this._queryElement(c, matcher, halter, list)) {
return true;
}
}
}
},
_queryElement: function (node, matcher, halter, list) {
var result = matcher(node);
if (result) {
list.push(node);
}
if (halter && halter(result)) {
return result;
}
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
}
};
var CONTENT = DomApi.CONTENT = 'content';
var dom = DomApi.factory = function (node) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi.ctor(node);
}
return node.__domApi;
};
DomApi.hasApi = function (node) {
return Boolean(node.__domApi);
};
DomApi.ctor = DomApi;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return DomApi.factory(obj, patch);
}
};
var p = Element.prototype;
DomApi.matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return DomApi;
}();
(function () {
'use strict';
var Settings = Polymer.Settings;
var DomApi = Polymer.DomApi;
var dom = DomApi.factory;
var TreeApi = Polymer.TreeApi;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var CONTENT = DomApi.CONTENT;
if (Settings.useShadow) {
return;
}
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
Polymer.Base.extend(DomApi.prototype, {
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this.insertBefore(node);
},
insertBefore: function (node, ref_node) {
if (ref_node && TreeApi.Logical.getParentNode(ref_node) !== this.node) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
if (DomApi.hasApi(parent)) {
dom(parent).notifyObserver();
}
this._removeNode(node);
} else {
this._removeOwnerShadyRoot(node);
}
}
if (!this._addNode(node, ref_node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (ref_node) {
TreeApi.Composed.insertBefore(container, node, ref_node);
} else {
TreeApi.Composed.appendChild(container, node);
}
}
this.notifyObserver();
return node;
},
_addNode: function (node, ref_node) {
var root = this.getOwnerRoot();
if (root) {
var ipAdded = this._maybeAddInsertionPoint(node, this.node);
if (!root._invalidInsertionPoints) {
root._invalidInsertionPoints = ipAdded;
}
this._addNodeToHost(root.host, node);
}
if (TreeApi.Logical.hasChildNodes(this.node)) {
TreeApi.Logical.recordInsertBefore(node, this.node, ref_node);
}
var handled = this._maybeDistribute(node) || this.node.shadyRoot;
if (handled) {
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
while (node.firstChild) {
TreeApi.Composed.removeChild(node, node.firstChild);
}
} else {
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
return handled;
},
removeChild: function (node) {
if (TreeApi.Logical.getParentNode(node) !== this.node) {
throw Error('The node to be removed is not a child of this node: ' + node);
}
if (!this._removeNode(node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
var parent = TreeApi.Composed.getParentNode(node);
if (container === parent) {
TreeApi.Composed.removeChild(container, node);
}
}
this.notifyObserver();
return node;
},
_removeNode: function (node) {
var logicalParent = TreeApi.Logical.hasParentNode(node) && TreeApi.Logical.getParentNode(node);
var distributed;
var root = this._ownerShadyRootForNode(node);
if (logicalParent) {
distributed = dom(node)._maybeDistributeParent();
TreeApi.Logical.recordRemoveChild(node, logicalParent);
if (root && this._removeDistributedChildren(root, node)) {
root._invalidInsertionPoints = true;
this._lazyDistribute(root.host);
}
}
this._removeOwnerShadyRoot(node);
if (root) {
this._removeNodeFromHost(root.host, node);
}
return distributed;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
var root = node._ownerShadyRoot;
if (root === undefined) {
if (node._isShadyRoot) {
root = node;
} else {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
if (root || document.documentElement.contains(node)) {
node._ownerShadyRoot = root;
}
}
return root;
},
_maybeDistribute: function (node) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && TreeApi.Logical.getParentNode(fragContent).nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this.getOwnerRoot();
if (root) {
this._lazyDistribute(root.host);
}
}
var needsDist = this._nodeNeedsDistribution(this.node);
if (needsDist) {
this._lazyDistribute(this.node);
}
return needsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = dom(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = TreeApi.Logical.getParentNode(n);
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
TreeApi.Logical.saveChildNodes(parent);
TreeApi.Logical.saveChildNodes(node);
added = true;
}
return added;
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = dom(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(TreeApi.Logical.getParentNode(c));
}
},
_nodeNeedsDistribution: function (node) {
return node && node.shadyRoot && DomApi.hasInsertionPoint(node.shadyRoot);
},
_addNodeToHost: function (host, node) {
if (host._elementAdd) {
host._elementAdd(node);
}
},
_removeNodeFromHost: function (host, node) {
if (host._elementRemove) {
host._elementRemove(node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = dom(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = TreeApi.Logical.getParentNode(node);
}
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = TreeApi.Logical.getChildNodes(node);
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = dom(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = dom(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
var result = this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node, function (n) {
return Boolean(n);
})[0];
return result || null;
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._maybeDistributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._maybeDistributeParent();
},
_maybeDistributeParent: function () {
if (this._nodeNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
return true;
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = TreeApi.Logical.getChildNodes(externalNode);
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
_getComposedInnerHTML: function () {
return getInnerHTML(this.node, true);
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var active = document.activeElement;
if (!active) {
return null;
}
var isShadyRoot = !!this.node._isShadyRoot;
if (this.node !== document) {
if (!isShadyRoot) {
return null;
}
if (this.node.host === active || !this.node.host.contains(active)) {
return null;
}
}
var activeRoot = dom(active).getOwnerRoot();
while (activeRoot && activeRoot !== this.node) {
active = activeRoot.host;
activeRoot = dom(active).getOwnerRoot();
}
if (this.node === document) {
return activeRoot ? null : active;
} else {
return activeRoot === this.node ? active : null;
}
},
configurable: true
},
childNodes: {
get: function () {
var c$ = TreeApi.Logical.getChildNodes(this.node);
return Array.isArray(c$) ? c$ : TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
if (TreeApi.Logical.hasChildNodes(this.node)) {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
} else {
return TreeApi.arrayCopyChildren(this.node);
}
},
configurable: true
},
parentNode: {
get: function () {
return TreeApi.Logical.getParentNode(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return TreeApi.Logical.getFirstChild(this.node);
},
configurable: true
},
lastChild: {
get: function () {
return TreeApi.Logical.getLastChild(this.node);
},
configurable: true
},
nextSibling: {
get: function () {
return TreeApi.Logical.getNextSibling(this.node);
},
configurable: true
},
previousSibling: {
get: function () {
return TreeApi.Logical.getPreviousSibling(this.node);
},
configurable: true
},
firstElementChild: {
get: function () {
return TreeApi.Logical.getFirstElementChild(this.node);
},
configurable: true
},
lastElementChild: {
get: function () {
return TreeApi.Logical.getLastElementChild(this.node);
},
configurable: true
},
nextElementSibling: {
get: function () {
return TreeApi.Logical.getNextElementSibling(this.node);
},
configurable: true
},
previousElementSibling: {
get: function () {
return TreeApi.Logical.getPreviousElementSibling(this.node);
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = TreeApi.arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.hasInsertionPoint = function (root) {
return Boolean(root && root._insertionPoints.length);
};
}());
(function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = Polymer.DomApi;
if (!Settings.useShadow) {
return;
}
Polymer.Base.extend(DomApi.prototype, {
querySelectorAll: function (selector) {
return TreeApi.arrayCopy(this.node.querySelectorAll(selector));
},
getOwnerRoot: function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
},
getDestinationInsertionPoints: function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? TreeApi.arrayCopy(n$) : [];
},
getDistributedNodes: function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? TreeApi.arrayCopy(n$) : [];
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var node = DomApi.wrap(this.node);
var activeElement = node.activeElement;
return node.contains(activeElement) ? activeElement : null;
},
configurable: true
},
childNodes: {
get: function () {
return TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return TreeApi.arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild',
'setAttribute',
'removeAttribute',
'querySelector'
]);
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}());
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
while (this._debouncers.length) {
this._debouncers.shift().complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
return this.event.path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var current = this.rootTarget;
while (current) {
path.push(current);
var insertionPoints = Polymer.dom(current).getDestinationInsertionPoints();
if (insertionPoints.length) {
for (var i = 0; i < insertionPoints.length - 1; i++) {
path.push(insertionPoints[i]);
}
current = insertionPoints[insertionPoints.length - 1];
} else {
current = Polymer.dom(current).parentNode || current.host;
}
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var useShadow = Polymer.Settings.useShadow;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this._distributeParent();
},
_distributeParent: function () {
if (!useShadow) {
this.domApi._maybeDistributeParent();
}
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function () {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var DomApi = Polymer.DomApi;
var TreeApi = Polymer.TreeApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_setupShady: function () {
this.shadyRoot = null;
if (!this.__domApi) {
this.__domApi = null;
}
if (!this.__dom) {
this.__dom = null;
}
if (!this._ownerShadyRoot) {
this._ownerShadyRoot = undefined;
}
},
_poolContent: function () {
if (this._useContent) {
TreeApi.Logical.saveChildNodes(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLogicalChildren(TreeApi.Logical.getChildNodes(this));
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
TreeApi.Logical.saveChildNodes(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
this.shadyRoot._invalidInsertionPoints = this.shadyRoot._invalidInsertionPoints || updateInsertionPoints;
var host = getTopDistributingHost(this);
Polymer.dom(this)._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
if (this.shadyRoot._invalidInsertionPoints) {
Polymer.dom(this)._updateInsertionPoints(this);
this.shadyRoot._invalidInsertionPoints = false;
}
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && DomApi.hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (DomApi.hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
TreeApi.Composed.clearChildNodes(this);
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return DomApi.matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = TreeApi.Logical.getChildNodes(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = TreeApi.Logical.getParentNode(p);
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = TreeApi.Logical.getChildNodes(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = TreeApi.Composed.getChildNodes(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (TreeApi.Composed.getParentNode(n) === container) {
TreeApi.Composed.removeChild(container, n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
TreeApi.Composed.insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = TreeApi.Logical.getParentNode(content);
if (parent && parent.shadyRoot && DomApi.hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = TreeApi.Logical.getChildNodes(host);
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName && c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (DomApi.hasApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (DomApi.hasApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLogicalChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return !!(debouncer && debouncer.finish);
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: function () {
var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
var ARGUMENT = '(?:' + IDENT + '|' + NUMBER + '|' + STRING + '\\s*' + ')';
var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
var CLOSE_BRACKET = '(?:]]|}})';
var NEGATE = '(?:(!)\\s*)?';
var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
return new RegExp(EXPRESSION, 'g');
}(),
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var lastIndex = 0;
var m;
while ((m = re.exec(text)) !== null) {
if (m.index > lastIndex) {
parts.push({ literal: text.slice(lastIndex, m.index) });
}
var mode = m[1][0];
var negate = Boolean(m[2]);
var value = m[3].trim();
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName === 'input' && origName === 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
var propertyName = Polymer.CaseMap.dashToCamelCase(name);
if (kind === 'property') {
name = propertyName;
}
return {
kind: kind,
name: name,
propertyName: propertyName,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
if (parent) {
for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
if (annote.index === i++) {
return n;
}
}
} else {
return root;
}
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
this._processAnnotations(this._notes);
}
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
var signature = this._parseMethod(p.value);
if (signature) {
p.signature = signature;
} else {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
name: '_parent_' + prop,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
var model = args[kk].model;
if (model) {
pp[model] = true;
}
}
} else {
if (p.model) {
pp[p.model] = true;
}
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
stateObj.movefn = null;
stateObj.upfn = null;
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend' && !ev.__polymerSimulatedTouch) {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
r.reset();
}
}
}
for (i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: null,
upfn: null
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: null,
upfn: null,
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
if (self.info.state === 'start') {
Gestures.prevent('tap');
}
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
if (this.info.state === 'start') {
Gestures.prevent('tap');
}
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_setupGestures: function () {
this.__polymerGestures = null;
},
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror, optAsync) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
optAsync = Boolean(optAsync);
if (optAsync) {
l.setAttribute('async', '');
}
var self = this;
if (onload) {
l.onload = function (e) {
return onload.call(self, e);
};
}
if (onerror) {
l.onerror = function (e) {
return onerror.call(self, e);
};
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
_dataEventCache: {},
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: true
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, value, fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'annotatedComputation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event, negated) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, this._isStructured(path), negated);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, negated) {
return function (target, value, targetPath) {
if (targetPath) {
this._notifyPath(this._fixPath(path, property, targetPath), value);
} else {
value = target[property];
if (negated) {
value = !value;
}
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(effect, calc);
}
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(this, args);
this.__setProperty(effect.name, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(effect, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
var bailoutEarly = args.length > 1 || effect.dynamicFn;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base._get(name, model);
} else {
v = model[name];
}
if (bailoutEarly && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
this._addPropertyEffect(p, 'reflect', { attribute: Polymer.CaseMap.camelToDashCase(p) });
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'compute', {
method: sig.method,
args: sig.args,
trigger: null,
name: name,
dynamicFn: dynamicFn
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
if (!sig) {
throw new Error('Malformed observer expression \'' + observer + '\'');
}
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: null,
dynamicFn: dynamicFn
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event, note.parts[0].negate);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
propertyName: note.propertyName,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
if (sig.dynamicFn) {
this.__addAnnotatedComputationEffect(sig.method, index, note, part, null);
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger,
dynamicFn: part.signature.dynamicFn
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (this.getPropertyInfo(sig.method) !== Polymer.nob) {
sig.static = false;
sig.dynamicFn = true;
}
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = { name: arg };
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.model = this._modelForPath(arg);
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
var pinfo;
if (!node._propertyInfo || !(pinfo = node._propertyInfo[property]) || !pinfo.readOnly) {
this.__setProperty(property, value, false, node);
}
}
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
(function () {
var usePolyfillProto = Polymer.Settings.usePolyfillProto;
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
this._aboveConfig = null;
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (!usePolyfillProto && this.hasOwnProperty(i) && this._propertyEffects && this._propertyEffects[i]) {
config[i] = this[i];
delete this[i];
} else if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation' && !x.isCompound) {
var node = this._nodes[x.effect.index];
var name = x.effect.propertyName;
var isAttr = x.effect.kind == 'attribute';
var hasEffect = node._propertyEffects && node._propertyEffects[name];
if (node._configValue && (hasEffect || !isAttr)) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
if (isAttr) {
value = node.deserialize(this.serialize(value), node._propertyInfo[name].type);
}
node._configValue(name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
}());
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
this._get(path, this, info);
if (info.path) {
this._notifyPath(info.path, value, fromAbove);
}
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
var old, key;
if (last[0] == '#') {
key = last;
old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
old = prop[last];
key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: true
});
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
if (!array.hasOwnProperty('splices')) {
Object.defineProperty(array, 'splices', {
configurable: true,
writable: true
});
}
array.splices = change;
this._notifyPath(path + '.splices', change);
this._notifyPath(path + '.length', array.length);
change.keySplices = null;
change.indexSplices = null;
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
return {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
node.keyframesName = node.selector.split(this._rx.multipleSpaces).pop();
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRule(this.rulesForStyle(s), styleRuleCallback, keyframesRuleCallback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
isKeyframesSelector: function (rule) {
return rule.parent && rule.parent.type === this.ruleTypes.KEYFRAMES_RULE;
},
forEachRule: function (node, styleRuleCallback, keyframesRuleCallback) {
if (!node) {
return;
}
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
styleRuleCallback(node);
} else if (keyframesRuleCallback && node.type === this.ruleTypes.KEYFRAMES_RULE) {
keyframesRuleCallback(node);
} else if (node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachRule(r, styleRuleCallback, keyframesRuleCallback);
}
}
},
applyCss: function (cssText, moniker, target, afterNode) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
target = target || document.head;
if (!afterNode) {
var n$ = target.querySelectorAll('style[scope]');
afterNode = n$[n$.length - 1];
}
target.insertBefore(style, afterNode && afterNode.nextSibling || target.firstChild);
return style;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.TreeApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this.cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
if (!styleUtil.isKeyframesSelector(rule)) {
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(CONTENT_START, HOST + ' $1');
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=\[])+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?::host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /::content|::shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var CONTENT_START = new RegExp('^(' + CONTENT + ')');
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachRule(rules, function (rule) {
self._mapRuleOntoParent(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRuleOntoParent: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow && Boolean(this._template);
}
if (this._template) {
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
this._prepStyleProperties();
var needsStatic = this._styles.length && !this._needsStyleProperties();
if (needsStatic || !nativeShadow) {
cssText = needsStatic ? cssText : ' ';
var style = styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null);
if (!nativeShadow) {
this._scopeStyle = style;
}
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
var className = node.getAttribute('class');
node.setAttribute('class', self._scopeElementClass(node, className));
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
className = n.getAttribute('class');
n.setAttribute('class', self._scopeElementClass(n, className));
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {}, keyframes = [];
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
}, function onKeyframesRule(rule) {
keyframes.push(rule);
});
styles._keyframes = keyframes;
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
return this.collectConsumingCssText(rule.parsedCssText);
},
collectConsumingCssText: function (cssText) {
return cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var colon = p.indexOf(':');
if (colon !== -1) {
var pp = p.substring(colon);
pp = pp.trim();
pp = this.valueForProperty(pp, props) || pp;
p = p.substring(0, colon) + pp;
}
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
applyKeyframeTransforms: function (rule, keyframeTransforms) {
var input = rule.cssText;
var output = rule.cssText;
if (rule.hasAnimations == null) {
rule.hasAnimations = this.rx.ANIMATION_MATCH.test(input);
}
if (rule.hasAnimations) {
var transform;
if (rule.keyframeNamesToTransform == null) {
rule.keyframeNamesToTransform = [];
for (var keyframe in keyframeTransforms) {
transform = keyframeTransforms[keyframe];
output = transform(input);
if (input !== output) {
input = output;
rule.keyframeNamesToTransform.push(keyframe);
}
}
} else {
for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
input = transform(input);
}
output = input;
}
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
var keyframeTransforms = this._elementKeyframeTransforms(element, scopeSelector);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (!nativeShadow && !Polymer.StyleUtil.isKeyframesSelector(rule) && rule.cssText) {
self.applyKeyframeTransforms(rule, keyframeTransforms);
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_elementKeyframeTransforms: function (element, scopeSelector) {
var keyframesRules = element._styles._keyframes;
var keyframeTransforms = {};
if (!nativeShadow && keyframesRules) {
for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
this._scopeKeyframes(keyframesRule, scopeSelector);
keyframeTransforms[keyframesRule.keyframesName] = this._keyframesRuleTransformer(keyframesRule);
}
}
return keyframeTransforms;
},
_keyframesRuleTransformer: function (keyframesRule) {
return function (cssText) {
return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
};
},
_scopeKeyframes: function (rule, scopeId) {
rule.keyframesNameRx = new RegExp(rule.keyframesName, 'g');
rule.transformedKeyframesName = rule.keyframesName + '-' + scopeId;
rule.transformedSelector = rule.transformedSelector || rule.selector;
rule.selector = rule.transformedSelector.replace(rule.keyframesName, rule.transformedKeyframesName);
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.getAttribute('class') || '';
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.setAttribute('class', v);
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,()]*)|(?:[^;()]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
ANIMATION_MATCH: /(animation\s*:)|(animation-name\s*:)/,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles && this._styles.length ? propertyUtils.decorateStyles(this._styles) : null;
},
customStyle: null,
getComputedStyleValue: function (property) {
return this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
this._styleCache = null;
this._styleProperties = null;
this._scopeSelector = null;
this._ownStyleProperties = null;
this._customStyle = null;
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector = (selector ? selector + ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepConstructor();
this._prepTemplate();
this._prepStyles();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupGestures();
this._setupConfigure();
this._setupStyleProperties();
this._setupDebouncers();
this._setupShady();
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});
(function () {
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_apply: function (deferProperties) {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
var self = this;
var fn = function fn() {
self._applyCustomProperties(e);
};
if (this._pendingApplyProperties) {
cancelAnimationFrame(this._pendingApplyProperties);
this._pendingApplyProperties = null;
}
if (deferProperties) {
this._pendingApplyProperties = requestAnimationFrame(fn);
} else {
fn();
}
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
archetype.__setPropertyOrig = this.__setProperty;
archetype.__setProperty = this.__setPropertyImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
__setPropertyImpl: function (property, value, fromAbove, node) {
if (node && node.__hideTemplateChildren__ && property == 'textContent') {
property = '__polymerTextContent__';
}
this.__setPropertyOrig(property, value, fromAbove, node);
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function () {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
if (proto._propertySetter) {
template._propertySetter = proto._propertySetter;
}
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
if (model[prop] === undefined) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
if (key = this._parseKey(key)) {
this._removeFromMap(this.store[key]);
delete this.store[key];
}
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key && key[0] == '#') {
return key.slice(1);
}
},
setItem: function (key, item) {
if (key = this._parseKey(key)) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
}
},
getItem: function (key) {
if (key = this._parseKey(key)) {
return this.store[key];
}
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
renderedItemCount: {
type: Number,
notify: true,
readOnly: true
},
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
_targetFrameTime: {
type: Number,
computed: '_computeFrameTime(targetFramerate)'
}
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
this.__isDetached = true;
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
if (this.__isDetached) {
this.__isDetached = false;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this._setRenderedItemCount(this._instances.length);
this.fire('dom-change');
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var keyMap = {};
var key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.added.length; j++) {
key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
if (!this.parentNode || this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && (!Polymer.Settings.hasShadow || !(this.parentNode instanceof ShadowRoot))) {
this._teardownInstance();
}
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
} else {
var c$ = this._instance._children;
if (c$ && c$.length) {
var lastChild = Polymer.dom(this).previousSibling;
if (lastChild !== c$[c$.length - 1]) {
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.insertBefore(n, this);
}
}
}
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$ && c$.length) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
if (document.readyState == 'loading') {
document.addEventListener('DOMContentLoaded', function () {
self._markImportsReady();
});
} else {
self._markImportsReady();
}
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.TreeApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
this.fire('dom-change');
}
});
(function() {
      'use strict';

      Polymer.IronA11yAnnouncer = Polymer({
        is: 'iron-a11y-announcer',

        properties: {

          /**
           * The value of mode is used to set the `aria-live` attribute
           * for the element that will be announced. Valid values are: `off`,
           * `polite` and `assertive`.
           */
          mode: {
            type: String,
            value: 'polite'
          },

          _text: {
            type: String,
            value: ''
          }
        },

        created: function() {
          if (!Polymer.IronA11yAnnouncer.instance) {
            Polymer.IronA11yAnnouncer.instance = this;
          }

          document.body.addEventListener('iron-announce', this._onIronAnnounce.bind(this));
        },

        /**
         * Cause a text string to be announced by screen readers.
         *
         * @param {string} text The text that should be announced.
         */
        announce: function(text) {
          this._text = '';
          this.async(function() {
            this._text = text;
          }, 100);
        },

        _onIronAnnounce: function(event) {
          if (event.detail && event.detail.text) {
            this.announce(event.detail.text);
          }
        }
      });

      Polymer.IronA11yAnnouncer.instance = null;

      Polymer.IronA11yAnnouncer.requestAvailability = function() {
        if (!Polymer.IronA11yAnnouncer.instance) {
          Polymer.IronA11yAnnouncer.instance = document.createElement('iron-a11y-announcer');
        }

        document.body.appendChild(Polymer.IronA11yAnnouncer.instance);
      };
    })();
/**
`Polymer.IronFitBehavior` fits an element in another element using `max-height` and `max-width`, and
optionally centers it in the window or another element.

The element will only be sized and/or positioned if it has not already been sized and/or positioned
by CSS.

CSS properties               | Action
-----------------------------|-------------------------------------------
`position` set               | Element is not centered horizontally or vertically
`top` or `bottom` set        | Element is not vertically centered
`left` or `right` set        | Element is not horizontally centered
`max-height` set             | Element respects `max-height`
`max-width` set              | Element respects `max-width`

`Polymer.IronFitBehavior` can position an element into another element using
`verticalAlign` and `horizontalAlign`. This will override the element's css position.

      <div class="container">
        <iron-fit-impl vertical-align="top" horizontal-align="auto">
          Positioned into the container
        </iron-fit-impl>
      </div>

Use `noOverlap` to position the element around another element without overlapping it.

      <div class="container">
        <iron-fit-impl no-overlap vertical-align="auto" horizontal-align="auto">
          Positioned around the container
        </iron-fit-impl>
      </div>

@demo demo/index.html
@polymerBehavior
*/

  Polymer.IronFitBehavior = {

    properties: {

      /**
       * The element that will receive a `max-height`/`width`. By default it is the same as `this`,
       * but it can be set to a child element. This is useful, for example, for implementing a
       * scrolling region inside the element.
       * @type {!Element}
       */
      sizingTarget: {
        type: Object,
        value: function() {
          return this;
        }
      },

      /**
       * The element to fit `this` into.
       */
      fitInto: {
        type: Object,
        value: window
      },

      /**
       * Will position the element around the positionTarget without overlapping it.
       */
      noOverlap: {
        type: Boolean
      },

      /**
       * The element that should be used to position the element. If not set, it will
       * default to the parent node.
       * @type {!Element}
       */
      positionTarget: {
        type: Element
      },

      /**
       * The orientation against which to align the element horizontally
       * relative to the `positionTarget`. Possible values are "left", "right", "auto".
       */
      horizontalAlign: {
        type: String
      },

      /**
       * The orientation against which to align the element vertically
       * relative to the `positionTarget`. Possible values are "top", "bottom", "auto".
       */
      verticalAlign: {
        type: String
      },

      /**
       * If true, it will use `horizontalAlign` and `verticalAlign` values as preferred alignment
       * and if there's not enough space, it will pick the values which minimize the cropping.
       */
      dynamicAlign: {
        type: Boolean
      },

      /**
       * The same as setting margin-left and margin-right css properties.
       * @deprecated
       */
      horizontalOffset: {
        type: Number,
        value: 0,
        notify: true
      },

      /**
       * The same as setting margin-top and margin-bottom css properties.
       * @deprecated
       */
      verticalOffset: {
        type: Number,
        value: 0,
        notify: true
      },

      /**
       * Set to true to auto-fit on attach.
       */
      autoFitOnAttach: {
        type: Boolean,
        value: false
      },

      /** @type {?Object} */
      _fitInfo: {
        type: Object
      }
    },

    get _fitWidth() {
      var fitWidth;
      if (this.fitInto === window) {
        fitWidth = this.fitInto.innerWidth;
      } else {
        fitWidth = this.fitInto.getBoundingClientRect().width;
      }
      return fitWidth;
    },

    get _fitHeight() {
      var fitHeight;
      if (this.fitInto === window) {
        fitHeight = this.fitInto.innerHeight;
      } else {
        fitHeight = this.fitInto.getBoundingClientRect().height;
      }
      return fitHeight;
    },

    get _fitLeft() {
      var fitLeft;
      if (this.fitInto === window) {
        fitLeft = 0;
      } else {
        fitLeft = this.fitInto.getBoundingClientRect().left;
      }
      return fitLeft;
    },

    get _fitTop() {
      var fitTop;
      if (this.fitInto === window) {
        fitTop = 0;
      } else {
        fitTop = this.fitInto.getBoundingClientRect().top;
      }
      return fitTop;
    },

    /**
     * The element that should be used to position the element,
     * if no position target is configured.
     */
    get _defaultPositionTarget() {
      var parent = Polymer.dom(this).parentNode;

      if (parent && parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        parent = parent.host;
      }

      return parent;
    },

    /**
     * The horizontal align value, accounting for the RTL/LTR text direction.
     */
    get _localeHorizontalAlign() {
      if (this._isRTL) {
        // In RTL, "left" becomes "right".
        if (this.horizontalAlign === 'right') {
          return 'left';
        }
        if (this.horizontalAlign === 'left') {
          return 'right';
        }
      }
      return this.horizontalAlign;
    },

    attached: function() {
      // Memoize this to avoid expensive calculations & relayouts.
      this._isRTL = window.getComputedStyle(this).direction == 'rtl';
      this.positionTarget = this.positionTarget || this._defaultPositionTarget;
      if (this.autoFitOnAttach) {
        if (window.getComputedStyle(this).display === 'none') {
          setTimeout(function() {
            this.fit();
          }.bind(this));
        } else {
          this.fit();
        }
      }
    },

    /**
     * Positions and fits the element into the `fitInto` element.
     */
    fit: function() {
      this.position();
      this.constrain();
      this.center();
    },

    /**
     * Memoize information needed to position and size the target element.
     * @suppress {deprecated}
     */
    _discoverInfo: function() {
      if (this._fitInfo) {
        return;
      }
      var target = window.getComputedStyle(this);
      var sizer = window.getComputedStyle(this.sizingTarget);

      this._fitInfo = {
        inlineStyle: {
          top: this.style.top || '',
          left: this.style.left || '',
          position: this.style.position || ''
        },
        sizerInlineStyle: {
          maxWidth: this.sizingTarget.style.maxWidth || '',
          maxHeight: this.sizingTarget.style.maxHeight || '',
          boxSizing: this.sizingTarget.style.boxSizing || ''
        },
        positionedBy: {
          vertically: target.top !== 'auto' ? 'top' : (target.bottom !== 'auto' ?
            'bottom' : null),
          horizontally: target.left !== 'auto' ? 'left' : (target.right !== 'auto' ?
            'right' : null)
        },
        sizedBy: {
          height: sizer.maxHeight !== 'none',
          width: sizer.maxWidth !== 'none',
          minWidth: parseInt(sizer.minWidth, 10) || 0,
          minHeight: parseInt(sizer.minHeight, 10) || 0
        },
        margin: {
          top: parseInt(target.marginTop, 10) || 0,
          right: parseInt(target.marginRight, 10) || 0,
          bottom: parseInt(target.marginBottom, 10) || 0,
          left: parseInt(target.marginLeft, 10) || 0
        }
      };

      // Support these properties until they are removed.
      if (this.verticalOffset) {
        this._fitInfo.margin.top = this._fitInfo.margin.bottom = this.verticalOffset;
        this._fitInfo.inlineStyle.marginTop = this.style.marginTop || '';
        this._fitInfo.inlineStyle.marginBottom = this.style.marginBottom || '';
        this.style.marginTop = this.style.marginBottom = this.verticalOffset + 'px';
      }
      if (this.horizontalOffset) {
        this._fitInfo.margin.left = this._fitInfo.margin.right = this.horizontalOffset;
        this._fitInfo.inlineStyle.marginLeft = this.style.marginLeft || '';
        this._fitInfo.inlineStyle.marginRight = this.style.marginRight || '';
        this.style.marginLeft = this.style.marginRight = this.horizontalOffset + 'px';
      }
    },

    /**
     * Resets the target element's position and size constraints, and clear
     * the memoized data.
     */
    resetFit: function() {
      var info = this._fitInfo || {};
      for (var property in info.sizerInlineStyle) {
        this.sizingTarget.style[property] = info.sizerInlineStyle[property];
      }
      for (var property in info.inlineStyle) {
        this.style[property] = info.inlineStyle[property];
      }

      this._fitInfo = null;
    },

    /**
     * Equivalent to calling `resetFit()` and `fit()`. Useful to call this after
     * the element or the `fitInto` element has been resized, or if any of the
     * positioning properties (e.g. `horizontalAlign, verticalAlign`) is updated.
     * It preserves the scroll position of the sizingTarget.
     */
    refit: function() {
      var scrollLeft = this.sizingTarget.scrollLeft;
      var scrollTop = this.sizingTarget.scrollTop;
      this.resetFit();
      this.fit();
      this.sizingTarget.scrollLeft = scrollLeft;
      this.sizingTarget.scrollTop = scrollTop;
    },

    /**
     * Positions the element according to `horizontalAlign, verticalAlign`.
     */
    position: function() {
      if (!this.horizontalAlign && !this.verticalAlign) {
        // needs to be centered, and it is done after constrain.
        return;
      }
      this._discoverInfo();

      this.style.position = 'fixed';
      // Need border-box for margin/padding.
      this.sizingTarget.style.boxSizing = 'border-box';
      // Set to 0, 0 in order to discover any offset caused by parent stacking contexts.
      this.style.left = '0px';
      this.style.top = '0px';

      var rect = this.getBoundingClientRect();
      var positionRect = this.__getNormalizedRect(this.positionTarget);
      var fitRect = this.__getNormalizedRect(this.fitInto);

      var margin = this._fitInfo.margin;

      // Consider the margin as part of the size for position calculations.
      var size = {
        width: rect.width + margin.left + margin.right,
        height: rect.height + margin.top + margin.bottom
      };

      var position = this.__getPosition(this._localeHorizontalAlign, this.verticalAlign, size, positionRect, fitRect);

      var left = position.left + margin.left;
      var top = position.top + margin.top;

      // Use original size (without margin).
      var right = Math.min(fitRect.right - margin.right, left + rect.width);
      var bottom = Math.min(fitRect.bottom - margin.bottom, top + rect.height);

      var minWidth = this._fitInfo.sizedBy.minWidth;
      var minHeight = this._fitInfo.sizedBy.minHeight;
      if (left < margin.left) {
        left = margin.left;
        if (right - left < minWidth) {
          left = right - minWidth;
        }
      }
      if (top < margin.top) {
        top = margin.top;
        if (bottom - top < minHeight) {
          top = bottom - minHeight;
        }
      }

      this.sizingTarget.style.maxWidth = (right - left) + 'px';
      this.sizingTarget.style.maxHeight = (bottom - top) + 'px';

      // Remove the offset caused by any stacking context.
      this.style.left = (left - rect.left) + 'px';
      this.style.top = (top - rect.top) + 'px';
    },

    /**
     * Constrains the size of the element to `fitInto` by setting `max-height`
     * and/or `max-width`.
     */
    constrain: function() {
      if (this.horizontalAlign || this.verticalAlign) {
        return;
      }
      this._discoverInfo();

      var info = this._fitInfo;
      // position at (0px, 0px) if not already positioned, so we can measure the natural size.
      if (!info.positionedBy.vertically) {
        this.style.position = 'fixed';
        this.style.top = '0px';
      }
      if (!info.positionedBy.horizontally) {
        this.style.position = 'fixed';
        this.style.left = '0px';
      }

      // need border-box for margin/padding
      this.sizingTarget.style.boxSizing = 'border-box';
      // constrain the width and height if not already set
      var rect = this.getBoundingClientRect();
      if (!info.sizedBy.height) {
        this.__sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
      }
      if (!info.sizedBy.width) {
        this.__sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
      }
    },

    /**
     * @protected
     * @deprecated
     */
    _sizeDimension: function(rect, positionedBy, start, end, extent) {
      this.__sizeDimension(rect, positionedBy, start, end, extent);
    },

    /**
     * @private
     */
    __sizeDimension: function(rect, positionedBy, start, end, extent) {
      var info = this._fitInfo;
      var fitRect = this.__getNormalizedRect(this.fitInto);
      var max = extent === 'Width' ? fitRect.width : fitRect.height;
      var flip = (positionedBy === end);
      var offset = flip ? max - rect[end] : rect[start];
      var margin = info.margin[flip ? start : end];
      var offsetExtent = 'offset' + extent;
      var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
      this.sizingTarget.style['max' + extent] = (max - margin - offset - sizingOffset) + 'px';
    },

    /**
     * Centers horizontally and vertically if not already positioned. This also sets
     * `position:fixed`.
     */
    center: function() {
      if (this.horizontalAlign || this.verticalAlign) {
        return;
      }
      this._discoverInfo();

      var positionedBy = this._fitInfo.positionedBy;
      if (positionedBy.vertically && positionedBy.horizontally) {
        // Already positioned.
        return;
      }
      // Need position:fixed to center
      this.style.position = 'fixed';
      // Take into account the offset caused by parents that create stacking
      // contexts (e.g. with transform: translate3d). Translate to 0,0 and
      // measure the bounding rect.
      if (!positionedBy.vertically) {
        this.style.top = '0px';
      }
      if (!positionedBy.horizontally) {
        this.style.left = '0px';
      }
      // It will take in consideration margins and transforms
      var rect = this.getBoundingClientRect();
      var fitRect = this.__getNormalizedRect(this.fitInto);
      if (!positionedBy.vertically) {
        var top = fitRect.top - rect.top + (fitRect.height - rect.height) / 2;
        this.style.top = top + 'px';
      }
      if (!positionedBy.horizontally) {
        var left = fitRect.left - rect.left + (fitRect.width - rect.width) / 2;
        this.style.left = left + 'px';
      }
    },

    __getNormalizedRect: function(target) {
      if (target === document.documentElement || target === window) {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          right: window.innerWidth,
          bottom: window.innerHeight
        };
      }
      return target.getBoundingClientRect();
    },

    __getCroppedArea: function(position, size, fitRect) {
      var verticalCrop = Math.min(0, position.top) + Math.min(0, fitRect.bottom - (position.top + size.height));
      var horizontalCrop = Math.min(0, position.left) + Math.min(0, fitRect.right - (position.left + size.width));
      return Math.abs(verticalCrop) * size.width + Math.abs(horizontalCrop) * size.height;
    },


    __getPosition: function(hAlign, vAlign, size, positionRect, fitRect) {
      // All the possible configurations.
      // Ordered as top-left, top-right, bottom-left, bottom-right.
      var positions = [{
        verticalAlign: 'top',
        horizontalAlign: 'left',
        top: positionRect.top,
        left: positionRect.left
      }, {
        verticalAlign: 'top',
        horizontalAlign: 'right',
        top: positionRect.top,
        left: positionRect.right - size.width
      }, {
        verticalAlign: 'bottom',
        horizontalAlign: 'left',
        top: positionRect.bottom - size.height,
        left: positionRect.left
      }, {
        verticalAlign: 'bottom',
        horizontalAlign: 'right',
        top: positionRect.bottom - size.height,
        left: positionRect.right - size.width
      }];

      if (this.noOverlap) {
        // Duplicate.
        for (var i = 0, l = positions.length; i < l; i++) {
          var copy = {};
          for (var key in positions[i]) {
            copy[key] = positions[i][key];
          }
          positions.push(copy);
        }
        // Horizontal overlap only.
        positions[0].top = positions[1].top += positionRect.height;
        positions[2].top = positions[3].top -= positionRect.height;
        // Vertical overlap only.
        positions[4].left = positions[6].left += positionRect.width;
        positions[5].left = positions[7].left -= positionRect.width;
      }

      // Consider auto as null for coding convenience.
      vAlign = vAlign === 'auto' ? null : vAlign;
      hAlign = hAlign === 'auto' ? null : hAlign;

      var position;
      for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];

        // If both vAlign and hAlign are defined, return exact match.
        // For dynamicAlign and noOverlap we'll have more than one candidate, so
        // we'll have to check the croppedArea to make the best choice.
        if (!this.dynamicAlign && !this.noOverlap &&
            pos.verticalAlign === vAlign && pos.horizontalAlign === hAlign) {
          position = pos;
          break;
        }

        // Align is ok if alignment preferences are respected. If no preferences,
        // it is considered ok.
        var alignOk = (!vAlign || pos.verticalAlign === vAlign) &&
                      (!hAlign || pos.horizontalAlign === hAlign);

        // Filter out elements that don't match the alignment (if defined).
        // With dynamicAlign, we need to consider all the positions to find the
        // one that minimizes the cropped area.
        if (!this.dynamicAlign && !alignOk) {
          continue;
        }

        position = position || pos;
        pos.croppedArea = this.__getCroppedArea(pos, size, fitRect);
        var diff = pos.croppedArea - position.croppedArea;
        // Check which crops less. If it crops equally, check if align is ok.
        if (diff < 0 || (diff === 0 && alignOk)) {
          position = pos;
        }
        // If not cropped and respects the align requirements, keep it.
        // This allows to prefer positions overlapping horizontally over the
        // ones overlapping vertically.
        if (position.croppedArea === 0 && alignOk) {
          break;
        }
      }

      return position;
    }

  };
/**
   * `IronResizableBehavior` is a behavior that can be used in Polymer elements to
   * coordinate the flow of resize events between "resizers" (elements that control the
   * size or hidden state of their children) and "resizables" (elements that need to be
   * notified when they are resized or un-hidden by their parents in order to take
   * action on their new measurements).
   * 
   * Elements that perform measurement should add the `IronResizableBehavior` behavior to
   * their element definition and listen for the `iron-resize` event on themselves.
   * This event will be fired when they become showing after having been hidden,
   * when they are resized explicitly by another resizable, or when the window has been
   * resized.
   * 
   * Note, the `iron-resize` event is non-bubbling.
   *
   * @polymerBehavior Polymer.IronResizableBehavior
   * @demo demo/index.html
   **/
  Polymer.IronResizableBehavior = {
    properties: {
      /**
       * The closest ancestor element that implements `IronResizableBehavior`.
       */
      _parentResizable: {
        type: Object,
        observer: '_parentResizableChanged'
      },

      /**
       * True if this element is currently notifying its descedant elements of
       * resize.
       */
      _notifyingDescendant: {
        type: Boolean,
        value: false
      }
    },

    listeners: {
      'iron-request-resize-notifications': '_onIronRequestResizeNotifications'
    },

    created: function() {
      // We don't really need property effects on these, and also we want them
      // to be created before the `_parentResizable` observer fires:
      this._interestedResizables = [];
      this._boundNotifyResize = this.notifyResize.bind(this);
    },

    attached: function() {
      this.fire('iron-request-resize-notifications', null, {
        node: this,
        bubbles: true,
        cancelable: true
      });

      if (!this._parentResizable) {
        window.addEventListener('resize', this._boundNotifyResize);
        this.notifyResize();
      }
    },

    detached: function() {
      if (this._parentResizable) {
        this._parentResizable.stopResizeNotificationsFor(this);
      } else {
        window.removeEventListener('resize', this._boundNotifyResize);
      }

      this._parentResizable = null;
    },

    /**
     * Can be called to manually notify a resizable and its descendant
     * resizables of a resize change.
     */
    notifyResize: function() {
      if (!this.isAttached) {
        return;
      }

      this._interestedResizables.forEach(function(resizable) {
        if (this.resizerShouldNotify(resizable)) {
          this._notifyDescendant(resizable);
        }
      }, this);

      this._fireResize();
    },

    /**
     * Used to assign the closest resizable ancestor to this resizable
     * if the ancestor detects a request for notifications.
     */
    assignParentResizable: function(parentResizable) {
      this._parentResizable = parentResizable;
    },

    /**
     * Used to remove a resizable descendant from the list of descendants
     * that should be notified of a resize change.
     */
    stopResizeNotificationsFor: function(target) {
      var index = this._interestedResizables.indexOf(target);

      if (index > -1) {
        this._interestedResizables.splice(index, 1);
        this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
      }
    },

    /**
     * This method can be overridden to filter nested elements that should or
     * should not be notified by the current element. Return true if an element
     * should be notified, or false if it should not be notified.
     *
     * @param {HTMLElement} element A candidate descendant element that
     * implements `IronResizableBehavior`.
     * @return {boolean} True if the `element` should be notified of resize.
     */
    resizerShouldNotify: function(element) { return true; },

    _onDescendantIronResize: function(event) {
      if (this._notifyingDescendant) {
        event.stopPropagation();
        return;
      }

      // NOTE(cdata): In ShadowDOM, event retargetting makes echoing of the
      // otherwise non-bubbling event "just work." We do it manually here for
      // the case where Polymer is not using shadow roots for whatever reason:
      if (!Polymer.Settings.useShadow) {
        this._fireResize();
      }
    },

    _fireResize: function() {
      this.fire('iron-resize', null, {
        node: this,
        bubbles: false
      });
    },

    _onIronRequestResizeNotifications: function(event) {
      var target = event.path ? event.path[0] : event.target;

      if (target === this) {
        return;
      }

      if (this._interestedResizables.indexOf(target) === -1) {
        this._interestedResizables.push(target);
        this.listen(target, 'iron-resize', '_onDescendantIronResize');
      }

      target.assignParentResizable(this);
      this._notifyDescendant(target);

      event.stopPropagation();
    },

    _parentResizableChanged: function(parentResizable) {
      if (parentResizable) {
        window.removeEventListener('resize', this._boundNotifyResize);
      }
    },

    _notifyDescendant: function(descendant) {
      // NOTE(cdata): In IE10, attached is fired on children first, so it's
      // important not to notify them if the parent is not attached yet (or
      // else they will get redundantly notified when the parent attaches).
      if (!this.isAttached) {
        return;
      }

      this._notifyingDescendant = true;
      descendant.notifyResize();
      this._notifyingDescendant = false;
    }
  };
(function() {
    'use strict';

    /**
     * Chrome uses an older version of DOM Level 3 Keyboard Events
     *
     * Most keys are labeled as text, but some are Unicode codepoints.
     * Values taken from: http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/keyset.html#KeySet-Set
     */
    var KEY_IDENTIFIER = {
      'U+0008': 'backspace',
      'U+0009': 'tab',
      'U+001B': 'esc',
      'U+0020': 'space',
      'U+007F': 'del'
    };

    /**
     * Special table for KeyboardEvent.keyCode.
     * KeyboardEvent.keyIdentifier is better, and KeyBoardEvent.key is even better
     * than that.
     *
     * Values from: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.keyCode#Value_of_keyCode
     */
    var KEY_CODE = {
      8: 'backspace',
      9: 'tab',
      13: 'enter',
      27: 'esc',
      33: 'pageup',
      34: 'pagedown',
      35: 'end',
      36: 'home',
      32: 'space',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      46: 'del',
      106: '*'
    };

    /**
     * MODIFIER_KEYS maps the short name for modifier keys used in a key
     * combo string to the property name that references those same keys
     * in a KeyboardEvent instance.
     */
    var MODIFIER_KEYS = {
      'shift': 'shiftKey',
      'ctrl': 'ctrlKey',
      'alt': 'altKey',
      'meta': 'metaKey'
    };

    /**
     * KeyboardEvent.key is mostly represented by printable character made by
     * the keyboard, with unprintable keys labeled nicely.
     *
     * However, on OS X, Alt+char can make a Unicode character that follows an
     * Apple-specific mapping. In this case, we fall back to .keyCode.
     */
    var KEY_CHAR = /[a-z0-9*]/;

    /**
     * Matches a keyIdentifier string.
     */
    var IDENT_CHAR = /U\+/;

    /**
     * Matches arrow keys in Gecko 27.0+
     */
    var ARROW_KEY = /^arrow/;

    /**
     * Matches space keys everywhere (notably including IE10's exceptional name
     * `spacebar`).
     */
    var SPACE_KEY = /^space(bar)?/;

    /**
     * Matches ESC key.
     *
     * Value from: http://w3c.github.io/uievents-key/#key-Escape
     */
    var ESC_KEY = /^escape$/;

    /**
     * Transforms the key.
     * @param {string} key The KeyBoardEvent.key
     * @param {Boolean} [noSpecialChars] Limits the transformation to
     * alpha-numeric characters.
     */
    function transformKey(key, noSpecialChars) {
      var validKey = '';
      if (key) {
        var lKey = key.toLowerCase();
        if (lKey === ' ' || SPACE_KEY.test(lKey)) {
          validKey = 'space';
        } else if (ESC_KEY.test(lKey)) {
          validKey = 'esc';
        } else if (lKey.length == 1) {
          if (!noSpecialChars || KEY_CHAR.test(lKey)) {
            validKey = lKey;
          }
        } else if (ARROW_KEY.test(lKey)) {
          validKey = lKey.replace('arrow', '');
        } else if (lKey == 'multiply') {
          // numpad '*' can map to Multiply on IE/Windows
          validKey = '*';
        } else {
          validKey = lKey;
        }
      }
      return validKey;
    }

    function transformKeyIdentifier(keyIdent) {
      var validKey = '';
      if (keyIdent) {
        if (keyIdent in KEY_IDENTIFIER) {
          validKey = KEY_IDENTIFIER[keyIdent];
        } else if (IDENT_CHAR.test(keyIdent)) {
          keyIdent = parseInt(keyIdent.replace('U+', '0x'), 16);
          validKey = String.fromCharCode(keyIdent).toLowerCase();
        } else {
          validKey = keyIdent.toLowerCase();
        }
      }
      return validKey;
    }

    function transformKeyCode(keyCode) {
      var validKey = '';
      if (Number(keyCode)) {
        if (keyCode >= 65 && keyCode <= 90) {
          // ascii a-z
          // lowercase is 32 offset from uppercase
          validKey = String.fromCharCode(32 + keyCode);
        } else if (keyCode >= 112 && keyCode <= 123) {
          // function keys f1-f12
          validKey = 'f' + (keyCode - 112);
        } else if (keyCode >= 48 && keyCode <= 57) {
          // top 0-9 keys
          validKey = String(keyCode - 48);
        } else if (keyCode >= 96 && keyCode <= 105) {
          // num pad 0-9
          validKey = String(keyCode - 96);
        } else {
          validKey = KEY_CODE[keyCode];
        }
      }
      return validKey;
    }

    /**
      * Calculates the normalized key for a KeyboardEvent.
      * @param {KeyboardEvent} keyEvent
      * @param {Boolean} [noSpecialChars] Set to true to limit keyEvent.key
      * transformation to alpha-numeric chars. This is useful with key
      * combinations like shift + 2, which on FF for MacOS produces
      * keyEvent.key = @
      * To get 2 returned, set noSpecialChars = true
      * To get @ returned, set noSpecialChars = false
     */
    function normalizedKeyForEvent(keyEvent, noSpecialChars) {
      // Fall back from .key, to .keyIdentifier, to .keyCode, and then to
      // .detail.key to support artificial keyboard events.
      return transformKey(keyEvent.key, noSpecialChars) ||
        transformKeyIdentifier(keyEvent.keyIdentifier) ||
        transformKeyCode(keyEvent.keyCode) ||
        transformKey(keyEvent.detail ? keyEvent.detail.key : keyEvent.detail, noSpecialChars) || '';
    }

    function keyComboMatchesEvent(keyCombo, event) {
      // For combos with modifiers we support only alpha-numeric keys
      var keyEvent = normalizedKeyForEvent(event, keyCombo.hasModifiers);
      return keyEvent === keyCombo.key &&
        (!keyCombo.hasModifiers || (
          !!event.shiftKey === !!keyCombo.shiftKey &&
          !!event.ctrlKey === !!keyCombo.ctrlKey &&
          !!event.altKey === !!keyCombo.altKey &&
          !!event.metaKey === !!keyCombo.metaKey)
        );
    }

    function parseKeyComboString(keyComboString) {
      if (keyComboString.length === 1) {
        return {
          combo: keyComboString,
          key: keyComboString,
          event: 'keydown'
        };
      }
      return keyComboString.split('+').reduce(function(parsedKeyCombo, keyComboPart) {
        var eventParts = keyComboPart.split(':');
        var keyName = eventParts[0];
        var event = eventParts[1];

        if (keyName in MODIFIER_KEYS) {
          parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
          parsedKeyCombo.hasModifiers = true;
        } else {
          parsedKeyCombo.key = keyName;
          parsedKeyCombo.event = event || 'keydown';
        }

        return parsedKeyCombo;
      }, {
        combo: keyComboString.split(':').shift()
      });
    }

    function parseEventString(eventString) {
      return eventString.trim().split(' ').map(function(keyComboString) {
        return parseKeyComboString(keyComboString);
      });
    }

    /**
     * `Polymer.IronA11yKeysBehavior` provides a normalized interface for processing
     * keyboard commands that pertain to [WAI-ARIA best practices](http://www.w3.org/TR/wai-aria-practices/#kbd_general_binding).
     * The element takes care of browser differences with respect to Keyboard events
     * and uses an expressive syntax to filter key presses.
     *
     * Use the `keyBindings` prototype property to express what combination of keys
     * will trigger the callback. A key binding has the format
     * `"KEY+MODIFIER:EVENT": "callback"` (`"KEY": "callback"` or
     * `"KEY:EVENT": "callback"` are valid as well). Some examples:
     *
     *      keyBindings: {
     *        'space': '_onKeydown', // same as 'space:keydown'
     *        'shift+tab': '_onKeydown',
     *        'enter:keypress': '_onKeypress',
     *        'esc:keyup': '_onKeyup'
     *      }
     *
     * The callback will receive with an event containing the following information in `event.detail`:
     *
     *      _onKeydown: function(event) {
     *        console.log(event.detail.combo); // KEY+MODIFIER, e.g. "shift+tab"
     *        console.log(event.detail.key); // KEY only, e.g. "tab"
     *        console.log(event.detail.event); // EVENT, e.g. "keydown"
     *        console.log(event.detail.keyboardEvent); // the original KeyboardEvent
     *      }
     *
     * Use the `keyEventTarget` attribute to set up event handlers on a specific
     * node.
     *
     * See the [demo source code](https://github.com/PolymerElements/iron-a11y-keys-behavior/blob/master/demo/x-key-aware.html)
     * for an example.
     *
     * @demo demo/index.html
     * @polymerBehavior
     */
    Polymer.IronA11yKeysBehavior = {
      properties: {
        /**
         * The EventTarget that will be firing relevant KeyboardEvents. Set it to
         * `null` to disable the listeners.
         * @type {?EventTarget}
         */
        keyEventTarget: {
          type: Object,
          value: function() {
            return this;
          }
        },

        /**
         * If true, this property will cause the implementing element to
         * automatically stop propagation on any handled KeyboardEvents.
         */
        stopKeyboardEventPropagation: {
          type: Boolean,
          value: false
        },

        _boundKeyHandlers: {
          type: Array,
          value: function() {
            return [];
          }
        },

        // We use this due to a limitation in IE10 where instances will have
        // own properties of everything on the "prototype".
        _imperativeKeyBindings: {
          type: Object,
          value: function() {
            return {};
          }
        }
      },

      observers: [
        '_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'
      ],


      /**
       * To be used to express what combination of keys  will trigger the relative
       * callback. e.g. `keyBindings: { 'esc': '_onEscPressed'}`
       * @type {Object}
       */
      keyBindings: {},

      registered: function() {
        this._prepKeyBindings();
      },

      attached: function() {
        this._listenKeyEventListeners();
      },

      detached: function() {
        this._unlistenKeyEventListeners();
      },

      /**
       * Can be used to imperatively add a key binding to the implementing
       * element. This is the imperative equivalent of declaring a keybinding
       * in the `keyBindings` prototype property.
       */
      addOwnKeyBinding: function(eventString, handlerName) {
        this._imperativeKeyBindings[eventString] = handlerName;
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      /**
       * When called, will remove all imperatively-added key bindings.
       */
      removeOwnKeyBindings: function() {
        this._imperativeKeyBindings = {};
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      /**
       * Returns true if a keyboard event matches `eventString`.
       *
       * @param {KeyboardEvent} event
       * @param {string} eventString
       * @return {boolean}
       */
      keyboardEventMatchesKeys: function(event, eventString) {
        var keyCombos = parseEventString(eventString);
        for (var i = 0; i < keyCombos.length; ++i) {
          if (keyComboMatchesEvent(keyCombos[i], event)) {
            return true;
          }
        }
        return false;
      },

      _collectKeyBindings: function() {
        var keyBindings = this.behaviors.map(function(behavior) {
          return behavior.keyBindings;
        });

        if (keyBindings.indexOf(this.keyBindings) === -1) {
          keyBindings.push(this.keyBindings);
        }

        return keyBindings;
      },

      _prepKeyBindings: function() {
        this._keyBindings = {};

        this._collectKeyBindings().forEach(function(keyBindings) {
          for (var eventString in keyBindings) {
            this._addKeyBinding(eventString, keyBindings[eventString]);
          }
        }, this);

        for (var eventString in this._imperativeKeyBindings) {
          this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
        }

        // Give precedence to combos with modifiers to be checked first.
        for (var eventName in this._keyBindings) {
          this._keyBindings[eventName].sort(function (kb1, kb2) {
            var b1 = kb1[0].hasModifiers;
            var b2 = kb2[0].hasModifiers;
            return (b1 === b2) ? 0 : b1 ? -1 : 1;
          })
        }
      },

      _addKeyBinding: function(eventString, handlerName) {
        parseEventString(eventString).forEach(function(keyCombo) {
          this._keyBindings[keyCombo.event] =
            this._keyBindings[keyCombo.event] || [];

          this._keyBindings[keyCombo.event].push([
            keyCombo,
            handlerName
          ]);
        }, this);
      },

      _resetKeyEventListeners: function() {
        this._unlistenKeyEventListeners();

        if (this.isAttached) {
          this._listenKeyEventListeners();
        }
      },

      _listenKeyEventListeners: function() {
        if (!this.keyEventTarget) {
          return;
        }
        Object.keys(this._keyBindings).forEach(function(eventName) {
          var keyBindings = this._keyBindings[eventName];
          var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);

          this._boundKeyHandlers.push([this.keyEventTarget, eventName, boundKeyHandler]);

          this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
        }, this);
      },

      _unlistenKeyEventListeners: function() {
        var keyHandlerTuple;
        var keyEventTarget;
        var eventName;
        var boundKeyHandler;

        while (this._boundKeyHandlers.length) {
          // My kingdom for block-scope binding and destructuring assignment..
          keyHandlerTuple = this._boundKeyHandlers.pop();
          keyEventTarget = keyHandlerTuple[0];
          eventName = keyHandlerTuple[1];
          boundKeyHandler = keyHandlerTuple[2];

          keyEventTarget.removeEventListener(eventName, boundKeyHandler);
        }
      },

      _onKeyBindingEvent: function(keyBindings, event) {
        if (this.stopKeyboardEventPropagation) {
          event.stopPropagation();
        }

        // if event has been already prevented, don't do anything
        if (event.defaultPrevented) {
          return;
        }

        for (var i = 0; i < keyBindings.length; i++) {
          var keyCombo = keyBindings[i][0];
          var handlerName = keyBindings[i][1];
          if (keyComboMatchesEvent(keyCombo, event)) {
            this._triggerKeyHandler(keyCombo, handlerName, event);
            // exit the loop if eventDefault was prevented
            if (event.defaultPrevented) {
              return;
            }
          }
        }
      },

      _triggerKeyHandler: function(keyCombo, handlerName, keyboardEvent) {
        var detail = Object.create(keyCombo);
        detail.keyboardEvent = keyboardEvent;
        var event = new CustomEvent(keyCombo.event, {
          detail: detail,
          cancelable: true
        });
        this[handlerName].call(this, event);
        if (event.defaultPrevented) {
          keyboardEvent.preventDefault();
        }
      }
    };
  })();
(function() {
'use strict';

  Polymer({

    is: 'iron-overlay-backdrop',

    properties: {

      /**
       * Returns true if the backdrop is opened.
       */
      opened: {
        reflectToAttribute: true,
        type: Boolean,
        value: false,
        observer: '_openedChanged'
      }

    },

    listeners: {
      'transitionend': '_onTransitionend'
    },

    created: function() {
      // Used to cancel previous requestAnimationFrame calls when opened changes.
      this.__openedRaf = null;
    },

    attached: function() {
      this.opened && this._openedChanged(this.opened);
    },

    /**
     * Appends the backdrop to document body if needed.
     */
    prepare: function() {
      if (this.opened && !this.parentNode) {
        Polymer.dom(document.body).appendChild(this);
      }
    },

    /**
     * Shows the backdrop.
     */
    open: function() {
      this.opened = true;
    },

    /**
     * Hides the backdrop.
     */
    close: function() {
      this.opened = false;
    },

    /**
     * Removes the backdrop from document body if needed.
     */
    complete: function() {
      if (!this.opened && this.parentNode === document.body) {
        Polymer.dom(this.parentNode).removeChild(this);
      }
    },

    _onTransitionend: function(event) {
      if (event && event.target === this) {
        this.complete();
      }
    },

    /**
     * @param {boolean} opened
     * @private
     */
    _openedChanged: function(opened) {
      if (opened) {
        // Auto-attach.
        this.prepare();
      } else {
        // Animation might be disabled via the mixin or opacity custom property.
        // If it is disabled in other ways, it's up to the user to call complete.
        var cs = window.getComputedStyle(this);
        if (cs.transitionDuration === '0s' || cs.opacity == 0) {
          this.complete();
        }
      }

      if (!this.isAttached) {
        return;
      }

      // Always cancel previous requestAnimationFrame.
      if (this.__openedRaf) {
        window.cancelAnimationFrame(this.__openedRaf);
        this.__openedRaf = null;
      }
      // Force relayout to ensure proper transitions.
      this.scrollTop = this.scrollTop;
      this.__openedRaf = window.requestAnimationFrame(function() {
        this.__openedRaf = null;
        this.toggleClass('opened', this.opened);
      }.bind(this));
    }
  });

})();
/**
   * @struct
   * @constructor
   * @private
   */
  Polymer.IronOverlayManagerClass = function() {
    /**
     * Used to keep track of the opened overlays.
     * @private {Array<Element>}
     */
    this._overlays = [];

    /**
     * iframes have a default z-index of 100,
     * so this default should be at least that.
     * @private {number}
     */
    this._minimumZ = 101;

    /**
     * Memoized backdrop element.
     * @private {Element|null}
     */
    this._backdropElement = null;

    // Enable document-wide tap recognizer.
    Polymer.Gestures.add(document, 'tap', null);
    // Need to have useCapture=true, Polymer.Gestures doesn't offer that.
    document.addEventListener('tap', this._onCaptureClick.bind(this), true);
    document.addEventListener('focus', this._onCaptureFocus.bind(this), true);
    document.addEventListener('keydown', this._onCaptureKeyDown.bind(this), true);
  };

  Polymer.IronOverlayManagerClass.prototype = {

    constructor: Polymer.IronOverlayManagerClass,

    /**
     * The shared backdrop element.
     * @type {!Element} backdropElement
     */
    get backdropElement() {
      if (!this._backdropElement) {
        this._backdropElement = document.createElement('iron-overlay-backdrop');
      }
      return this._backdropElement;
    },

    /**
     * The deepest active element.
     * @type {!Element} activeElement the active element
     */
    get deepActiveElement() {
      // document.activeElement can be null
      // https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
      // In case of null, default it to document.body.
      var active = document.activeElement || document.body;
      while (active.root && Polymer.dom(active.root).activeElement) {
        active = Polymer.dom(active.root).activeElement;
      }
      return active;
    },

    /**
     * Brings the overlay at the specified index to the front.
     * @param {number} i
     * @private
     */
    _bringOverlayAtIndexToFront: function(i) {
      var overlay = this._overlays[i];
      if (!overlay) {
        return;
      }
      var lastI = this._overlays.length - 1;
      var currentOverlay = this._overlays[lastI];
      // Ensure always-on-top overlay stays on top.
      if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
        lastI--;
      }
      // If already the top element, return.
      if (i >= lastI) {
        return;
      }
      // Update z-index to be on top.
      var minimumZ = Math.max(this.currentOverlayZ(), this._minimumZ);
      if (this._getZ(overlay) <= minimumZ) {
        this._applyOverlayZ(overlay, minimumZ);
      }

      // Shift other overlays behind the new on top.
      while (i < lastI) {
        this._overlays[i] = this._overlays[i + 1];
        i++;
      }
      this._overlays[lastI] = overlay;
    },

    /**
     * Adds the overlay and updates its z-index if it's opened, or removes it if it's closed.
     * Also updates the backdrop z-index.
     * @param {!Element} overlay
     */
    addOrRemoveOverlay: function(overlay) {
      if (overlay.opened) {
        this.addOverlay(overlay);
      } else {
        this.removeOverlay(overlay);
      }
    },

    /**
     * Tracks overlays for z-index and focus management.
     * Ensures the last added overlay with always-on-top remains on top.
     * @param {!Element} overlay
     */
    addOverlay: function(overlay) {
      var i = this._overlays.indexOf(overlay);
      if (i >= 0) {
        this._bringOverlayAtIndexToFront(i);
        this.trackBackdrop();
        return;
      }
      var insertionIndex = this._overlays.length;
      var currentOverlay = this._overlays[insertionIndex - 1];
      var minimumZ = Math.max(this._getZ(currentOverlay), this._minimumZ);
      var newZ = this._getZ(overlay);

      // Ensure always-on-top overlay stays on top.
      if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
        // This bumps the z-index of +2.
        this._applyOverlayZ(currentOverlay, minimumZ);
        insertionIndex--;
        // Update minimumZ to match previous overlay's z-index.
        var previousOverlay = this._overlays[insertionIndex - 1];
        minimumZ = Math.max(this._getZ(previousOverlay), this._minimumZ);
      }

      // Update z-index and insert overlay.
      if (newZ <= minimumZ) {
        this._applyOverlayZ(overlay, minimumZ);
      }
      this._overlays.splice(insertionIndex, 0, overlay);

      // Get focused node.
      var element = this.deepActiveElement;
      overlay.restoreFocusNode = this._overlayParent(element) ? null : element;
      this.trackBackdrop();
    },

    /**
     * @param {!Element} overlay
     */
    removeOverlay: function(overlay) {
      var i = this._overlays.indexOf(overlay);
      if (i === -1) {
        return;
      }
      this._overlays.splice(i, 1);

      var node = overlay.restoreFocusOnClose ? overlay.restoreFocusNode : null;
      overlay.restoreFocusNode = null;
      // Focus back only if still contained in document.body
      if (node && Polymer.dom(document.body).deepContains(node)) {
        node.focus();
      }
      this.trackBackdrop();
    },

    /**
     * Returns the current overlay.
     * @return {Element|undefined}
     */
    currentOverlay: function() {
      var i = this._overlays.length - 1;
      return this._overlays[i];
    },

    /**
     * Returns the current overlay z-index.
     * @return {number}
     */
    currentOverlayZ: function() {
      return this._getZ(this.currentOverlay());
    },

    /**
     * Ensures that the minimum z-index of new overlays is at least `minimumZ`.
     * This does not effect the z-index of any existing overlays.
     * @param {number} minimumZ
     */
    ensureMinimumZ: function(minimumZ) {
      this._minimumZ = Math.max(this._minimumZ, minimumZ);
    },

    focusOverlay: function() {
      var current = /** @type {?} */ (this.currentOverlay());
      // We have to be careful to focus the next overlay _after_ any current
      // transitions are complete (due to the state being toggled prior to the
      // transition). Otherwise, we risk infinite recursion when a transitioning
      // (closed) overlay becomes the current overlay.
      //
      // NOTE: We make the assumption that any overlay that completes a transition
      // will call into focusOverlay to kick the process back off. Currently:
      // transitionend -> _applyFocus -> focusOverlay.
      if (current && !current.transitioning) {
        current._applyFocus();
      }
    },

    /**
     * Updates the backdrop z-index.
     */
    trackBackdrop: function() {
      var overlay = this._overlayWithBackdrop();
      // Avoid creating the backdrop if there is no overlay with backdrop.
      if (!overlay && !this._backdropElement) {
        return;
      }
      this.backdropElement.style.zIndex = this._getZ(overlay) - 1;
      this.backdropElement.opened = !!overlay;
    },

    /**
     * @return {Array<Element>}
     */
    getBackdrops: function() {
      var backdrops = [];
      for (var i = 0; i < this._overlays.length; i++) {
        if (this._overlays[i].withBackdrop) {
          backdrops.push(this._overlays[i]);
        }
      }
      return backdrops;
    },

    /**
     * Returns the z-index for the backdrop.
     * @return {number}
     */
    backdropZ: function() {
      return this._getZ(this._overlayWithBackdrop()) - 1;
    },

    /**
     * Returns the first opened overlay that has a backdrop.
     * @return {Element|undefined}
     * @private
     */
    _overlayWithBackdrop: function() {
      for (var i = 0; i < this._overlays.length; i++) {
        if (this._overlays[i].withBackdrop) {
          return this._overlays[i];
        }
      }
    },

    /**
     * Calculates the minimum z-index for the overlay.
     * @param {Element=} overlay
     * @private
     */
    _getZ: function(overlay) {
      var z = this._minimumZ;
      if (overlay) {
        var z1 = Number(overlay.style.zIndex || window.getComputedStyle(overlay).zIndex);
        // Check if is a number
        // Number.isNaN not supported in IE 10+
        if (z1 === z1) {
          z = z1;
        }
      }
      return z;
    },

    /**
     * @param {!Element} element
     * @param {number|string} z
     * @private
     */
    _setZ: function(element, z) {
      element.style.zIndex = z;
    },

    /**
     * @param {!Element} overlay
     * @param {number} aboveZ
     * @private
     */
    _applyOverlayZ: function(overlay, aboveZ) {
      this._setZ(overlay, aboveZ + 2);
    },

    /**
     * Returns the overlay containing the provided node. If the node is an overlay,
     * it returns the node.
     * @param {Element=} node
     * @return {Element|undefined}
     * @private
     */
    _overlayParent: function(node) {
      while (node && node !== document.body) {
        // Check if it is an overlay.
        if (node._manager === this) {
          return node;
        }
        // Use logical parentNode, or native ShadowRoot host.
        node = Polymer.dom(node).parentNode || node.host;
      }
    },

    /**
     * Returns the deepest overlay in the path.
     * @param {Array<Element>=} path
     * @return {Element|undefined}
     * @suppress {missingProperties}
     * @private
     */
    _overlayInPath: function(path) {
      path = path || [];
      for (var i = 0; i < path.length; i++) {
        if (path[i]._manager === this) {
          return path[i];
        }
      }
    },

    /**
     * Ensures the click event is delegated to the right overlay.
     * @param {!Event} event
     * @private
     */
    _onCaptureClick: function(event) {
      var overlay = /** @type {?} */ (this.currentOverlay());
      // Check if clicked outside of top overlay.
      if (overlay && this._overlayInPath(Polymer.dom(event).path) !== overlay) {
        overlay._onCaptureClick(event);
      }
    },

    /**
     * Ensures the focus event is delegated to the right overlay.
     * @param {!Event} event
     * @private
     */
    _onCaptureFocus: function(event) {
      var overlay = /** @type {?} */ (this.currentOverlay());
      if (overlay) {
        overlay._onCaptureFocus(event);
      }
    },

    /**
     * Ensures TAB and ESC keyboard events are delegated to the right overlay.
     * @param {!Event} event
     * @private
     */
    _onCaptureKeyDown: function(event) {
      var overlay = /** @type {?} */ (this.currentOverlay());
      if (overlay) {
        if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'esc')) {
          overlay._onCaptureEsc(event);
        } else if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'tab')) {
          overlay._onCaptureTab(event);
        }
      }
    },

    /**
     * Returns if the overlay1 should be behind overlay2.
     * @param {!Element} overlay1
     * @param {!Element} overlay2
     * @return {boolean}
     * @suppress {missingProperties}
     * @private
     */
    _shouldBeBehindOverlay: function(overlay1, overlay2) {
      return !overlay1.alwaysOnTop && overlay2.alwaysOnTop;
    }
  };

  Polymer.IronOverlayManager = new Polymer.IronOverlayManagerClass();
(function() {
'use strict';

/**
Use `Polymer.IronOverlayBehavior` to implement an element that can be hidden or shown, and displays
on top of other content. It includes an optional backdrop, and can be used to implement a variety
of UI controls including dialogs and drop downs. Multiple overlays may be displayed at once.

See the [demo source code](https://github.com/PolymerElements/iron-overlay-behavior/blob/master/demo/simple-overlay.html)
for an example.

### Closing and canceling

An overlay may be hidden by closing or canceling. The difference between close and cancel is user
intent. Closing generally implies that the user acknowledged the content on the overlay. By default,
it will cancel whenever the user taps outside it or presses the escape key. This behavior is
configurable with the `no-cancel-on-esc-key` and the `no-cancel-on-outside-click` properties.
`close()` should be called explicitly by the implementer when the user interacts with a control
in the overlay element. When the dialog is canceled, the overlay fires an 'iron-overlay-canceled'
event. Call `preventDefault` on this event to prevent the overlay from closing.

### Positioning

By default the element is sized and positioned to fit and centered inside the window. You can
position and size it manually using CSS. See `Polymer.IronFitBehavior`.

### Backdrop

Set the `with-backdrop` attribute to display a backdrop behind the overlay. The backdrop is
appended to `<body>` and is of type `<iron-overlay-backdrop>`. See its doc page for styling
options.

In addition, `with-backdrop` will wrap the focus within the content in the light DOM.
Override the [`_focusableNodes` getter](#Polymer.IronOverlayBehavior:property-_focusableNodes)
to achieve a different behavior.

### Limitations

The element is styled to appear on top of other content by setting its `z-index` property. You
must ensure no element has a stacking context with a higher `z-index` than its parent stacking
context. You should place this element as a child of `<body>` whenever possible.

@demo demo/index.html
@polymerBehavior Polymer.IronOverlayBehavior
*/

  Polymer.IronOverlayBehaviorImpl = {

    properties: {

      /**
       * True if the overlay is currently displayed.
       */
      opened: {
        observer: '_openedChanged',
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * True if the overlay was canceled when it was last closed.
       */
      canceled: {
        observer: '_canceledChanged',
        readOnly: true,
        type: Boolean,
        value: false
      },

      /**
       * Set to true to display a backdrop behind the overlay. It traps the focus
       * within the light DOM of the overlay.
       */
      withBackdrop: {
        observer: '_withBackdropChanged',
        type: Boolean
      },

      /**
       * Set to true to disable auto-focusing the overlay or child nodes with
       * the `autofocus` attribute` when the overlay is opened.
       */
      noAutoFocus: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay with the ESC key.
       */
      noCancelOnEscKey: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay by clicking outside it.
       */
      noCancelOnOutsideClick: {
        type: Boolean,
        value: false
      },

      /**
       * Contains the reason(s) this overlay was last closed (see `iron-overlay-closed`).
       * `IronOverlayBehavior` provides the `canceled` reason; implementers of the
       * behavior can provide other reasons in addition to `canceled`.
       */
      closingReason: {
        // was a getter before, but needs to be a property so other
        // behaviors can override this.
        type: Object
      },

      /**
       * Set to true to enable restoring of focus when overlay is closed.
       */
      restoreFocusOnClose: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to keep overlay always on top.
       */
      alwaysOnTop: {
        type: Boolean
      },

      /**
       * Shortcut to access to the overlay manager.
       * @private
       * @type {Polymer.IronOverlayManagerClass}
       */
      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      },

      /**
       * The node being focused.
       * @type {?Node}
       */
      _focusedChild: {
        type: Object
      }

    },

    listeners: {
      'iron-resize': '_onIronResize'
    },

    /**
     * The backdrop element.
     * @type {Element}
     */
    get backdropElement() {
      return this._manager.backdropElement;
    },

    /**
     * Returns the node to give focus to.
     * @type {Node}
     */
    get _focusNode() {
      return this._focusedChild || Polymer.dom(this).querySelector('[autofocus]') || this;
    },

    /**
     * Array of nodes that can receive focus (overlay included), ordered by `tabindex`.
     * This is used to retrieve which is the first and last focusable nodes in order
     * to wrap the focus for overlays `with-backdrop`.
     *
     * If you know what is your content (specifically the first and last focusable children),
     * you can override this method to return only `[firstFocusable, lastFocusable];`
     * @type {Array<Node>}
     * @protected
     */
    get _focusableNodes() {
      // Elements that can be focused even if they have [disabled] attribute.
      var FOCUSABLE_WITH_DISABLED = [
        'a[href]',
        'area[href]',
        'iframe',
        '[tabindex]',
        '[contentEditable=true]'
      ];

      // Elements that cannot be focused if they have [disabled] attribute.
      var FOCUSABLE_WITHOUT_DISABLED = [
        'input',
        'select',
        'textarea',
        'button'
      ];

      // Discard elements with tabindex=-1 (makes them not focusable).
      var selector = FOCUSABLE_WITH_DISABLED.join(':not([tabindex="-1"]),') +
        ':not([tabindex="-1"]),' +
        FOCUSABLE_WITHOUT_DISABLED.join(':not([disabled]):not([tabindex="-1"]),') +
        ':not([disabled]):not([tabindex="-1"])';

      var focusables = Polymer.dom(this).querySelectorAll(selector);
      if (this.tabIndex >= 0) {
        // Insert at the beginning because we might have all elements with tabIndex = 0,
        // and the overlay should be the first of the list.
        focusables.splice(0, 0, this);
      }
      // Sort by tabindex.
      return focusables.sort(function (a, b) {
        if (a.tabIndex === b.tabIndex) {
          return 0;
        }
        if (a.tabIndex === 0 || a.tabIndex > b.tabIndex) {
          return 1;
        }
        return -1;
      });
    },

    ready: function() {
      // Used to skip calls to notifyResize and refit while the overlay is animating.
      this.__isAnimating = false;
      // with-backdrop needs tabindex to be set in order to trap the focus.
      // If it is not set, IronOverlayBehavior will set it, and remove it if with-backdrop = false.
      this.__shouldRemoveTabIndex = false;
      // Used for wrapping the focus on TAB / Shift+TAB.
      this.__firstFocusableNode = this.__lastFocusableNode = null;
      // Used for requestAnimationFrame when opened changes.
      this.__openChangedAsync = null;
      // Used for requestAnimationFrame when iron-resize is fired.
      this.__onIronResizeAsync = null;
      this._ensureSetup();
    },

    attached: function() {
      // Call _openedChanged here so that position can be computed correctly.
      if (this.opened) {
        this._openedChanged();
      }
      this._observer = Polymer.dom(this).observeNodes(this._onNodesChange);
    },

    detached: function() {
      Polymer.dom(this).unobserveNodes(this._observer);
      this._observer = null;
      this.opened = false;
    },

    /**
     * Toggle the opened state of the overlay.
     */
    toggle: function() {
      this._setCanceled(false);
      this.opened = !this.opened;
    },

    /**
     * Open the overlay.
     */
    open: function() {
      this._setCanceled(false);
      this.opened = true;
    },

    /**
     * Close the overlay.
     */
    close: function() {
      this._setCanceled(false);
      this.opened = false;
    },

    /**
     * Cancels the overlay.
     * @param {Event=} event The original event
     */
    cancel: function(event) {
      var cancelEvent = this.fire('iron-overlay-canceled', event, {cancelable: true});
      if (cancelEvent.defaultPrevented) {
        return;
      }

      this._setCanceled(true);
      this.opened = false;
    },

    _ensureSetup: function() {
      if (this._overlaySetup) {
        return;
      }
      this._overlaySetup = true;
      this.style.outline = 'none';
      this.style.display = 'none';
    },

    _openedChanged: function() {
      if (this.opened) {
        this.removeAttribute('aria-hidden');
      } else {
        this.setAttribute('aria-hidden', 'true');
      }

      // wait to call after ready only if we're initially open
      if (!this._overlaySetup) {
        return;
      }

      if (this.__openChangedAsync) {
        window.cancelAnimationFrame(this.__openChangedAsync);
      }

      // Synchronously remove the overlay.
      // The adding is done asynchronously to go out of the scope of the event
      // which might have generated the opening.
      if (!this.opened) {
        this._manager.removeOverlay(this);
      }

      // Defer any animation-related code on attached
      // (_openedChanged gets called again on attached).
      if (!this.isAttached) {
        return;
      }

      this.__isAnimating = true;

      // requestAnimationFrame for non-blocking rendering
      this.__openChangedAsync = window.requestAnimationFrame(function() {
        this.__openChangedAsync = null;
        if (this.opened) {
          this._manager.addOverlay(this);
          this._prepareRenderOpened();
          this._renderOpened();
        } else {
          // Move the focus before actually closing.
          this._applyFocus();
          this._renderClosed();
        }
      }.bind(this));
    },

    _canceledChanged: function() {
      this.closingReason = this.closingReason || {};
      this.closingReason.canceled = this.canceled;
    },

    _withBackdropChanged: function() {
      // If tabindex is already set, no need to override it.
      if (this.withBackdrop && !this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '-1');
        this.__shouldRemoveTabIndex = true;
      } else if (this.__shouldRemoveTabIndex) {
        this.removeAttribute('tabindex');
        this.__shouldRemoveTabIndex = false;
      }
      if (this.opened && this.isAttached) {
        this._manager.trackBackdrop();
      }
    },

    /**
     * tasks which must occur before opening; e.g. making the element visible.
     * @protected
     */
    _prepareRenderOpened: function() {

      // Needed to calculate the size of the overlay so that transitions on its size
      // will have the correct starting points.
      this._preparePositioning();
      this.refit();
      this._finishPositioning();

      // Move the focus to the child node with [autofocus].
      this._applyFocus();

      // Safari will apply the focus to the autofocus element when displayed for the first time,
      // so we blur it. Later, _applyFocus will set the focus if necessary.
      if (this.noAutoFocus && document.activeElement === this._focusNode) {
        this._focusNode.blur();
      }
    },

    /**
     * Tasks which cause the overlay to actually open; typically play an animation.
     * @protected
     */
    _renderOpened: function() {
      this._finishRenderOpened();
    },

    /**
     * Tasks which cause the overlay to actually close; typically play an animation.
     * @protected
     */
    _renderClosed: function() {
      this._finishRenderClosed();
    },

    /**
     * Tasks to be performed at the end of open action. Will fire `iron-overlay-opened`.
     * @protected
     */
    _finishRenderOpened: function() {

      this.notifyResize();
      this.__isAnimating = false;

      // Store it so we don't query too much.
      var focusableNodes = this._focusableNodes;
      this.__firstFocusableNode = focusableNodes[0];
      this.__lastFocusableNode = focusableNodes[focusableNodes.length - 1];

      this.fire('iron-overlay-opened');
    },

    /**
     * Tasks to be performed at the end of close action. Will fire `iron-overlay-closed`.
     * @protected
     */
    _finishRenderClosed: function() {
      // Hide the overlay and remove the backdrop.
      this.style.display = 'none';
      // Reset z-index only at the end of the animation.
      this.style.zIndex = '';

      this.notifyResize();
      this.__isAnimating = false;
      this.fire('iron-overlay-closed', this.closingReason);
    },

    _preparePositioning: function() {
      this.style.transition = this.style.webkitTransition = 'none';
      this.style.transform = this.style.webkitTransform = 'none';
      this.style.display = '';
    },

    _finishPositioning: function() {
      // First, make it invisible & reactivate animations.
      this.style.display = 'none';
      // Force reflow before re-enabling animations so that they don't start.
      // Set scrollTop to itself so that Closure Compiler doesn't remove this.
      this.scrollTop = this.scrollTop;
      this.style.transition = this.style.webkitTransition = '';
      this.style.transform = this.style.webkitTransform = '';
      // Now that animations are enabled, make it visible again
      this.style.display = '';
      // Force reflow, so that following animations are properly started.
      // Set scrollTop to itself so that Closure Compiler doesn't remove this.
      this.scrollTop = this.scrollTop;
    },

    /**
     * Applies focus according to the opened state.
     * @protected
     */
    _applyFocus: function() {
      if (this.opened) {
        if (!this.noAutoFocus) {
          this._focusNode.focus();
        }
      } else {
        this._focusNode.blur();
        this._focusedChild = null;
        this._manager.focusOverlay();
      }
    },

    /**
     * Cancels (closes) the overlay. Call when click happens outside the overlay.
     * @param {!Event} event
     * @protected
     */
    _onCaptureClick: function(event) {
      if (!this.noCancelOnOutsideClick) {
        this.cancel(event);
      }
    },

    /**
     * Keeps track of the focused child. If withBackdrop, traps focus within overlay.
     * @param {!Event} event
     * @protected
     */
    _onCaptureFocus: function (event) {
      if (!this.withBackdrop) {
        return;
      }
      var path = Polymer.dom(event).path;
      if (path.indexOf(this) === -1) {
        event.stopPropagation();
        this._applyFocus();
      } else {
        this._focusedChild = path[0];
      }
    },

    /**
     * Handles the ESC key event and cancels (closes) the overlay.
     * @param {!Event} event
     * @protected
     */
    _onCaptureEsc: function(event) {
      if (!this.noCancelOnEscKey) {
        this.cancel(event);
      }
    },

    /**
     * Handles TAB key events to track focus changes.
     * Will wrap focus for overlays withBackdrop.
     * @param {!Event} event
     * @protected
     */
    _onCaptureTab: function(event) {
      if (!this.withBackdrop) {
        return;
      }
      // TAB wraps from last to first focusable.
      // Shift + TAB wraps from first to last focusable.
      var shift = event.shiftKey;
      var nodeToCheck = shift ? this.__firstFocusableNode : this.__lastFocusableNode;
      var nodeToSet = shift ? this.__lastFocusableNode : this.__firstFocusableNode;
      var shouldWrap = false;
      if (nodeToCheck === nodeToSet) {
        // If nodeToCheck is the same as nodeToSet, it means we have an overlay
        // with 0 or 1 focusables; in either case we still need to trap the
        // focus within the overlay.
        shouldWrap = true;
      } else {
        // In dom=shadow, the manager will receive focus changes on the main
        // root but not the ones within other shadow roots, so we can't rely on
        // _focusedChild, but we should check the deepest active element.
        var focusedNode = this._manager.deepActiveElement;
        // If the active element is not the nodeToCheck but the overlay itself,
        // it means the focus is about to go outside the overlay, hence we
        // should prevent that (e.g. user opens the overlay and hit Shift+TAB).
        shouldWrap = (focusedNode === nodeToCheck || focusedNode === this);
      }

      if (shouldWrap) {
        // When the overlay contains the last focusable element of the document
        // and it's already focused, pressing TAB would move the focus outside
        // the document (e.g. to the browser search bar). Similarly, when the
        // overlay contains the first focusable element of the document and it's
        // already focused, pressing Shift+TAB would move the focus outside the
        // document (e.g. to the browser search bar).
        // In both cases, we would not receive a focus event, but only a blur.
        // In order to achieve focus wrapping, we prevent this TAB event and
        // force the focus. This will also prevent the focus to temporarily move
        // outside the overlay, which might cause scrolling.
        event.preventDefault();
        this._focusedChild = nodeToSet;
        this._applyFocus();
      }
    },

    /**
     * Refits if the overlay is opened and not animating.
     * @protected
     */
    _onIronResize: function() {
      if (this.__onIronResizeAsync) {
        window.cancelAnimationFrame(this.__onIronResizeAsync);
        this.__onIronResizeAsync = null;
      }
      if (this.opened && !this.__isAnimating) {
        this.__onIronResizeAsync = window.requestAnimationFrame(function() {
          this.__onIronResizeAsync = null;
          this.refit();
        }.bind(this));
      }
    },

    /**
     * Will call notifyResize if overlay is opened.
     * Can be overridden in order to avoid multiple observers on the same node.
     * @protected
     */
    _onNodesChange: function() {
      if (this.opened && !this.__isAnimating) {
        this.notifyResize();
      }
    }
  };

  /** @polymerBehavior */
  Polymer.IronOverlayBehavior = [Polymer.IronFitBehavior, Polymer.IronResizableBehavior, Polymer.IronOverlayBehaviorImpl];

  /**
   * Fired after the overlay opens.
   * @event iron-overlay-opened
   */

  /**
   * Fired when the overlay is canceled, but before it is closed.
   * @event iron-overlay-canceled
   * @param {Event} event The closing of the overlay can be prevented
   * by calling `event.preventDefault()`. The `event.detail` is the original event that
   * originated the canceling (e.g. ESC keyboard event or click event outside the overlay).
   */

  /**
   * Fired after the overlay closes.
   * @event iron-overlay-closed
   * @param {Event} event The `event.detail` is the `closingReason` property
   * (contains `canceled`, whether the overlay was canceled).
   */

})();
(function() {
      // Keeps track of the toast currently opened.
      var currentToast = null;

      Polymer({
        is: 'paper-toast',

        behaviors: [
          Polymer.IronOverlayBehavior
        ],

        properties: {
          /**
           * The element to fit `this` into.
           * Overridden from `Polymer.IronFitBehavior`.
           */
          fitInto: {
            type: Object,
            value: window,
            observer: '_onFitIntoChanged'
          },

          /**
           * The orientation against which to align the dropdown content
           * horizontally relative to `positionTarget`.
           * Overridden from `Polymer.IronFitBehavior`.
           */
          horizontalAlign: {
            type: String,
            value: 'left'
          },

          /**
           * The orientation against which to align the dropdown content
           * vertically relative to `positionTarget`.
           * Overridden from `Polymer.IronFitBehavior`.
           */
          verticalAlign: {
            type: String,
            value: 'bottom'
          },

          /**
           * The duration in milliseconds to show the toast.
           * Set to `0`, a negative number, or `Infinity`, to disable the
           * toast auto-closing.
           */
          duration: {
            type: Number,
            value: 3000
          },

          /**
           * The text to display in the toast.
           */
          text: {
            type: String,
            value: ''
          },

          /**
           * Overridden from `IronOverlayBehavior`.
           * Set to false to enable closing of the toast by clicking outside it.
           */
          noCancelOnOutsideClick: {
            type: Boolean,
            value: true
          },

          /**
           * Overridden from `IronOverlayBehavior`.
           * Set to true to disable auto-focusing the toast or child nodes with
           * the `autofocus` attribute` when the overlay is opened.
           */
          noAutoFocus: {
            type: Boolean,
            value: true
          }
        },

        listeners: {
          'transitionend': '__onTransitionEnd'
        },

        /**
         * Read-only. Deprecated. Use `opened` from `IronOverlayBehavior`.
         * @property visible
         * @deprecated
         */
        get visible() {
          Polymer.Base._warn('`visible` is deprecated, use `opened` instead');
          return this.opened;
        },

        /**
         * Read-only. Can auto-close if duration is a positive finite number.
         * @property _canAutoClose
         */
        get _canAutoClose() {
          return this.duration > 0 && this.duration !== Infinity;
        },

        created: function() {
          this._autoClose = null;
          Polymer.IronA11yAnnouncer.requestAvailability();
        },

        /**
         * Show the toast. Without arguments, this is the same as `open()` from `IronOverlayBehavior`.
         * @param {(Object|string)=} properties Properties to be set before opening the toast.
         * e.g. `toast.show('hello')` or `toast.show({text: 'hello', duration: 3000})`
         */
        show: function(properties) {
          if (typeof properties == 'string') {
            properties = { text: properties };
          }
          for (var property in properties) {
            if (property.indexOf('_') === 0) {
              Polymer.Base._warn('The property "' + property + '" is private and was not set.');
            } else if (property in this) {
              this[property] = properties[property];
            } else {
              Polymer.Base._warn('The property "' + property + '" is not valid.');
            }
          }
          this.open();
        },

        /**
         * Hide the toast. Same as `close()` from `IronOverlayBehavior`.
         */
        hide: function() {
          this.close();
        },

        /**
         * Called on transitions of the toast, indicating a finished animation
         * @private
         */
        __onTransitionEnd: function(e) {
          // there are different transitions that are happening when opening and
          // closing the toast. The last one so far is for `opacity`.
          // This marks the end of the transition, so we check for this to determine if this
          // is the correct event.
          if (e && e.target === this && e.propertyName === 'opacity') {
            if (this.opened) {
              this._finishRenderOpened();
            } else {
              this._finishRenderClosed();
            }
          }
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         * Called when the value of `opened` changes.
         */
        _openedChanged: function() {
          if (this._autoClose !== null) {
            this.cancelAsync(this._autoClose);
            this._autoClose = null;
          }
          if (this.opened) {
            if (currentToast && currentToast !== this) {
              currentToast.close();
            }
            currentToast = this;
            this.fire('iron-announce', {
              text: this.text
            });
            if (this._canAutoClose) {
              this._autoClose = this.async(this.close, this.duration);
            }
          } else if (currentToast === this) {
            currentToast = null;
          }
          Polymer.IronOverlayBehaviorImpl._openedChanged.apply(this, arguments);
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderOpened: function() {
          this.classList.add('paper-toast-open');
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderClosed: function() {
          this.classList.remove('paper-toast-open');
        },

        /**
         * @private
         */
        _onFitIntoChanged: function(fitInto) {
          this.positionTarget = fitInto;
        }

        /**
         * Fired when `paper-toast` is opened.
         *
         * @event 'iron-announce'
         * @param {{text: string}} detail Contains text that will be announced.
         */
      });
    })();
(function(){
/**
`iron-signals` provides basic publish-subscribe functionality.

Note: avoid using `iron-signals` whenever you can use
a controller (parent element) to mediate communication
instead.

To send a signal, fire a custom event of type `iron-signal`, with
a detail object containing `name` and `data` fields.

    this.fire('iron-signal', {name: 'hello', data: null});

To receive a signal, listen for `iron-signal-<name>` event on a
`iron-signals` element.

  <iron-signals on-iron-signal-hello="{{helloSignal}}">

You can fire a signal event from anywhere, and all
`iron-signals` elements will receive the event, regardless
of where they are in DOM.

@demo demo/index.html
*/
  Polymer({
    is: 'iron-signals',

    attached: function() {
      signals.push(this);
    },
    detached: function() {
      var i = signals.indexOf(this);
      if (i >= 0) {
        signals.splice(i, 1);
      }
    }
  });

  // private shared database
  var signals = [];

  // signal dispatcher
  function notify(name, data) {
    // convert generic-signal event to named-signal event
    var signal = new CustomEvent('iron-signal-' + name, {
      // if signals bubble, it's easy to get confusing duplicates
      // (1) listen on a container on behalf of local child
      // (2) some deep child ignores the event and it bubbles
      //     up to said container
      // (3) local child event bubbles up to container
      // also, for performance, we avoid signals flying up the
      // tree from all over the place
      bubbles: false,
      detail: data
    });
    // dispatch named-signal to all 'signals' instances,
    // only interested listeners will react
    signals.forEach(function(s) {
      s.dispatchEvent(signal);
    });
  }

  // signal listener at document
  document.addEventListener('iron-signal', function(e) {
    notify(e.detail.name, e.detail.data);
  });

})();
/**
   * The `<platinum-sw-offline-analytics>` element registers a service worker handler to
   * intercepts requests for Google Analytics pings.
   *
   * If the HTTP GET for the ping is successful (because the browser is online), then everything
   * proceeds as it normally would. If the HTTP GET fails, the ping request is saved to IndexedDB, and each time the service worker
   * script starts up it will attempt to "replay" those saved ping requests, giving up after one day
   * has passed.
   *
   * The [`qt`](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt)
   * URL parameter is automatically added to the replayed HTTP GET and set to the number of
   * milliseconds that has passed since the initial ping request was attempted, to ensure that the
   * original time attribution is correct.
   *
   * `<platinum-sw-offline-analytics>` does not take care of setting up Google Analytics on your
   * page, and assumes that you have [properly configured](https://support.google.com/analytics/answer/1008080)
   * Google Analytics tracking code registered elsewhere on your page.
   *
   * Since `<platinum-sw-offline-analytics>` is only useful if the page that is being tracked with
   * Google Analytics works offline, it's best used in conjunction with the `<platinum-sw-cache>`
   * element, which takes care of caching your site's resources and serving them while offline.
   *
   * A basic configuration is
   *
   *     <platinum-sw-register auto-register>
   *       <platinum-sw-offline-analytics></platinum-sw-offline-analytics>
   *       <platinum-sw-cache></platinum-sw-cache>
   *     </platinum-sw-register>
   *
   */
  Polymer({
    is: 'platinum-sw-offline-analytics',

    _getParameters: function(baseURI) {
      return Promise.resolve({
        importscript: new URL('bootstrap/simple-db.js', baseURI).href,
        importscriptLate: [
          new URL('bootstrap/sw-toolbox-setup.js', baseURI).href,
          new URL('bootstrap/offline-analytics.js', baseURI).href
        ]
      });
    }
  });
/**
   * The `<platinum-sw-register>` element handles
   * [service worker](http://www.html5rocks.com/en/tutorials/service-worker/introduction/)
   * registration, reflects the overall service worker state, and coordinates the configuration
   * provided by other Service Worker Elements.
   * `<platinum-sw-register>` is used as a parent element for child elements in the
   * `<platinum-sw-*>` group.
   *
   *     <platinum-sw-register skip-waiting
   *                           clients-claim
   *                           auto-register
   *                           state="{{state}}"
   *                           on-service-worker-error="handleSWError"
   *                           on-service-worker-updated="handleSWUpdated"
   *                           on-service-worker-installed="handleSWInstalled">
   *       ...one or more <platinum-sw-*> children which share the service worker registration...
   *     </platinum-sw-register>
   *
   * Please see https://github.com/PolymerElements/platinum-sw#top-level-sw-importjs for a
   * *crucial* prerequisite file you must create before `<platinum-sw-register>` can be used!
   *
   * @demo demo/index.html An offline-capable eReader demo.
   */
  Polymer({
    is: 'platinum-sw-register',

    // Used as an "emergency" switch if we make breaking changes in the way <platinum-sw-register>
    // talks to service-worker.js. Otherwise, it shouldn't need to change, and isn't meant to be
    // kept in sync with the element's release number.
    _version: '1.0',

    /**
     * Fired when the initial service worker installation completes successfully.
     * The service worker will normally only be installed once, the first time a page with a
     * `<platinum-sw-register>` element is visited in a given browser. If the same page is visited
     * again, the existing service worker will be reused, and there won't be another
     * `service-worker-installed` fired.
     *
     * @event service-worker-installed
     * @param {String} A message indicating that the installation succeeded.
     */

    /**
     * Fired when the service worker update flow completes successfully.
     * If you make changes to your `<platinum-sw-register>` configuration (i.e. by adding in new
     * `<platinum-sw-*>` child elements, or changing their attributes), users who had the old
     * service worker installed will get the update installed when they see the modified elements.
     *
     * @event service-worker-updated
     * @param {String} A message indicating that the update succeeded.
     */

    /**
     * Fired when an error prevents the service worker installation from completing.
     *
     * @event service-worker-error
     * @param {String} A message indicating what went wrong.
     */

    properties: {
      /**
       * Whether this element should automatically register the corresponding service worker as
       * soon as its added to a page.
       *
       * If set to `false`, then the service worker won't be automatically registered, and you
       * must call this element's `register()` method if you want service worker functionality.
       * This is useful if, for example, the service worker needs to be configured using
       * information that isn't immediately available at the time the page loads.
       *
       * If set to `true`, the service worker will be automatically registered without having to
       * call any methods.
       */
      autoRegister: {
        type: Boolean,
        value: false
      },

      /**
       * The URI used as a base when constructing relative paths to service worker helper libraries
       * that need to be loaded.
       *
       * This can normally be kept set to the default, which will use the directory containing this
       * element as the base. However, if you [Vulcanize](https://github.com/polymer/vulcanize) your
       * elements, then the default base might not be appropriate anymore. This will allow you to
       * override it.
       *
       * See https://github.com/PolymerElements/platinum-sw#relative-paths--vulcanization for more
       * information.
       */
      baseUri: {
        type: String,
        // Grab the URI of this file to use as a base when resolving relative paths.
        // See https://github.com/webcomponents/webcomponentsjs/blob/88240ba9ef4cebb1579e07f7888c7b58ec017a39/src/HTMLImports/base.js#L31
        // for background on document._currentScript. We want to support document.currentScript
        // as well, on the off chance that the polyfills aren't loaded.
        // Fallback to './' as a default, though current browsers that don't support
        // document.currentScript also don't support service workers.
        value: document._currentScript ? document._currentScript.baseURI :
          (document.currentScript ? document.currentScript.baseURI : './')
      },

      /**
       * Whether the activated service worker should [take immediate control](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#clients-claim-method)
       * of any pages under its scope.
       *
       * If this is `false`, the service worker won't have any effect until the next time the page
       * is visited/reloaded.
       * If this is `true`, it will take control and start handling events for the current page
       * (and any pages under the same scope open in other tabs/windows) as soon it's active.
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#clients-claim-method}
       */
      clientsClaim: {
        type: Boolean,
        value: false
      },

      /**
       * The service worker script that is [registered](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register).
       * The script *should* be located at the top level of your site, to ensure that it is able
       * to control all the pages on your site.
       *
       * It's *strongly* recommended that you create a top-level file named `sw-import.js`
       * containing only:
       *
       * `importScripts('bower_components/platinum-sw/service-worker.js');`
       *
       * (adjust to match the path where your `platinum-sw` element directory can be found).
       *
       * This will ensure that your service worker script contains everything needed to play
       * nicely with the Service Worker Elements group.
       *
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register}
       */
      href: {
        type: String,
        value: 'sw-import.js'
      },

      /**
       * Whether the page should be automatically reloaded (via `window.location.reload()`) when
       * the service worker is successfully installed.
       *
       * While it's perfectly valid to continue using a page with a freshly installed service
       * worker, it's a common pattern to want to reload it immediately following the install.
       * This ensures that, for example, if you're using a `<platinum-sw-cache>` with an on the
       * fly caching strategy, it will get a chance to intercept all the requests needed to render
       * your page and store them in the cache.
       *
       * If you don't immediately reload your page, then any resources that were loaded before the
       * service worker was installed (e.g. this `platinum-sw-register.html` file) won't be present
       * in the cache until the next time the page is loaded.
       *
       * Note that this reload will only happen when a service worker is installed for the first
       * time. If the service worker is subsequently updated, it won't trigger another reload.
       */
      reloadOnInstall: {
        type: Boolean,
        value: false
      },

      /**
       * By default, the service worker will use a scope that applies to all pages at the same
       * directory level or lower. This is almost certainly what you want, as illustrated by the
       * following hypothetical serving setup:
       *
       * ```
       * /root/
       *   service-worker.js
       *   index.html
       *   subdir1/
       *     index.html
       *   subdir2/
       *     index.html
       * ```
       *
       * So by default, registering `/root/service-worker.js` will cause the service worker's scope
       * to cover `/root/index.html`, `/root/subdir1/index.html`, and /root/subdir2/index.html`.
       *
       * If, for some reason, you need to register `/root/service-worker.js` from within
       * `/root/subdir1/index.html`, *and* you want that registration to only cover
       * `/root/subdir1/**`, you can override this `scope` property and set it to `'./'`.
       *
       * There is more context about default scopes and how scope overrides work in
       * [this Stack Overflow](http://stackoverflow.com/a/33881341/385997) response.
       *
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register}
       */
      scope: {
        type: String,
        value: null
      },

      /**
       * Whether an updated service worker should [bypass the `waiting` state](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#service-worker-global-scope-skipwaiting)
       * and immediately become `active`.
       *
       * Normally, during an update, the new service worker stays in the
       * `waiting` state until the current page and any other tabs/windows that are using the old
       * service worker are unloaded.
       *
       * If this is `false`, an updated service worker won't be activated until all instances of
       * the old server worker have been unloaded.
       *
       * If this is `true`, an updated service worker will become `active` immediately.
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#service-worker-global-scope-skipwaiting}
       */
      skipWaiting: {
        type: Boolean,
        value: false
      },

      /**
       * The current state of the service worker registered by this element.
       *
       * One of:
       * - 'installed'
       * - 'updated'
       * - 'error'
       * - 'unsupported'
       */
      state: {
        notify: true,
        readOnly: true,
        type: String
      }
    },

    /**
     * Registers the service worker based on the configuration options in this element and any
     * child elements.
     *
     * If you set the `autoRegister` property to `true`, then this method is called automatically
     * at page load.
     * It can be useful to set `autoRegister` to `false` and then explicitly call this method if
     * there are options that are only configured after the page is loaded.
     */
    register: function() {
      if ('serviceWorker' in navigator) {
        this._constructServiceWorkerUrl().then(function(serviceWorkerUrl) {
          this._registerServiceWorker(serviceWorkerUrl);
        }.bind(this));
      } else {
        this._setState('unsupported');
        this.fire('service-worker-error', 'Service workers are not available in the current browser.');
      }
    },

    _constructServiceWorkerUrl: function() {
      var paramsPromises = [];
      var children = Polymer.dom(this).children;
      var baseUri = new URL(this.baseUri, window.location.href);

      for (var i = 0; i < children.length; i++) {
        if (typeof children[i]._getParameters === 'function') {
          paramsPromises.push(children[i]._getParameters(baseUri));
        }
      }

      return Promise.all(paramsPromises).then(function(paramsResolutions) {
        var params = {
          baseURI: baseUri,
          version: this._version
        };

        paramsResolutions.forEach(function(childParams) {
          Object.keys(childParams).forEach(function(key) {
            if (Array.isArray(params[key])) {
              params[key] = params[key].concat(childParams[key]);
            } else {
              params[key] = [].concat(childParams[key]);
            }
          });
        });

        return params;
      }.bind(this)).then(function(params) {
        if (params.importscriptLate) {
          if (params.importscript) {
            params.importscript = params.importscript.concat(params.importscriptLate);
          } else {
            params.importscript = params.importscriptLate;
          }
        }

        if (params.importscript) {
          params.importscript = this._unique(params.importscript);
        }

        // We've already concatenated importscriptLate, so don't include it in the serialized URL.
        delete params.importscriptLate;

        params.clientsClaim = this.clientsClaim;
        params.skipWaiting = this.skipWaiting;

        var serviceWorkerUrl = new URL(this.href, window.location);
        // It's very important to ensure that the serialization is stable.
        // Serializing the same settings should always produce the same URL.
        // Serializing different settings should always produce a different URL.
        // This ensures that the service worker upgrade flow is triggered when settings change.
        serviceWorkerUrl.search = this._serializeUrlParams(params);

        return serviceWorkerUrl;
      }.bind(this));
    },

    _unique: function(arr) {
      return arr.filter(function(item, index) {
        return arr.indexOf(item) === index;
      });
    },

    _serializeUrlParams: function(params) {
      return Object.keys(params).sort().map(function(key) {
        // encodeURIComponent(['a', 'b']) => 'a%2Cb',
        // so this will still work when the values are Arrays.
        // TODO: It won't work if the values in the Arrays have ',' characters in them.
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      }).join('&');
    },

    _registerServiceWorker: function(serviceWorkerUrl) {
      var options = this.scope ? {scope: this.scope} : null;
      navigator.serviceWorker.register(serviceWorkerUrl, options).then(function(registration) {
        if (registration.active) {
          this._setState('installed');
        }

        registration.onupdatefound = function() {
          var installingWorker = registration.installing;
          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  this._setState('updated');
                  this.fire('service-worker-updated',
                    'A new service worker was installed, replacing the old service worker.');
                } else {
                  if (this.reloadOnInstall) {
                    window.location.reload();
                  } else {
                    this._setState('installed');
                    this.fire('service-worker-installed', 'A new service worker was installed.');
                  }
                }
              break;

              case 'redundant':
                this._setState('error');
                this.fire('service-worker-error', 'The installing service worker became redundant.');
              break;
            }
          }.bind(this);
        }.bind(this);
      }.bind(this)).catch(function(error) {
        this._setState('error');
        this.fire('service-worker-error', error.toString());
        if (error.name === 'NetworkError') {
          var location = serviceWorkerUrl.origin + serviceWorkerUrl.pathname;
          console.error('A valid service worker script was not found at ' + location + '\n' +
            'To learn how to fix this, please see\n' +
            'https://github.com/PolymerElements/platinum-sw#top-level-sw-importjs');
        }
      }.bind(this));
    },

    attached: function() {
      if (this.autoRegister) {
        this.async(this.register);
      }
    }
  });
/**
   * The `<platinum-sw-cache>` element makes it easy to precache specific resources, perform runtime
   * caching, and serve your cached resources when a network is unavailable.
   * Under the hood, the [sw-toolbox](https://github.com/googlechrome/sw-toolbox) library is used
   * for all the caching and request handling logic.
   * `<platinum-sw-cache>` needs to be a child element of `<platinum-sw-register>`.
   * A simple, yet useful configuration is
   *
   *     <platinum-sw-register auto-register>
   *       <platinum-sw-cache></platinum-sw-cache>
   *     </platinum-sw-register>
   *
   * This is enough to have all of the resources your site uses cached at runtime, both local and
   * cross-origin.
   * (It uses the default `defaultCacheStrategy` of "networkFirst".)
   * When there's a network available, visits to your site will go against the network copy of the
   * resources, but if someone visits your site when they're offline, all the cached resources will
   * be used.
   *
   * @demo demo/index.html An offline-capable eReader demo.
   */
  Polymer({
    is: 'platinum-sw-cache',

    properties: {
      /**
       * Used to configure `<platinum-sw-precache>` behavior via a JSON file instead of via
       * attributes. This can come in handy when the configuration (e.g. which files to precache)
       * depends on the results of a build script.
       *
       * If configuration for the same properties are provided in both the JSON file and via the
       * element's attributes, then in general the JSON file's values take precedence. The one
       * exception is the `precache` property. Any values in the element's `precache` attribute will
       * be concatenated with the values in the JSON file's `precache` property and the set of files
       * that are precached will be the union of the two.
       *
       * There's one additional option, `precacheFingerprint`, that can be set in the JSON. If using
       * a build script that might output a large number of files to precache, its recommended
       * that your build script generate a unique "fingerprint" of the files. Any changes to the
       * `precacheFingerprint` value will result in the underlying service worker kicking off the
       * process of caching the files listed in `precache`.
       * While there are a few different strategies for generating an appropriate
       * `precacheFingerprint` value, a process that makes sense is to use a stable hash of the
       * serialized `precache` array. That way, any changes to the list of files in `precache`
       * will result in a new `precacheFingerprint` value.
       * If your build script is Node.js based, one way to generate this hash is:
       *
       *     var md5 = require('crypto').createHash('md5');
       *     md5.update(JSON.stringify(precache));
       *     var precacheFingerprint = md5.digest('hex');
       *
       * Alternatively, you could use something like the
       * [SHA-1 signature](http://stackoverflow.com/questions/1161869/how-to-get-sha-of-the-latest-commit-from-remote-git-repository)
       * of your latest `git` commit for the `precacheFingerprint` value.
       *
       * An example file may look like:
       *
       *     {
       *       "cacheId": "my-cache-id",
       *       "defaultCacheStrategy": "fastest",
       *       "disabled": false,
       *       "precache": ["file1.html", "file2.css"],
       *       "precacheFingerprint": "FINGERPRINT_OF_FILES_IN_PRECACHE"
       *     }
       */
      cacheConfigFile: String,

      /**
       * An id used to construct the name for the
       * [Cache](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#cache)
       * in which all the resources will be stored.
       *
       * If nothing is provided, the default value set in
       * [`toolbox.options.cacheName`](https://github.com/GoogleChrome/sw-toolbox/blob/8763dcc9fbc9352d58f184050e2131c42f7b6d68/lib/options.js#L28)
       * will be used.
       *
       * The `cacheId` is combined with the service worker's scope to construct the cache name, so
       * two `<platinum-sw-cache>` elements that are associated with different scopes will use
       * different caches.
       */
      cacheId: String,

      /**
       * The caching strategy used for all requests, both for local and cross-origin resources.
       *
       * For a list of strategies, see the [`sw-toolbox` documentation](https://github.com/GoogleChrome/sw-toolbox#built-in-handlers).
       * Specify a strategy as a string, without the "toolbox" prefix. E.g., for
       * `toolbox.networkFirst`, set `defaultCacheStrategy` to "networkFirst".
       *
       * Note that the "cacheFirst" and "cacheOnly" strategies are not recommended, and may be
       * explicitly prevented in a future release. More information can be found at
       * https://github.com/PolymerElements/platinum-sw#cacheonly--cachefirst-defaultcachestrategy-considered-harmful
       *
       * @see {@link https://github.com/GoogleChrome/sw-toolbox#built-in-handlers}
       */
      defaultCacheStrategy: {
        type: String,
        value: 'networkFirst'
      },

      /**
       * If set to true, this element will not set up service worker caching. This is useful to
       * conditionally enable or disable caching depending on the build environment.
       */
      disabled: {
        type: Boolean,
        value: false
      },

      /**
       * Used to provide a list of URLs that are always precached as soon as the service worker is
       * installed. Corresponds to  [`sw-toolbox`'s `precache()` method](https://github.com/GoogleChrome/sw-toolbox#toolboxprecachearrayofurls).
       *
       * This is useful for URLs that that wouldn't necessarily be picked up by runtime caching,
       * i.e. a list of resources that are needed by one of the subpages of your site, or a list of
       * resources that are only loaded via user interaction.
       *
       * `precache` can be used in conjunction with `cacheConfigFile`, and the two arrays will be
       * concatenated.
       *
       * @see {@link https://github.com/GoogleChrome/sw-toolbox#toolboxprecachearrayofurls}
       */
      precache: {
        type: Array,
        value: function() { return []; }
      }
    },

    _getParameters: function(baseURI) {
      return new Promise(function(resolve) {
        var params = {
          importscriptLate: new URL('bootstrap/sw-toolbox-setup.js', baseURI).href,
          defaultCacheStrategy: this.defaultCacheStrategy,
          precache: this.precache
        };

        if (this.cacheConfigFile) {
          params.cacheConfigFile = this.cacheConfigFile;
          window.fetch(this.cacheConfigFile).then(function(response) {
            if (!response.ok) {
              throw Error('unable to load ' + this.cacheConfigFile);
            }
            return response.json();
          }.bind(this)).then(function(config) {
            this.disabled = config.disabled;
            if (this.disabled) {
              // Use an empty set of parameters to effectively disable caching.
              params = {};
            } else {
              // If there's a hash of the list of files to precache provided in the config file,
              // then copy that over to the params that will be used to construct the service worker
              // URL. This works around the issue where a potentially large number of precache
              // files could result in a longer URL than a browser will allow.
              // The actual list of files to precache (in config.precache) will be dealt by the
              // service worker during the install phase, so we can ignore it here.
              // See https://github.com/PolymerElements/platinum-sw/issues/53
              if (config.precacheFingerprint) {
                params.precacheFingerprint = config.precacheFingerprint;
              } else {
                params.precache = params.precache.concat(config.precache);
              }
              params.cacheId = config.cacheId || params.cacheId;
              params.defaultCacheStrategy = config.defaultCacheStrategy ||
                params.defaultCacheStrategy;
            }
          }.bind(this)).catch(function(error) {
            console.info('Skipping precaching: ' + error.message);
          }).then(function() {
            resolve(params);
          });
        } else {
          resolve(params);
        }
      }.bind(this));
    }
  });
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                m=s.getElementsByTagName('link')[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
              })(window,document,'script','scripts/analytics.js','ga');

    (function() {
        Polymer({
            is: 'start-google-analytics-tracker',
            properties: {
                /**
                 * The Google analytics property id
                 */
                code: {
                    type: String
                },
                /**
                 * Optional user id, set this for a use authenticated with your service
                 * https://developers.google.com/analytics/devguides/collection/analyticsjs/user-id
                 */
                userId: {
                    type: String,
                    notify: true
                }
            },
            listeners: {
                'track-event': 'trackEvent',
                'track-page': 'trackPage',
                'user-id-changed': 'userIDChanged'
            },
            ready: function() {
                //console.log("setup GS for "+this.code);
                ga('create', this.code, 'auto');
                this.trackPage();
            },
            trackEvent: function(e) {
                //Add support for a non-interactin even that does not effect bounce rates - eg things that happen after a timeout
                //ga('send', 'event', 'category', 'action', {'nonInteraction': 1});
                ga('send', 'event', e.detail.category, e.detail.action, e.detail.label, e.detail.value);
            },
            trackPage: function(e) {
                //Use set param, this way if we then send a subsequent event on the page it will be correctly associated with the same page
                if (e != undefined && e.detail.path !== undefined) {
                    ga('set', 'page', e.detail.path);
                }
                ga('send', 'pageview');
            },
            userIDChanged: function(e) {
                ga('set', '&uid', this.userId);
            }
        });
    })();
Polymer({
      is: 'iron-image',

      properties: {
        /**
         * The URL of an image.
         */
        src: {
          observer: '_srcChanged',
          type: String,
          value: ''
        },

        /**
         * A short text alternative for the image.
         */
        alt: {
          type: String,
          value: null
        },

        /**
         * When true, the image is prevented from loading and any placeholder is
         * shown.  This may be useful when a binding to the src property is known to
         * be invalid, to prevent 404 requests.
         */
        preventLoad: {
          type: Boolean,
          value: false,
          observer: '_preventLoadChanged'
        },

        /**
         * Sets a sizing option for the image.  Valid values are `contain` (full
         * aspect ratio of the image is contained within the element and
         * letterboxed) or `cover` (image is cropped in order to fully cover the
         * bounds of the element), or `null` (default: image takes natural size).
         */
        sizing: {
          type: String,
          value: null,
          reflectToAttribute: true
        },

        /**
         * When a sizing option is used (`cover` or `contain`), this determines
         * how the image is aligned within the element bounds.
         */
        position: {
          type: String,
          value: 'center'
        },

        /**
         * When `true`, any change to the `src` property will cause the `placeholder`
         * image to be shown until the new image has loaded.
         */
        preload: {
          type: Boolean,
          value: false
        },

        /**
         * This image will be used as a background/placeholder until the src image has
         * loaded.  Use of a data-URI for placeholder is encouraged for instant rendering.
         */
        placeholder: {
          type: String,
          value: null,
          observer: '_placeholderChanged'
        },

        /**
         * When `preload` is true, setting `fade` to true will cause the image to
         * fade into place.
         */
        fade: {
          type: Boolean,
          value: false
        },

        /**
         * Read-only value that is true when the image is loaded.
         */
        loaded: {
          notify: true,
          readOnly: true,
          type: Boolean,
          value: false
        },

        /**
         * Read-only value that tracks the loading state of the image when the `preload`
         * option is used.
         */
        loading: {
          notify: true,
          readOnly: true,
          type: Boolean,
          value: false
        },

        /**
         * Read-only value that indicates that the last set `src` failed to load.
         */
        error: {
          notify: true,
          readOnly: true,
          type: Boolean,
          value: false
        },

        /**
         * Can be used to set the width of image (e.g. via binding); size may also be
         * set via CSS.
         */
        width: {
          observer: '_widthChanged',
          type: Number,
          value: null
        },

        /**
         * Can be used to set the height of image (e.g. via binding); size may also be
         * set via CSS.
         *
         * @attribute height
         * @type number
         * @default null
         */
        height: {
          observer: '_heightChanged',
          type: Number,
          value: null
        },
      },

      observers: [
        '_transformChanged(sizing, position)'
      ],

      ready: function() {
        var img = this.$.img;

        img.onload = function() {
          if (this.$.img.src !== this._resolveSrc(this.src)) return;

          this._setLoading(false);
          this._setLoaded(true);
          this._setError(false);
        }.bind(this);

        img.onerror = function() {
          if (this.$.img.src !== this._resolveSrc(this.src)) return;

          this._reset();

          this._setLoading(false);
          this._setLoaded(false);
          this._setError(true);
        }.bind(this);

        this._resolvedSrc = '';
      },

      _load: function(src) {
        if (src) {
          this.$.img.src = src;
        } else {
          this.$.img.removeAttribute('src');
        }
        this.$.sizedImgDiv.style.backgroundImage = src ? 'url("' + src + '")' : '';

        this._setLoading(!!src);
        this._setLoaded(false);
        this._setError(false);
      },

      _reset: function() {
        this.$.img.removeAttribute('src');
        this.$.sizedImgDiv.style.backgroundImage = '';

        this._setLoading(false);
        this._setLoaded(false);
        this._setError(false);
      },

      _computePlaceholderHidden: function() {
        return !this.preload || (!this.fade && !this.loading && this.loaded);
      },

      _computePlaceholderClassName: function() {
        return (this.preload && this.fade && !this.loading && this.loaded) ? 'faded-out' : '';
      },

      _computeImgDivHidden: function() {
        return !this.sizing;
      },

      _computeImgDivARIAHidden: function() {
        return this.alt === '' ? 'true' : undefined;
      },

      _computeImgDivARIALabel: function() {
        if (this.alt !== null) {
          return this.alt;
        }

        // Polymer.ResolveUrl.resolveUrl will resolve '' relative to a URL x to
        // that URL x, but '' is the default for src.
        if (this.src === '') {
          return '';
        }

        var pathComponents = (new URL(this._resolveSrc(this.src))).pathname.split("/");
        return pathComponents[pathComponents.length - 1];
      },

      _computeImgHidden: function() {
        return !!this.sizing;
      },

      _widthChanged: function() {
        this.style.width = isNaN(this.width) ? this.width : this.width + 'px';
      },

      _heightChanged: function() {
        this.style.height = isNaN(this.height) ? this.height : this.height + 'px';
      },

      _preventLoadChanged: function() {
        if (this.preventLoad || this.loaded) return;

        this._reset();
        this._load(this.src);
      },

      _srcChanged: function(newSrc, oldSrc) {
        var newResolvedSrc = this._resolveSrc(newSrc);
        if (newResolvedSrc === this._resolvedSrc) return;
        this._resolvedSrc = newResolvedSrc;

        this._reset();
        if (!this.preventLoad) {
          this._load(newSrc);
        }
      },

      _placeholderChanged: function() {
        this.$.placeholder.style.backgroundImage =
          this.placeholder ? 'url("' + this.placeholder + '")' : '';
      },

      _transformChanged: function() {
        var sizedImgDivStyle = this.$.sizedImgDiv.style;
        var placeholderStyle = this.$.placeholder.style;

        sizedImgDivStyle.backgroundSize =
        placeholderStyle.backgroundSize =
          this.sizing;

        sizedImgDivStyle.backgroundPosition =
        placeholderStyle.backgroundPosition =
          this.sizing ? this.position : '';

        sizedImgDivStyle.backgroundRepeat =
        placeholderStyle.backgroundRepeat =
          this.sizing ? 'no-repeat' : '';
      },

      _resolveSrc: function(testSrc) {
        return Polymer.ResolveUrl.resolveUrl(testSrc, this.ownerDocument.baseURI);
      }
    });
(function() {

  'use strict';

  Polymer.PaperScrollHeaderPanel = Polymer({

    /**
     * Fired when the content has been scrolled.
     *
     * @event content-scroll
     */

    /**
     * Fired when the header is transformed.
     *
     * @event paper-header-transform
     */

    is: 'paper-scroll-header-panel',

    behaviors: [
      Polymer.IronResizableBehavior
    ],

    properties: {

      /**
       * If true, the header's height will condense to `condensedHeaderHeight`
       * as the user scrolls down from the top of the content area.
       */
      condenses: {
        type: Boolean,
        value: false
      },

      /**
       * If true, no cross-fade transition from one background to another.
       */
      noDissolve: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the header doesn't slide back in when scrolling back up.
       */
      noReveal: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the header is fixed to the top and never moves away.
       */
      fixed: {
        type: Boolean,
        value: false
      },

      /**
       * If true, the condensed header is always shown and does not move away.
       */
      keepCondensedHeader: {
        type: Boolean,
        value: false
      },

      /**
       * The height of the header when it is at its full size.
       *
       * By default, the height will be measured when it is ready.  If the height
       * changes later the user needs to either set this value to reflect the
       * new height or invoke `measureHeaderHeight()`.
       */
      headerHeight: {
        type: Number,
        value: 0
      },

      /**
       * The height of the header when it is condensed.
       *
       * By default, `condensedHeaderHeight` is 1/3 of `headerHeight` unless
       * this is specified.
       */
      condensedHeaderHeight: {
        type: Number,
        value: 0
      },

      /**
       * By default, the top part of the header stays when the header is being
       * condensed.  Set this to true if you want the top part of the header
       * to be scrolled away.
       */
      scrollAwayTopbar: {
        type: Boolean,
        value: false
      },

      /**
       * The state of the header. Depending on the configuration and the `scrollTop` value,
       * the header state could change to
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_EXPANDED
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_HIDDEN
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_CONDENSED
       *      Polymer.PaperScrollHeaderPanel.HEADER_STATE_INTERPOLATED
       */
      headerState: {
        type: Number,
        readOnly: true,
        notify:true,
        value: 0
      },

      /** @type {number|null} */
      _defaultCondsensedHeaderHeight: {
        type: Number,
        value: 0
      }
    },

    observers: [
      '_setup(headerHeight, condensedHeaderHeight, fixed)',
      '_condensedHeaderHeightChanged(condensedHeaderHeight)',
      '_headerHeightChanged(headerHeight, condensedHeaderHeight)',
      '_condensesChanged(condenses)',
    ],

    listeners: {
      'iron-resize': 'measureHeaderHeight'
    },

    ready: function() {
      this._scrollHandler = this._scroll.bind(this);
      this.scroller.addEventListener('scroll', this._scrollHandler);
    },

    attached: function() {
      this.async(this.measureHeaderHeight, 1);
    },

    /**
     * Returns the header element.
     *
     * @property header
     * @type Object
     */
    get header() {
      return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
    },

    /**
     * Returns the content element.
     *
     * @property content
     * @type Object
     */
    get content() {
      return Polymer.dom(this.$.mainContent).getDistributedNodes()[0];
    },

    /**
     * Returns the scrollable element.
     *
     * @property scroller
     * @type Object
     */
    get scroller() {
      return this.$.mainContainer;
    },

    get _headerMaxDelta() {
      return this.keepCondensedHeader ? this._headerMargin : this.headerHeight;
    },

    get _headerMargin() {
      return this.headerHeight - this.condensedHeaderHeight;
    },

    _y: 0,

    _prevScrollTop: 0,

    /**
     * Invoke this to tell `paper-scroll-header-panel` to re-measure the header's
     * height.
     *
     * @method measureHeaderHeight
     */
    measureHeaderHeight: function() {
      var header = this.header;
      if (header && header.offsetHeight) {
        this.headerHeight = header.offsetHeight;
      }
    },

    /**
     * Scroll to a specific y coordinate.
     *
     * @method scroll
     * @param {number} top The coordinate to scroll to, along the y-axis.
     * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
     */
    scroll: function(top, smooth) {
      // the scroll event will trigger _updateScrollState directly,
      // However, _updateScrollState relies on the previous `scrollTop` to update the states.
      // Calling _updateScrollState will ensure that the states are synced correctly.

      if (smooth) {
        // TODO(blasten): use CSS scroll-behavior once it ships in Chrome.
        var easingFn = function easeOutQuad(t, b, c, d) {
          t /= d;
          return -c * t*(t-2) + b;
        };
        var animationId = Math.random();
        var duration = 200;
        var startTime = Date.now();
        var currentScrollTop = this.scroller.scrollTop;
        var deltaScrollTop = top - currentScrollTop;

        this._currentAnimationId = animationId;

        (function updateFrame() {
          var now = Date.now();
          var elapsedTime = now - startTime;

          if (elapsedTime > duration) {
            this.scroller.scrollTop = top;
            this._updateScrollState(top);

          } else if (this._currentAnimationId === animationId) {
            this.scroller.scrollTop = easingFn(elapsedTime, currentScrollTop, deltaScrollTop, duration);
            requestAnimationFrame(updateFrame.bind(this));
          }

        }).call(this);

      } else {
        this.scroller.scrollTop = top;
        this._updateScrollState(top);
      }
    },

   /**
     * Condense the header.
     *
     * @method condense
     * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
     */
    condense: function(smooth) {
      if (this.condenses && !this.fixed && !this.noReveal) {
        switch (this.headerState) {
          case 1:
            this.scroll(this.scroller.scrollTop - (this._headerMaxDelta - this._headerMargin), smooth);
          break;
          case 0:
          case 3:
            this.scroll(this._headerMargin, smooth);
          break;
        }
      }
    },

    /**
     * Scroll to the top of the content.
     *
     * @method scrollToTop
     * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
     */
    scrollToTop: function(smooth) {
      this.scroll(0, smooth);
    },

    _headerHeightChanged: function(headerHeight) {
      if (this._defaultCondsensedHeaderHeight !== null) {
        this._defaultCondsensedHeaderHeight = Math.round(headerHeight * 1/3);
        this.condensedHeaderHeight = this._defaultCondsensedHeaderHeight;
      }
    },

    _condensedHeaderHeightChanged: function(condensedHeaderHeight) {
      if (condensedHeaderHeight) {
        // a user custom value
        if (this._defaultCondsensedHeaderHeight != condensedHeaderHeight) {
          // disable the default value
          this._defaultCondsensedHeaderHeight = null;
        }
      }
    },

    _condensesChanged: function() {
      this._updateScrollState(this.scroller.scrollTop);
      this._condenseHeader(null);
    },

    _setup: function() {
      var s = this.scroller.style;

      s.paddingTop = this.fixed ? '' : this.headerHeight + 'px';
      s.top = this.fixed ? this.headerHeight + 'px' : '';

      if (this.fixed) {
        this._setHeaderState(0);
        this._transformHeader(null);
      } else {
        switch (this.headerState) {
          case 1:
            this._transformHeader(this._headerMaxDelta);
          break;
          case 2:
            this._transformHeader(this._headerMargin);
          break;
        }
      }
    },

    _transformHeader: function(y) {
      this._translateY(this.$.headerContainer, -y);

      if (this.condenses) {
        this._condenseHeader(y);
      }

      this.fire('paper-header-transform',
        { y: y,
          height: this.headerHeight,
          condensedHeight: this.condensedHeaderHeight
        }
      );
    },

    _condenseHeader: function(y) {
      var reset = (y === null);

      // adjust top bar in paper-header so the top bar stays at the top
      if (!this.scrollAwayTopbar && this.header && this.header.$ && this.header.$.topBar) {
        this._translateY(this.header.$.topBar,
            reset ? null : Math.min(y, this._headerMargin));
      }
      // transition header bg
      if (!this.noDissolve) {
        this.$.headerBg.style.opacity = reset ? '' :
            ( (this._headerMargin - y) / this._headerMargin);
      }
      // adjust header bg so it stays at the center
      this._translateY(this.$.headerBg, reset ? null : y / 2);
      // transition condensed header bg
      if (!this.noDissolve) {
        this.$.condensedHeaderBg.style.opacity = reset ? '' :
            (y / this._headerMargin);

        // adjust condensed header bg so it stays at the center
        this._translateY(this.$.condensedHeaderBg, reset ? null : y / 2);
      }
    },

    _translateY: function(node, y) {
      this.transform((y === null) ? '' : 'translate3d(0, ' + y + 'px, 0)', node);
    },

    /** @param {Event=} event */
    _scroll: function(event) {
      if (this.header) {
        this._updateScrollState(this.scroller.scrollTop);

        this.fire('content-scroll', {
          target: this.scroller
        },
        {
          cancelable: false
        });
      }
    },

    _updateScrollState: function(scrollTop) {
      var deltaScrollTop = scrollTop - this._prevScrollTop;
      var y = Math.max(0, (this.noReveal) ? scrollTop : this._y + deltaScrollTop);

      if (y > this._headerMaxDelta) {
        y = this._headerMaxDelta;

        if (this.keepCondensedHeader) {
          this._setHeaderState(2);
        } else {
          this._setHeaderState(1);
        }
      } else if (this.condenses && scrollTop >= this._headerMargin) {
        y = Math.max(y, this._headerMargin);
        this._setHeaderState(2);

      } else if (y === 0) {
        this._setHeaderState(0);

      } else {
        this._setHeaderState(3);
      }

      if (!this.fixed && y !== this._y) {
        this._transformHeader(y);
      }

      this._prevScrollTop = Math.max(scrollTop, 0);
      this._y = y;
    }
  });

  Polymer.PaperScrollHeaderPanel.HEADER_STATE_EXPANDED = 0;
  Polymer.PaperScrollHeaderPanel.HEADER_STATE_HIDDEN = 1;
  Polymer.PaperScrollHeaderPanel.HEADER_STATE_CONDENSED = 2;
  Polymer.PaperScrollHeaderPanel.HEADER_STATE_INTERPOLATED = 3;

})();
Polymer({

    is: 'iron-media-query',

    properties: {

      /**
       * The Boolean return value of the media query.
       */
      queryMatches: {
        type: Boolean,
        value: false,
        readOnly: true,
        notify: true
      },

      /**
       * The CSS media query to evaluate.
       */
      query: {
        type: String,
        observer: 'queryChanged'
      },

      /**
       * If true, the query attribute is assumed to be a complete media query
       * string rather than a single media feature.
       */
      full: {
        type: Boolean,
        value: false
      },

      /**
       * @type {function(MediaQueryList)}
       */
      _boundMQHandler: {
        value: function() {
          return this.queryHandler.bind(this);
        }
      },

      /**
       * @type {MediaQueryList}
       */
      _mq: {
        value: null
      }
    },

    attached: function() {
      this.style.display = 'none';
      this.queryChanged();
    },

    detached: function() {
      this._remove();
    },

    _add: function() {
      if (this._mq) {
        this._mq.addListener(this._boundMQHandler);
      }
    },

    _remove: function() {
      if (this._mq) {
        this._mq.removeListener(this._boundMQHandler);
      }
      this._mq = null;
    },

    queryChanged: function() {
      this._remove();
      var query = this.query;
      if (!query) {
        return;
      }
      if (!this.full && query[0] !== '(') {
        query = '(' + query + ')';
      }
      this._mq = window.matchMedia(query);
      this._add();
      this.queryHandler(this._mq);
    },

    queryHandler: function(mq) {
      this._setQueryMatches(mq.matches);
    }

  });
/**
   * @param {!Function} selectCallback
   * @constructor
   */
  Polymer.IronSelection = function(selectCallback) {
    this.selection = [];
    this.selectCallback = selectCallback;
  };

  Polymer.IronSelection.prototype = {

    /**
     * Retrieves the selected item(s).
     *
     * @method get
     * @returns Returns the selected item(s). If the multi property is true,
     * `get` will return an array, otherwise it will return
     * the selected item or undefined if there is no selection.
     */
    get: function() {
      return this.multi ? this.selection.slice() : this.selection[0];
    },

    /**
     * Clears all the selection except the ones indicated.
     *
     * @method clear
     * @param {Array} excludes items to be excluded.
     */
    clear: function(excludes) {
      this.selection.slice().forEach(function(item) {
        if (!excludes || excludes.indexOf(item) < 0) {
          this.setItemSelected(item, false);
        }
      }, this);
    },

    /**
     * Indicates if a given item is selected.
     *
     * @method isSelected
     * @param {*} item The item whose selection state should be checked.
     * @returns Returns true if `item` is selected.
     */
    isSelected: function(item) {
      return this.selection.indexOf(item) >= 0;
    },

    /**
     * Sets the selection state for a given item to either selected or deselected.
     *
     * @method setItemSelected
     * @param {*} item The item to select.
     * @param {boolean} isSelected True for selected, false for deselected.
     */
    setItemSelected: function(item, isSelected) {
      if (item != null) {
        if (isSelected !== this.isSelected(item)) {
          // proceed to update selection only if requested state differs from current
          if (isSelected) {
            this.selection.push(item);
          } else {
            var i = this.selection.indexOf(item);
            if (i >= 0) {
              this.selection.splice(i, 1);
            }
          }
          if (this.selectCallback) {
            this.selectCallback(item, isSelected);
          }
        }
      }
    },

    /**
     * Sets the selection state for a given item. If the `multi` property
     * is true, then the selected state of `item` will be toggled; otherwise
     * the `item` will be selected.
     *
     * @method select
     * @param {*} item The item to select.
     */
    select: function(item) {
      if (this.multi) {
        this.toggle(item);
      } else if (this.get() !== item) {
        this.setItemSelected(this.get(), false);
        this.setItemSelected(item, true);
      }
    },

    /**
     * Toggles the selection state for `item`.
     *
     * @method toggle
     * @param {*} item The item to toggle.
     */
    toggle: function(item) {
      this.setItemSelected(item, !this.isSelected(item));
    }

  };
/** @polymerBehavior */
  Polymer.IronSelectableBehavior = {

      /**
       * Fired when iron-selector is activated (selected or deselected).
       * It is fired before the selected items are changed.
       * Cancel the event to abort selection.
       *
       * @event iron-activate
       */

      /**
       * Fired when an item is selected
       *
       * @event iron-select
       */

      /**
       * Fired when an item is deselected
       *
       * @event iron-deselect
       */

      /**
       * Fired when the list of selectable items changes (e.g., items are
       * added or removed). The detail of the event is a list of mutation
       * records that describe what changed.
       *
       * @event iron-items-changed
       */

    properties: {

      /**
       * If you want to use an attribute value or property of an element for
       * `selected` instead of the index, set this to the name of the attribute
       * or property. Hyphenated values are converted to camel case when used to
       * look up the property of a selectable element. Camel cased values are
       * *not* converted to hyphenated values for attribute lookup. It's
       * recommended that you provide the hyphenated form of the name so that
       * selection works in both cases. (Use `attr-or-property-name` instead of
       * `attrOrPropertyName`.)
       */
      attrForSelected: {
        type: String,
        value: null
      },

      /**
       * Gets or sets the selected element. The default is to use the index of the item.
       * @type {string|number}
       */
      selected: {
        type: String,
        notify: true
      },

      /**
       * Returns the currently selected item.
       *
       * @type {?Object}
       */
      selectedItem: {
        type: Object,
        readOnly: true,
        notify: true
      },

      /**
       * The event that fires from items when they are selected. Selectable
       * will listen for this event from items and update the selection state.
       * Set to empty string to listen to no events.
       */
      activateEvent: {
        type: String,
        value: 'tap',
        observer: '_activateEventChanged'
      },

      /**
       * This is a CSS selector string.  If this is set, only items that match the CSS selector
       * are selectable.
       */
      selectable: String,

      /**
       * The class to set on elements when selected.
       */
      selectedClass: {
        type: String,
        value: 'iron-selected'
      },

      /**
       * The attribute to set on elements when selected.
       */
      selectedAttribute: {
        type: String,
        value: null
      },

      /**
       * The list of items from which a selection can be made.
       */
      items: {
        type: Array,
        readOnly: true,
        notify: true,
        value: function() {
          return [];
        }
      },

      /**
       * The set of excluded elements where the key is the `localName`
       * of the element that will be ignored from the item list.
       *
       * @default {template: 1}
       */
      _excludedLocalNames: {
        type: Object,
        value: function() {
          return {
            'template': 1
          };
        }
      }
    },

    observers: [
      '_updateAttrForSelected(attrForSelected)',
      '_updateSelected(selected)'
    ],

    created: function() {
      this._bindFilterItem = this._filterItem.bind(this);
      this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
    },

    attached: function() {
      this._observer = this._observeItems(this);
      this._updateItems();
      if (!this._shouldUpdateSelection) {
        this._updateSelected();
      }
      this._addListener(this.activateEvent);
    },

    detached: function() {
      if (this._observer) {
        Polymer.dom(this).unobserveNodes(this._observer);
      }
      this._removeListener(this.activateEvent);
    },

    /**
     * Returns the index of the given item.
     *
     * @method indexOf
     * @param {Object} item
     * @returns Returns the index of the item
     */
    indexOf: function(item) {
      return this.items.indexOf(item);
    },

    /**
     * Selects the given value.
     *
     * @method select
     * @param {string|number} value the value to select.
     */
    select: function(value) {
      this.selected = value;
    },

    /**
     * Selects the previous item.
     *
     * @method selectPrevious
     */
    selectPrevious: function() {
      var length = this.items.length;
      var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
      this.selected = this._indexToValue(index);
    },

    /**
     * Selects the next item.
     *
     * @method selectNext
     */
    selectNext: function() {
      var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
      this.selected = this._indexToValue(index);
    },

    /**
     * Force a synchronous update of the `items` property.
     *
     * NOTE: Consider listening for the `iron-items-changed` event to respond to
     * updates to the set of selectable items after updates to the DOM list and
     * selection state have been made.
     *
     * WARNING: If you are using this method, you should probably consider an
     * alternate approach. Synchronously querying for items is potentially
     * slow for many use cases. The `items` property will update asynchronously
     * on its own to reflect selectable items in the DOM.
     */
    forceSynchronousItemUpdate: function() {
      this._updateItems();
    },

    get _shouldUpdateSelection() {
      return this.selected != null;
    },

    _addListener: function(eventName) {
      this.listen(this, eventName, '_activateHandler');
    },

    _removeListener: function(eventName) {
      this.unlisten(this, eventName, '_activateHandler');
    },

    _activateEventChanged: function(eventName, old) {
      this._removeListener(old);
      this._addListener(eventName);
    },

    _updateItems: function() {
      var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
      nodes = Array.prototype.filter.call(nodes, this._bindFilterItem);
      this._setItems(nodes);
    },

    _updateAttrForSelected: function() {
      if (this._shouldUpdateSelection) {
        this.selected = this._indexToValue(this.indexOf(this.selectedItem));        
      }
    },

    _updateSelected: function() {
      this._selectSelected(this.selected);
    },

    _selectSelected: function(selected) {
      this._selection.select(this._valueToItem(this.selected));
    },

    _filterItem: function(node) {
      return !this._excludedLocalNames[node.localName];
    },

    _valueToItem: function(value) {
      return (value == null) ? null : this.items[this._valueToIndex(value)];
    },

    _valueToIndex: function(value) {
      if (this.attrForSelected) {
        for (var i = 0, item; item = this.items[i]; i++) {
          if (this._valueForItem(item) == value) {
            return i;
          }
        }
      } else {
        return Number(value);
      }
    },

    _indexToValue: function(index) {
      if (this.attrForSelected) {
        var item = this.items[index];
        if (item) {
          return this._valueForItem(item);
        }
      } else {
        return index;
      }
    },

    _valueForItem: function(item) {
      var propValue = item[Polymer.CaseMap.dashToCamelCase(this.attrForSelected)];
      return propValue != undefined ? propValue : item.getAttribute(this.attrForSelected);
    },

    _applySelection: function(item, isSelected) {
      if (this.selectedClass) {
        this.toggleClass(this.selectedClass, isSelected, item);
      }
      if (this.selectedAttribute) {
        this.toggleAttribute(this.selectedAttribute, isSelected, item);
      }
      this._selectionChange();
      this.fire('iron-' + (isSelected ? 'select' : 'deselect'), {item: item});
    },

    _selectionChange: function() {
      this._setSelectedItem(this._selection.get());
    },

    // observe items change under the given node.
    _observeItems: function(node) {
      return Polymer.dom(node).observeNodes(function(mutations) {
        this._updateItems();

        if (this._shouldUpdateSelection) {
          this._updateSelected();
        }

        // Let other interested parties know about the change so that
        // we don't have to recreate mutation observers everywhere.
        this.fire('iron-items-changed', mutations, {
          bubbles: false,
          cancelable: false
        });
      });
    },

    _activateHandler: function(e) {
      var t = e.target;
      var items = this.items;
      while (t && t != this) {
        var i = items.indexOf(t);
        if (i >= 0) {
          var value = this._indexToValue(i);
          this._itemActivate(value, t);
          return;
        }
        t = t.parentNode;
      }
    },

    _itemActivate: function(value, item) {
      if (!this.fire('iron-activate',
          {selected: value, item: item}, {cancelable: true}).defaultPrevented) {
        this.select(value);
      }
    }

  };
/** @polymerBehavior Polymer.IronMultiSelectableBehavior */
  Polymer.IronMultiSelectableBehaviorImpl = {
    properties: {

      /**
       * If true, multiple selections are allowed.
       */
      multi: {
        type: Boolean,
        value: false,
        observer: 'multiChanged'
      },

      /**
       * Gets or sets the selected elements. This is used instead of `selected` when `multi`
       * is true.
       */
      selectedValues: {
        type: Array,
        notify: true
      },

      /**
       * Returns an array of currently selected items.
       */
      selectedItems: {
        type: Array,
        readOnly: true,
        notify: true
      },

    },

    observers: [
      '_updateSelected(selectedValues)'
    ],

    /**
     * Selects the given value. If the `multi` property is true, then the selected state of the
     * `value` will be toggled; otherwise the `value` will be selected.
     *
     * @method select
     * @param {string|number} value the value to select.
     */
    select: function(value) {
      if (this.multi) {
        if (this.selectedValues) {
          this._toggleSelected(value);
        } else {
          this.selectedValues = [value];
        }
      } else {
        this.selected = value;
      }
    },

    multiChanged: function(multi) {
      this._selection.multi = multi;
    },

    get _shouldUpdateSelection() {
      return this.selected != null ||
        (this.selectedValues != null && this.selectedValues.length);
    },

    _updateAttrForSelected: function() {
      if (!this.multi) {
        Polymer.IronSelectableBehavior._updateAttrForSelected.apply(this);
      } else if (this._shouldUpdateSelection) {
        this.selectedValues = this.selectedItems.map(function(selectedItem) {
          return this._indexToValue(this.indexOf(selectedItem));        
        }, this).filter(function(unfilteredValue) {
          return unfilteredValue != null;
        }, this);
      }
    },

    _updateSelected: function() {
      if (this.multi) {
        this._selectMulti(this.selectedValues);
      } else {
        this._selectSelected(this.selected);
      }
    },

    _selectMulti: function(values) {
      if (values) {
        var selectedItems = this._valuesToItems(values);
        // clear all but the current selected items
        this._selection.clear(selectedItems);
        // select only those not selected yet
        for (var i = 0; i < selectedItems.length; i++) {
          this._selection.setItemSelected(selectedItems[i], true);
        }
      } else {
        this._selection.clear();
      }
    },

    _selectionChange: function() {
      var s = this._selection.get();
      if (this.multi) {
        this._setSelectedItems(s);
      } else {
        this._setSelectedItems([s]);
        this._setSelectedItem(s);
      }
    },

    _toggleSelected: function(value) {
      var i = this.selectedValues.indexOf(value);
      var unselected = i < 0;
      if (unselected) {
        this.push('selectedValues',value);
      } else {
        this.splice('selectedValues',i,1);
      }
      this._selection.setItemSelected(this._valueToItem(value), unselected);
    },

    _valuesToItems: function(values) {
      return (values == null) ? null : values.map(function(value) {
        return this._valueToItem(value);
      }, this);
    }
  };

  /** @polymerBehavior */
  Polymer.IronMultiSelectableBehavior = [
    Polymer.IronSelectableBehavior,
    Polymer.IronMultiSelectableBehaviorImpl
  ];
/**
  `iron-selector` is an element which can be used to manage a list of elements
  that can be selected.  Tapping on the item will make the item selected.  The `selected` indicates
  which item is being selected.  The default is to use the index of the item.

  Example:

      <iron-selector selected="0">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </iron-selector>

  If you want to use the attribute value of an element for `selected` instead of the index,
  set `attrForSelected` to the name of the attribute.  For example, if you want to select item by
  `name`, set `attrForSelected` to `name`.

  Example:

      <iron-selector attr-for-selected="name" selected="foo">
        <div name="foo">Foo</div>
        <div name="bar">Bar</div>
        <div name="zot">Zot</div>
      </iron-selector>

  `iron-selector` is not styled. Use the `iron-selected` CSS class to style the selected element.

  Example:

      <style>
        .iron-selected {
          background: #eee;
        }
      </style>

      ...

      <iron-selector selected="0">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </iron-selector>

  @demo demo/index.html
  */

  Polymer({

    is: 'iron-selector',

    behaviors: [
      Polymer.IronMultiSelectableBehavior
    ]

  });
(function() {
      'use strict';

      // this would be the only `paper-drawer-panel` in
      // the whole app that can be in `dragging` state
      var sharedPanel = null;

      function classNames(obj) {
        var classes = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key) && obj[key]) {
            classes.push(key);
          }
        }

        return classes.join(' ');
      }

      Polymer({

        is: 'paper-drawer-panel',

        behaviors: [Polymer.IronResizableBehavior],

        /**
         * Fired when the narrow layout changes.
         *
         * @event paper-responsive-change {{narrow: boolean}} detail -
         *     narrow: true if the panel is in narrow layout.
         */

        /**
         * Fired when the a panel is selected.
         *
         * Listening for this event is an alternative to observing changes in the `selected` attribute.
         * This event is fired both when a panel is selected.
         *
         * @event iron-select {{item: Object}} detail -
         *     item: The panel that the event refers to.
         */

        /**
         * Fired when a panel is deselected.
         *
         * Listening for this event is an alternative to observing changes in the `selected` attribute.
         * This event is fired both when a panel is deselected.
         *
         * @event iron-deselect {{item: Object}} detail -
         *     item: The panel that the event refers to.
         */
        properties: {

          /**
           * The panel to be selected when `paper-drawer-panel` changes to narrow
           * layout.
           */
          defaultSelected: {
            type: String,
            value: 'main'
          },

          /**
           * If true, swipe from the edge is disabled.
           */
          disableEdgeSwipe: {
            type: Boolean,
            value: false
          },

          /**
           * If true, swipe to open/close the drawer is disabled.
           */
          disableSwipe: {
            type: Boolean,
            value: false
          },

          /**
           * Whether the user is dragging the drawer interactively.
           */
          dragging: {
            type: Boolean,
            value: false,
            readOnly: true,
            notify: true
          },

          /**
           * Width of the drawer panel.
           */
          drawerWidth: {
            type: String,
            value: '256px'
          },

          /**
           * How many pixels on the side of the screen are sensitive to edge
           * swipes and peek.
           */
          edgeSwipeSensitivity: {
            type: Number,
            value: 30
          },

          /**
           * If true, ignore `responsiveWidth` setting and force the narrow layout.
           */
          forceNarrow: {
            type: Boolean,
            value: false
          },

          /**
           * Whether the browser has support for the transform CSS property.
           */
          hasTransform: {
            type: Boolean,
            value: function() {
              return 'transform' in this.style;
            }
          },

          /**
           * Whether the browser has support for the will-change CSS property.
           */
          hasWillChange: {
            type: Boolean,
            value: function() {
              return 'willChange' in this.style;
            }
          },

          /**
           * Returns true if the panel is in narrow layout.  This is useful if you
           * need to show/hide elements based on the layout.
           */
          narrow: {
            reflectToAttribute: true,
            type: Boolean,
            value: false,
            readOnly: true,
            notify: true
          },

          /**
           * Whether the drawer is peeking out from the edge.
           */
          peeking: {
            type: Boolean,
            value: false,
            readOnly: true,
            notify: true
          },

          /**
           * Max-width when the panel changes to narrow layout.
           */
          responsiveWidth: {
            type: String,
            value: '600px'
          },

          /**
           * If true, position the drawer to the right.
           */
          rightDrawer: {
            type: Boolean,
            value: false
          },

          /**
           * The panel that is being selected. `drawer` for the drawer panel and
           * `main` for the main panel.
           *
           * @type {string|null}
           */
          selected: {
            reflectToAttribute: true,
            notify: true,
            type: String,
            value: null
          },

          /**
           * The attribute on elements that should toggle the drawer on tap, also elements will
           * automatically be hidden in wide layout.
           */
          drawerToggleAttribute: {
            type: String,
            value: 'paper-drawer-toggle'
          },

          /**
           * The CSS selector for the element that should receive focus when the drawer is open.
           * By default, when the drawer opens, it focuses the first tabbable element. That is,
           * the first element that can receive focus.
           *
           * To disable this behavior, you can set `drawerFocusSelector` to `null` or an empty string.
           *
           */
          drawerFocusSelector: {
            type: String,
            value:
                'a[href]:not([tabindex="-1"]),'+
                'area[href]:not([tabindex="-1"]),'+
                'input:not([disabled]):not([tabindex="-1"]),'+
                'select:not([disabled]):not([tabindex="-1"]),'+
                'textarea:not([disabled]):not([tabindex="-1"]),'+
                'button:not([disabled]):not([tabindex="-1"]),'+
                'iframe:not([tabindex="-1"]),'+
                '[tabindex]:not([tabindex="-1"]),'+
                '[contentEditable=true]:not([tabindex="-1"])'
          },

          /**
           * Whether the transition is enabled.
           */
          _transition: {
            type: Boolean,
            value: false
          },

        },

        listeners: {
          tap: '_onTap',
          track: '_onTrack',
          down: '_downHandler',
          up: '_upHandler',
          transitionend: '_onTransitionEnd'
        },

        observers: [
          '_forceNarrowChanged(forceNarrow, defaultSelected)',
          '_toggleFocusListener(selected)'
        ],

        ready: function() {
          // Avoid transition at the beginning e.g. page loads and enable
          // transitions only after the element is rendered and ready.
          this._transition = true;
          this._boundFocusListener = this._didFocus.bind(this);
        },

        /**
         * Toggles the panel open and closed.
         *
         * @method togglePanel
         */
        togglePanel: function() {
          if (this._isMainSelected()) {
            this.openDrawer();
          } else {
            this.closeDrawer();
          }
        },

        /**
         * Opens the drawer.
         *
         * @method openDrawer
         */
        openDrawer: function() {
          this.selected = 'drawer';
        },

        /**
         * Closes the drawer.
         *
         * @method closeDrawer
         */
        closeDrawer: function() {
          this.selected = 'main';
        },

        _onTransitionEnd: function (e) {
          var target = Polymer.dom(e).localTarget;
          if (target !== this) {
            // ignore events coming from the light dom
            return;
          }
          if (e.propertyName === 'left' || e.propertyName === 'right') {
            this.notifyResize();
          }
          if (e.propertyName === 'transform' && this.selected === 'drawer') {
            var focusedChild = this._getAutoFocusedNode();
            focusedChild && focusedChild.focus();
          }
        },

        _computeIronSelectorClass: function(narrow, transition, dragging, rightDrawer, peeking) {
          return classNames({
            dragging: dragging,
            'narrow-layout': narrow,
            'right-drawer': rightDrawer,
            'left-drawer': !rightDrawer,
            transition: transition,
            peeking: peeking
          });
        },

        _computeDrawerStyle: function(drawerWidth) {
          return 'width:' + drawerWidth + ';';
        },

        _computeMainStyle: function(narrow, rightDrawer, drawerWidth) {
          var style = '';

          style += 'left:' + ((narrow || rightDrawer) ? '0' : drawerWidth) + ';';

          if (rightDrawer) {
            style += 'right:' + (narrow ? '' : drawerWidth) + ';';
          }

          return style;
        },

        _computeMediaQuery: function(forceNarrow, responsiveWidth) {
          return forceNarrow ? '' : '(max-width: ' + responsiveWidth + ')';
        },

        _computeSwipeOverlayHidden: function(narrow, disableEdgeSwipe) {
          return !narrow || disableEdgeSwipe;
        },

        _onTrack: function(event) {
          if (sharedPanel && this !== sharedPanel) {
            return;
          }
          switch (event.detail.state) {
            case 'start':
              this._trackStart(event);
              break;
            case 'track':
              this._trackX(event);
              break;
            case 'end':
              this._trackEnd(event);
              break;
          }
        },

        _responsiveChange: function(narrow) {
          this._setNarrow(narrow);

          this.selected = this.narrow ? this.defaultSelected : null;

          this.setScrollDirection(this._swipeAllowed() ? 'y' : 'all');
          this.fire('paper-responsive-change', {narrow: this.narrow});
        },

        _onQueryMatchesChanged: function(event) {
          this._responsiveChange(event.detail.value);
        },

        _forceNarrowChanged: function() {
          // set the narrow mode only if we reached the `responsiveWidth`
          this._responsiveChange(this.forceNarrow || this.$.mq.queryMatches);
        },

        _swipeAllowed: function() {
          return this.narrow && !this.disableSwipe;
        },

        _isMainSelected: function() {
          return this.selected === 'main';
        },

        _startEdgePeek: function() {
          this.width = this.$.drawer.offsetWidth;
          this._moveDrawer(this._translateXForDeltaX(this.rightDrawer ?
              -this.edgeSwipeSensitivity : this.edgeSwipeSensitivity));
          this._setPeeking(true);
        },

        _stopEdgePeek: function() {
          if (this.peeking) {
            this._setPeeking(false);
            this._moveDrawer(null);
          }
        },

        _downHandler: function(event) {
          if (!this.dragging && this._isMainSelected() && this._isEdgeTouch(event) && !sharedPanel) {
            this._startEdgePeek();
            // cancel selection
            event.preventDefault();
            // grab this panel
            sharedPanel = this;
          }
        },

        _upHandler: function() {
          this._stopEdgePeek();
          // release the panel
          sharedPanel = null;
        },

        _onTap: function(event) {
          var targetElement = Polymer.dom(event).localTarget;
          var isTargetToggleElement = targetElement &&
            this.drawerToggleAttribute &&
            targetElement.hasAttribute(this.drawerToggleAttribute);

          if (isTargetToggleElement) {
            this.togglePanel();
          }
        },

        _isEdgeTouch: function(event) {
          var x = event.detail.x;

          return !this.disableEdgeSwipe && this._swipeAllowed() &&
            (this.rightDrawer ?
              x >= this.offsetWidth - this.edgeSwipeSensitivity :
              x <= this.edgeSwipeSensitivity);
        },

        _trackStart: function(event) {
          if (this._swipeAllowed()) {
            sharedPanel = this;
            this._setDragging(true);

            if (this._isMainSelected()) {
              this._setDragging(this.peeking || this._isEdgeTouch(event));
            }

            if (this.dragging) {
              this.width = this.$.drawer.offsetWidth;
              this._transition = false;
            }
          }
        },

        _translateXForDeltaX: function(deltaX) {
          var isMain = this._isMainSelected();

          if (this.rightDrawer) {
            return Math.max(0, isMain ? this.width + deltaX : deltaX);
          } else {
            return Math.min(0, isMain ? deltaX - this.width : deltaX);
          }
        },

        _trackX: function(event) {
          if (this.dragging) {
            var dx = event.detail.dx;

            if (this.peeking) {
              if (Math.abs(dx) <= this.edgeSwipeSensitivity) {
                // Ignore trackx until we move past the edge peek.
                return;
              }
              this._setPeeking(false);
            }

            this._moveDrawer(this._translateXForDeltaX(dx));
          }
        },

        _trackEnd: function(event) {
          if (this.dragging) {
            var xDirection = event.detail.dx > 0;

            this._setDragging(false);
            this._transition = true;
            sharedPanel = null;
            this._moveDrawer(null);

            if (this.rightDrawer) {
              this[xDirection ? 'closeDrawer' : 'openDrawer']();
            } else {
              this[xDirection ? 'openDrawer' : 'closeDrawer']();
            }
          }
        },

        _transformForTranslateX: function(translateX) {
          if (translateX === null) {
            return '';
          }
          return this.hasWillChange ? 'translateX(' + translateX + 'px)' :
              'translate3d(' + translateX + 'px, 0, 0)';
        },

        _moveDrawer: function(translateX) {
          this.transform(this._transformForTranslateX(translateX), this.$.drawer);
        },

        _getDrawerContent: function() {
          return Polymer.dom(this.$.drawerContent).getDistributedNodes()[0];
        },

        _getAutoFocusedNode: function() {
          var drawerContent = this._getDrawerContent();

          return this.drawerFocusSelector ? 
              Polymer.dom(drawerContent).querySelector(this.drawerFocusSelector) || drawerContent : null;
        },

        _toggleFocusListener: function(selected) {
          if (selected === 'drawer') {
            this.addEventListener('focus', this._boundFocusListener, true);
          } else {
            this.removeEventListener('focus', this._boundFocusListener, true);
          }
        },

        _didFocus: function(event) {
          var autoFocusedNode = this._getAutoFocusedNode();
          if (!autoFocusedNode) {
            return;
          }

          var path = Polymer.dom(event).path;
          var focusedChild = path[0];
          var drawerContent = this._getDrawerContent();
          var focusedChildCameFromDrawer = path.indexOf(drawerContent) !== -1;

          if (!focusedChildCameFromDrawer) {
            event.stopPropagation();
            autoFocusedNode.focus();
          }
        },

        _isDrawerClosed: function(narrow, selected) {
          return !narrow || selected !== 'drawer';
        }
      });

    }());
Polymer({
      is: 'paper-toolbar',

      hostAttributes: {
        'role': 'toolbar'
      },

      properties: {
        /**
         * Controls how the items are aligned horizontally when they are placed
         * at the bottom.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         */
        bottomJustify: {
          type: String,
          value: ''
        },

        /**
         * Controls how the items are aligned horizontally.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         */
        justify: {
          type: String,
          value: ''
        },

        /**
         * Controls how the items are aligned horizontally when they are placed
         * in the middle.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         */
        middleJustify: {
          type: String,
          value: ''
        }

      },

      attached: function() {
        this._observer = this._observe(this);
        this._updateAriaLabelledBy();
      },

      detached: function() {
        if (this._observer) {
          this._observer.disconnect();
        }
      },

      _observe: function(node) {
        var observer = new MutationObserver(function() {
          this._updateAriaLabelledBy();
        }.bind(this));
        observer.observe(node, {
          childList: true,
          subtree: true
        });
        return observer;
      },

      _updateAriaLabelledBy: function() {
        var labelledBy = [];
        var contents = Polymer.dom(this.root).querySelectorAll('content');
        for (var content, index = 0; content = contents[index]; index++) {
          var nodes = Polymer.dom(content).getDistributedNodes();
          for (var node, jndex = 0; node = nodes[jndex]; jndex++) {
            if (node.classList && node.classList.contains('title')) {
              if (node.id) {
                labelledBy.push(node.id);
              } else {
                var id = 'paper-toolbar-label-' + Math.floor(Math.random() * 10000);
                node.id = id;
                labelledBy.push(id);
              }
            }
          }
        }
        if (labelledBy.length > 0) {
          this.setAttribute('aria-labelledby', labelledBy.join(' '));
        }
      },

      _computeBarExtraClasses: function(barJustify) {
        if (!barJustify) return '';

        return barJustify + (barJustify === 'justified' ? '' : '-justified');
      }
    });
/**
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronControlState = {

    properties: {

      /**
       * If true, the element currently has focus.
       */
      focused: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true,
        reflectToAttribute: true
      },

      /**
       * If true, the user cannot interact with this element.
       */
      disabled: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_disabledChanged',
        reflectToAttribute: true
      },

      _oldTabIndex: {
        type: Number
      },

      _boundFocusBlurHandler: {
        type: Function,
        value: function() {
          return this._focusBlurHandler.bind(this);
        }
      }

    },

    observers: [
      '_changedControlState(focused, disabled)'
    ],

    ready: function() {
      this.addEventListener('focus', this._boundFocusBlurHandler, true);
      this.addEventListener('blur', this._boundFocusBlurHandler, true);
    },

    _focusBlurHandler: function(event) {
      // NOTE(cdata):  if we are in ShadowDOM land, `event.target` will
      // eventually become `this` due to retargeting; if we are not in
      // ShadowDOM land, `event.target` will eventually become `this` due
      // to the second conditional which fires a synthetic event (that is also
      // handled). In either case, we can disregard `event.path`.

      if (event.target === this) {
        this._setFocused(event.type === 'focus');
      } else if (!this.shadowRoot) {
        var target = /** @type {Node} */(Polymer.dom(event).localTarget);
        if (!this.isLightDescendant(target)) {
          this.fire(event.type, {sourceEvent: event}, {
            node: this,
            bubbles: event.bubbles,
            cancelable: event.cancelable
          });
        }
      }
    },

    _disabledChanged: function(disabled, old) {
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      this.style.pointerEvents = disabled ? 'none' : '';
      if (disabled) {
        this._oldTabIndex = this.tabIndex;
        this._setFocused(false);
        this.tabIndex = -1;
        this.blur();
      } else if (this._oldTabIndex !== undefined) {
        this.tabIndex = this._oldTabIndex;
      }
    },

    _changedControlState: function() {
      // _controlStateChanged is abstract, follow-on behaviors may implement it
      if (this._controlStateChanged) {
        this._controlStateChanged();
      }
    }

  };
/**
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronButtonState
   */
  Polymer.IronButtonStateImpl = {

    properties: {

      /**
       * If true, the user is currently holding down the button.
       */
      pressed: {
        type: Boolean,
        readOnly: true,
        value: false,
        reflectToAttribute: true,
        observer: '_pressedChanged'
      },

      /**
       * If true, the button toggles the active state with each tap or press
       * of the spacebar.
       */
      toggles: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      /**
       * If true, the button is a toggle and is currently in the active state.
       */
      active: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * True if the element is currently being pressed by a "pointer," which
       * is loosely defined as mouse or touch input (but specifically excluding
       * keyboard input).
       */
      pointerDown: {
        type: Boolean,
        readOnly: true,
        value: false
      },

      /**
       * True if the input device that caused the element to receive focus
       * was a keyboard.
       */
      receivedFocusFromKeyboard: {
        type: Boolean,
        readOnly: true
      },

      /**
       * The aria attribute to be set if the button is a toggle and in the
       * active state.
       */
      ariaActiveAttribute: {
        type: String,
        value: 'aria-pressed',
        observer: '_ariaActiveAttributeChanged'
      }
    },

    listeners: {
      down: '_downHandler',
      up: '_upHandler',
      tap: '_tapHandler'
    },

    observers: [
      '_detectKeyboardFocus(focused)',
      '_activeChanged(active, ariaActiveAttribute)'
    ],

    keyBindings: {
      'enter:keydown': '_asyncClick',
      'space:keydown': '_spaceKeyDownHandler',
      'space:keyup': '_spaceKeyUpHandler',
    },

    _mouseEventRe: /^mouse/,

    _tapHandler: function() {
      if (this.toggles) {
       // a tap is needed to toggle the active state
        this._userActivate(!this.active);
      } else {
        this.active = false;
      }
    },

    _detectKeyboardFocus: function(focused) {
      this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
    },

    // to emulate native checkbox, (de-)activations from a user interaction fire
    // 'change' events
    _userActivate: function(active) {
      if (this.active !== active) {
        this.active = active;
        this.fire('change');
      }
    },

    _downHandler: function(event) {
      this._setPointerDown(true);
      this._setPressed(true);
      this._setReceivedFocusFromKeyboard(false);
    },

    _upHandler: function() {
      this._setPointerDown(false);
      this._setPressed(false);
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.isLightDescendant(/** @type {Node} */(target)))
        return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopImmediatePropagation();
      this._setPressed(true);
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.isLightDescendant(/** @type {Node} */(target)))
        return;

      if (this.pressed) {
        this._asyncClick();
      }
      this._setPressed(false);
    },

    // trigger click asynchronously, the asynchrony is useful to allow one
    // event handler to unwind before triggering another event
    _asyncClick: function() {
      this.async(function() {
        this.click();
      }, 1);
    },

    // any of these changes are considered a change to button state

    _pressedChanged: function(pressed) {
      this._changedButtonState();
    },

    _ariaActiveAttributeChanged: function(value, oldValue) {
      if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
        this.removeAttribute(oldValue);
      }
    },

    _activeChanged: function(active, ariaActiveAttribute) {
      if (this.toggles) {
        this.setAttribute(this.ariaActiveAttribute,
                          active ? 'true' : 'false');
      } else {
        this.removeAttribute(this.ariaActiveAttribute);
      }
      this._changedButtonState();
    },

    _controlStateChanged: function() {
      if (this.disabled) {
        this._setPressed(false);
      } else {
        this._changedButtonState();
      }
    },

    // provide hook for follow-on behaviors to react to button-state

    _changedButtonState: function() {
      if (this._buttonStateChanged) {
        this._buttonStateChanged(); // abstract
      }
    }

  };

  /** @polymerBehavior */
  Polymer.IronButtonState = [
    Polymer.IronA11yKeysBehavior,
    Polymer.IronButtonStateImpl
  ];
(function() {
    var Utility = {
      distance: function(x1, y1, x2, y2) {
        var xDelta = (x1 - x2);
        var yDelta = (y1 - y2);

        return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
      },

      now: window.performance && window.performance.now ?
          window.performance.now.bind(window.performance) : Date.now
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function ElementMetrics(element) {
      this.element = element;
      this.width = this.boundingRect.width;
      this.height = this.boundingRect.height;

      this.size = Math.max(this.width, this.height);
    }

    ElementMetrics.prototype = {
      get boundingRect () {
        return this.element.getBoundingClientRect();
      },

      furthestCornerDistanceFrom: function(x, y) {
        var topLeft = Utility.distance(x, y, 0, 0);
        var topRight = Utility.distance(x, y, this.width, 0);
        var bottomLeft = Utility.distance(x, y, 0, this.height);
        var bottomRight = Utility.distance(x, y, this.width, this.height);

        return Math.max(topLeft, topRight, bottomLeft, bottomRight);
      }
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function Ripple(element) {
      this.element = element;
      this.color = window.getComputedStyle(element).color;

      this.wave = document.createElement('div');
      this.waveContainer = document.createElement('div');
      this.wave.style.backgroundColor = this.color;
      this.wave.classList.add('wave');
      this.waveContainer.classList.add('wave-container');
      Polymer.dom(this.waveContainer).appendChild(this.wave);

      this.resetInteractionState();
    }

    Ripple.MAX_RADIUS = 300;

    Ripple.prototype = {
      get recenters() {
        return this.element.recenters;
      },

      get center() {
        return this.element.center;
      },

      get mouseDownElapsed() {
        var elapsed;

        if (!this.mouseDownStart) {
          return 0;
        }

        elapsed = Utility.now() - this.mouseDownStart;

        if (this.mouseUpStart) {
          elapsed -= this.mouseUpElapsed;
        }

        return elapsed;
      },

      get mouseUpElapsed() {
        return this.mouseUpStart ?
          Utility.now () - this.mouseUpStart : 0;
      },

      get mouseDownElapsedSeconds() {
        return this.mouseDownElapsed / 1000;
      },

      get mouseUpElapsedSeconds() {
        return this.mouseUpElapsed / 1000;
      },

      get mouseInteractionSeconds() {
        return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
      },

      get initialOpacity() {
        return this.element.initialOpacity;
      },

      get opacityDecayVelocity() {
        return this.element.opacityDecayVelocity;
      },

      get radius() {
        var width2 = this.containerMetrics.width * this.containerMetrics.width;
        var height2 = this.containerMetrics.height * this.containerMetrics.height;
        var waveRadius = Math.min(
          Math.sqrt(width2 + height2),
          Ripple.MAX_RADIUS
        ) * 1.1 + 5;

        var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
        var timeNow = this.mouseInteractionSeconds / duration;
        var size = waveRadius * (1 - Math.pow(80, -timeNow));

        return Math.abs(size);
      },

      get opacity() {
        if (!this.mouseUpStart) {
          return this.initialOpacity;
        }

        return Math.max(
          0,
          this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity
        );
      },

      get outerOpacity() {
        // Linear increase in background opacity, capped at the opacity
        // of the wavefront (waveOpacity).
        var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
        var waveOpacity = this.opacity;

        return Math.max(
          0,
          Math.min(outerOpacity, waveOpacity)
        );
      },

      get isOpacityFullyDecayed() {
        return this.opacity < 0.01 &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isRestingAtMaxRadius() {
        return this.opacity >= this.initialOpacity &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isAnimationComplete() {
        return this.mouseUpStart ?
          this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
      },

      get translationFraction() {
        return Math.min(
          1,
          this.radius / this.containerMetrics.size * 2 / Math.sqrt(2)
        );
      },

      get xNow() {
        if (this.xEnd) {
          return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
        }

        return this.xStart;
      },

      get yNow() {
        if (this.yEnd) {
          return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
        }

        return this.yStart;
      },

      get isMouseDown() {
        return this.mouseDownStart && !this.mouseUpStart;
      },

      resetInteractionState: function() {
        this.maxRadius = 0;
        this.mouseDownStart = 0;
        this.mouseUpStart = 0;

        this.xStart = 0;
        this.yStart = 0;
        this.xEnd = 0;
        this.yEnd = 0;
        this.slideDistance = 0;

        this.containerMetrics = new ElementMetrics(this.element);
      },

      draw: function() {
        var scale;
        var translateString;
        var dx;
        var dy;

        this.wave.style.opacity = this.opacity;

        scale = this.radius / (this.containerMetrics.size / 2);
        dx = this.xNow - (this.containerMetrics.width / 2);
        dy = this.yNow - (this.containerMetrics.height / 2);


        // 2d transform for safari because of border-radius and overflow:hidden clipping bug.
        // https://bugs.webkit.org/show_bug.cgi?id=98538
        this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
        this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
        this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
        this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
      },

      /** @param {Event=} event */
      downAction: function(event) {
        var xCenter = this.containerMetrics.width / 2;
        var yCenter = this.containerMetrics.height / 2;

        this.resetInteractionState();
        this.mouseDownStart = Utility.now();

        if (this.center) {
          this.xStart = xCenter;
          this.yStart = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        } else {
          this.xStart = event ?
              event.detail.x - this.containerMetrics.boundingRect.left :
              this.containerMetrics.width / 2;
          this.yStart = event ?
              event.detail.y - this.containerMetrics.boundingRect.top :
              this.containerMetrics.height / 2;
        }

        if (this.recenters) {
          this.xEnd = xCenter;
          this.yEnd = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        }

        this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(
          this.xStart,
          this.yStart
        );

        this.waveContainer.style.top =
          (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
        this.waveContainer.style.left =
          (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';

        this.waveContainer.style.width = this.containerMetrics.size + 'px';
        this.waveContainer.style.height = this.containerMetrics.size + 'px';
      },

      /** @param {Event=} event */
      upAction: function(event) {
        if (!this.isMouseDown) {
          return;
        }

        this.mouseUpStart = Utility.now();
      },

      remove: function() {
        Polymer.dom(this.waveContainer.parentNode).removeChild(
          this.waveContainer
        );
      }
    };

    Polymer({
      is: 'paper-ripple',

      behaviors: [
        Polymer.IronA11yKeysBehavior
      ],

      properties: {
        /**
         * The initial opacity set on the wave.
         *
         * @attribute initialOpacity
         * @type number
         * @default 0.25
         */
        initialOpacity: {
          type: Number,
          value: 0.25
        },

        /**
         * How fast (opacity per second) the wave fades out.
         *
         * @attribute opacityDecayVelocity
         * @type number
         * @default 0.8
         */
        opacityDecayVelocity: {
          type: Number,
          value: 0.8
        },

        /**
         * If true, ripples will exhibit a gravitational pull towards
         * the center of their container as they fade away.
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        recenters: {
          type: Boolean,
          value: false
        },

        /**
         * If true, ripples will center inside its container
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        center: {
          type: Boolean,
          value: false
        },

        /**
         * A list of the visual ripples.
         *
         * @attribute ripples
         * @type Array
         * @default []
         */
        ripples: {
          type: Array,
          value: function() {
            return [];
          }
        },

        /**
         * True when there are visible ripples animating within the
         * element.
         */
        animating: {
          type: Boolean,
          readOnly: true,
          reflectToAttribute: true,
          value: false
        },

        /**
         * If true, the ripple will remain in the "down" state until `holdDown`
         * is set to false again.
         */
        holdDown: {
          type: Boolean,
          value: false,
          observer: '_holdDownChanged'
        },

        /**
         * If true, the ripple will not generate a ripple effect
         * via pointer interaction.
         * Calling ripple's imperative api like `simulatedRipple` will
         * still generate the ripple effect.
         */
        noink: {
          type: Boolean,
          value: false
        },

        _animating: {
          type: Boolean
        },

        _boundAnimate: {
          type: Function,
          value: function() {
            return this.animate.bind(this);
          }
        }
      },

      get target () {
        return this.keyEventTarget;
      },

      keyBindings: {
        'enter:keydown': '_onEnterKeydown',
        'space:keydown': '_onSpaceKeydown',
        'space:keyup': '_onSpaceKeyup'
      },

      attached: function() {
        // Set up a11yKeysBehavior to listen to key events on the target,
        // so that space and enter activate the ripple even if the target doesn't
        // handle key events. The key handlers deal with `noink` themselves.
        if (this.parentNode.nodeType == 11) { // DOCUMENT_FRAGMENT_NODE
          this.keyEventTarget = Polymer.dom(this).getOwnerRoot().host;
        } else {
          this.keyEventTarget = this.parentNode;
        }
        var keyEventTarget = /** @type {!EventTarget} */ (this.keyEventTarget);
        this.listen(keyEventTarget, 'up', 'uiUpAction');
        this.listen(keyEventTarget, 'down', 'uiDownAction');
      },

      detached: function() {
        this.unlisten(this.keyEventTarget, 'up', 'uiUpAction');
        this.unlisten(this.keyEventTarget, 'down', 'uiDownAction');
        this.keyEventTarget = null;
      },

      get shouldKeepAnimating () {
        for (var index = 0; index < this.ripples.length; ++index) {
          if (!this.ripples[index].isAnimationComplete) {
            return true;
          }
        }

        return false;
      },

      simulatedRipple: function() {
        this.downAction(null);

        // Please see polymer/polymer#1305
        this.async(function() {
          this.upAction();
        }, 1);
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiDownAction: function(event) {
        if (!this.noink) {
          this.downAction(event);
        }
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      downAction: function(event) {
        if (this.holdDown && this.ripples.length > 0) {
          return;
        }

        var ripple = this.addRipple();

        ripple.downAction(event);

        if (!this._animating) {
          this._animating = true;
          this.animate();
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiUpAction: function(event) {
        if (!this.noink) {
          this.upAction(event);
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      upAction: function(event) {
        if (this.holdDown) {
          return;
        }

        this.ripples.forEach(function(ripple) {
          ripple.upAction(event);
        });

        this._animating = true;
        this.animate();
      },

      onAnimationComplete: function() {
        this._animating = false;
        this.$.background.style.backgroundColor = null;
        this.fire('transitionend');
      },

      addRipple: function() {
        var ripple = new Ripple(this);

        Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
        this.$.background.style.backgroundColor = ripple.color;
        this.ripples.push(ripple);

        this._setAnimating(true);

        return ripple;
      },

      removeRipple: function(ripple) {
        var rippleIndex = this.ripples.indexOf(ripple);

        if (rippleIndex < 0) {
          return;
        }

        this.ripples.splice(rippleIndex, 1);

        ripple.remove();

        if (!this.ripples.length) {
          this._setAnimating(false);
        }
      },

      animate: function() {
        if (!this._animating) {
          return;
        }
        var index;
        var ripple;

        for (index = 0; index < this.ripples.length; ++index) {
          ripple = this.ripples[index];

          ripple.draw();

          this.$.background.style.opacity = ripple.outerOpacity;

          if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
            this.removeRipple(ripple);
          }
        }

        if (!this.shouldKeepAnimating && this.ripples.length === 0) {
          this.onAnimationComplete();
        } else {
          window.requestAnimationFrame(this._boundAnimate);
        }
      },

      _onEnterKeydown: function() {
        this.uiDownAction();
        this.async(this.uiUpAction, 1);
      },

      _onSpaceKeydown: function() {
        this.uiDownAction();
      },

      _onSpaceKeyup: function() {
        this.uiUpAction();
      },

      // note: holdDown does not respect noink since it can be a focus based
      // effect.
      _holdDownChanged: function(newVal, oldVal) {
        if (oldVal === undefined) {
          return;
        }
        if (newVal) {
          this.downAction();
        } else {
          this.upAction();
        }
      }

      /**
      Fired when the animation finishes.
      This is useful if you want to wait until
      the ripple animation finishes to perform some action.

      @event transitionend
      @param {{node: Object}} detail Contains the animated node.
      */
    });
  })();
/**
   * `Polymer.PaperRippleBehavior` dynamically implements a ripple
   * when the element has focus via pointer or keyboard.
   *
   * NOTE: This behavior is intended to be used in conjunction with and after
   * `Polymer.IronButtonState` and `Polymer.IronControlState`.
   *
   * @polymerBehavior Polymer.PaperRippleBehavior
   */
  Polymer.PaperRippleBehavior = {
    properties: {
      /**
       * If true, the element will not produce a ripple effect when interacted
       * with via the pointer.
       */
      noink: {
        type: Boolean,
        observer: '_noinkChanged'
      },

      /**
       * @type {Element|undefined}
       */
      _rippleContainer: {
        type: Object,
      }
    },

    /**
     * Ensures a `<paper-ripple>` element is available when the element is
     * focused.
     */
    _buttonStateChanged: function() {
      if (this.focused) {
        this.ensureRipple();
      }
    },

    /**
     * In addition to the functionality provided in `IronButtonState`, ensures
     * a ripple effect is created when the element is in a `pressed` state.
     */
    _downHandler: function(event) {
      Polymer.IronButtonStateImpl._downHandler.call(this, event);
      if (this.pressed) {
        this.ensureRipple(event);
      }
    },

    /**
     * Ensures this element contains a ripple effect. For startup efficiency
     * the ripple effect is dynamically on demand when needed.
     * @param {!Event=} optTriggeringEvent (optional) event that triggered the
     * ripple.
     */
    ensureRipple: function(optTriggeringEvent) {
      if (!this.hasRipple()) {
        this._ripple = this._createRipple();
        this._ripple.noink = this.noink;
        var rippleContainer = this._rippleContainer || this.root;
        if (rippleContainer) {
          Polymer.dom(rippleContainer).appendChild(this._ripple);
        }
        if (optTriggeringEvent) {
          // Check if the event happened inside of the ripple container
          // Fall back to host instead of the root because distributed text
          // nodes are not valid event targets
          var domContainer = Polymer.dom(this._rippleContainer || this);
          var target = Polymer.dom(optTriggeringEvent).rootTarget;
          if (domContainer.deepContains( /** @type {Node} */(target))) {
            this._ripple.uiDownAction(optTriggeringEvent);
          }
        }
      }
    },

    /**
     * Returns the `<paper-ripple>` element used by this element to create
     * ripple effects. The element's ripple is created on demand, when
     * necessary, and calling this method will force the
     * ripple to be created.
     */
    getRipple: function() {
      this.ensureRipple();
      return this._ripple;
    },

    /**
     * Returns true if this element currently contains a ripple effect.
     * @return {boolean}
     */
    hasRipple: function() {
      return Boolean(this._ripple);
    },

    /**
     * Create the element's ripple effect via creating a `<paper-ripple>`.
     * Override this method to customize the ripple element.
     * @return {!PaperRippleElement} Returns a `<paper-ripple>` element.
     */
    _createRipple: function() {
      return /** @type {!PaperRippleElement} */ (
          document.createElement('paper-ripple'));
    },

    _noinkChanged: function(noink) {
      if (this.hasRipple()) {
        this._ripple.noink = noink;
      }
    }
  };
/** @polymerBehavior Polymer.PaperButtonBehavior */
  Polymer.PaperButtonBehaviorImpl = {
    properties: {
      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        readOnly: true
      }
    },

    observers: [
      '_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
      '_computeKeyboardClass(receivedFocusFromKeyboard)'
    ],

    hostAttributes: {
      role: 'button',
      tabindex: '0',
      animated: true
    },

    _calculateElevation: function() {
      var e = 1;
      if (this.disabled) {
        e = 0;
      } else if (this.active || this.pressed) {
        e = 4;
      } else if (this.receivedFocusFromKeyboard) {
        e = 3;
      }
      this._setElevation(e);
    },

    _computeKeyboardClass: function(receivedFocusFromKeyboard) {
      this.toggleClass('keyboard-focus', receivedFocusFromKeyboard);
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes down,
     * create a ripple down effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
      // Ensure that there is at most one ripple when the space key is held down.
      if (this.hasRipple() && this.getRipple().ripples.length < 1) {
        this._ripple.uiDownAction();
      }
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes up,
     * create a ripple up effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
      if (this.hasRipple()) {
        this._ripple.uiUpAction();
      }
    }
  };

  /** @polymerBehavior */
  Polymer.PaperButtonBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperRippleBehavior,
    Polymer.PaperButtonBehaviorImpl
  ];
Polymer({
      is: 'paper-button',

      behaviors: [
        Polymer.PaperButtonBehavior
      ],

      properties: {
        /**
         * If true, the button should be styled with a shadow.
         */
        raised: {
          type: Boolean,
          reflectToAttribute: true,
          value: false,
          observer: '_calculateElevation'
        }
      },

      _calculateElevation: function() {
        if (!this.raised) {
          this._setElevation(0);
        } else {
          Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
        }
      }

      /**
      Fired when the animation finishes.
      This is useful if you want to wait until
      the ripple animation finishes to perform some action.

      @event transitionend
      Event param: {{node: Object}} detail Contains the animated node.
      */
    });
/**
   * `Polymer.IronMenuBehavior` implements accessible menu behavior.
   *
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronMenuBehavior
   */
  Polymer.IronMenuBehaviorImpl = {

    properties: {

      /**
       * Returns the currently focused item.
       * @type {?Object}
       */
      focusedItem: {
        observer: '_focusedItemChanged',
        readOnly: true,
        type: Object
      },

      /**
       * The attribute to use on menu items to look up the item title. Typing the first
       * letter of an item when the menu is open focuses that item. If unset, `textContent`
       * will be used.
       */
      attrForItemTitle: {
        type: String
      }
    },

    hostAttributes: {
      'role': 'menu',
      'tabindex': '0'
    },

    observers: [
      '_updateMultiselectable(multi)'
    ],

    listeners: {
      'focus': '_onFocus',
      'keydown': '_onKeydown',
      'iron-items-changed': '_onIronItemsChanged'
    },

    keyBindings: {
      'up': '_onUpKey',
      'down': '_onDownKey',
      'esc': '_onEscKey',
      'shift+tab:keydown': '_onShiftTabDown'
    },

    attached: function() {
      this._resetTabindices();
    },

    /**
     * Selects the given value. If the `multi` property is true, then the selected state of the
     * `value` will be toggled; otherwise the `value` will be selected.
     *
     * @param {string|number} value the value to select.
     */
    select: function(value) {
      // Cancel automatically focusing a default item if the menu received focus
      // through a user action selecting a particular item.
      if (this._defaultFocusAsync) {
        this.cancelAsync(this._defaultFocusAsync);
        this._defaultFocusAsync = null;
      }
      var item = this._valueToItem(value);
      if (item && item.hasAttribute('disabled')) return;
      this._setFocusedItem(item);
      Polymer.IronMultiSelectableBehaviorImpl.select.apply(this, arguments);
    },

    /**
     * Resets all tabindex attributes to the appropriate value based on the
     * current selection state. The appropriate value is `0` (focusable) for
     * the default selected item, and `-1` (not keyboard focusable) for all
     * other items.
     */
    _resetTabindices: function() {
      var selectedItem = this.multi ? (this.selectedItems && this.selectedItems[0]) : this.selectedItem;

      this.items.forEach(function(item) {
        item.setAttribute('tabindex', item === selectedItem ? '0' : '-1');
      }, this);
    },

    /**
     * Sets appropriate ARIA based on whether or not the menu is meant to be
     * multi-selectable.
     *
     * @param {boolean} multi True if the menu should be multi-selectable.
     */
    _updateMultiselectable: function(multi) {
      if (multi) {
        this.setAttribute('aria-multiselectable', 'true');
      } else {
        this.removeAttribute('aria-multiselectable');
      }
    },

    /**
     * Given a KeyboardEvent, this method will focus the appropriate item in the
     * menu (if there is a relevant item, and it is possible to focus it).
     *
     * @param {KeyboardEvent} event A KeyboardEvent.
     */
    _focusWithKeyboardEvent: function(event) {
      for (var i = 0, item; item = this.items[i]; i++) {
        var attr = this.attrForItemTitle || 'textContent';
        var title = item[attr] || item.getAttribute(attr);

        if (!item.hasAttribute('disabled') && title &&
            title.trim().charAt(0).toLowerCase() === String.fromCharCode(event.keyCode).toLowerCase()) {
          this._setFocusedItem(item);
          break;
        }
      }
    },

    /**
     * Focuses the previous item (relative to the currently focused item) in the
     * menu, disabled items will be skipped.
     * Loop until length + 1 to handle case of single item in menu.
     */
    _focusPrevious: function() {
      var length = this.items.length;
      var curFocusIndex = Number(this.indexOf(this.focusedItem));
      for (var i = 1; i < length + 1; i++) {
        var item = this.items[(curFocusIndex - i + length) % length];
        if (!item.hasAttribute('disabled')) {
          this._setFocusedItem(item);
          return;
        }
      }
    },

    /**
     * Focuses the next item (relative to the currently focused item) in the
     * menu, disabled items will be skipped.
     * Loop until length + 1 to handle case of single item in menu.
     */
    _focusNext: function() {
      var length = this.items.length;
      var curFocusIndex = Number(this.indexOf(this.focusedItem));
      for (var i = 1; i < length + 1; i++) {
        var item = this.items[(curFocusIndex + i) % length];
        if (!item.hasAttribute('disabled')) {
          this._setFocusedItem(item);
          return;
        }
      }
    },

    /**
     * Mutates items in the menu based on provided selection details, so that
     * all items correctly reflect selection state.
     *
     * @param {Element} item An item in the menu.
     * @param {boolean} isSelected True if the item should be shown in a
     * selected state, otherwise false.
     */
    _applySelection: function(item, isSelected) {
      if (isSelected) {
        item.setAttribute('aria-selected', 'true');
      } else {
        item.removeAttribute('aria-selected');
      }
      Polymer.IronSelectableBehavior._applySelection.apply(this, arguments);
    },

    /**
     * Discretely updates tabindex values among menu items as the focused item
     * changes.
     *
     * @param {Element} focusedItem The element that is currently focused.
     * @param {?Element} old The last element that was considered focused, if
     * applicable.
     */
    _focusedItemChanged: function(focusedItem, old) {
      old && old.setAttribute('tabindex', '-1');
      if (focusedItem) {
        focusedItem.setAttribute('tabindex', '0');
        focusedItem.focus();
      }
    },

    /**
     * A handler that responds to mutation changes related to the list of items
     * in the menu.
     *
     * @param {CustomEvent} event An event containing mutation records as its
     * detail.
     */
    _onIronItemsChanged: function(event) {
      if (event.detail.addedNodes.length) {
        this._resetTabindices();
      }
    },

    /**
     * Handler that is called when a shift+tab keypress is detected by the menu.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onShiftTabDown: function(event) {
      var oldTabIndex = this.getAttribute('tabindex');

      Polymer.IronMenuBehaviorImpl._shiftTabPressed = true;

      this._setFocusedItem(null);

      this.setAttribute('tabindex', '-1');

      this.async(function() {
        this.setAttribute('tabindex', oldTabIndex);
        Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
        // NOTE(cdata): polymer/polymer#1305
      }, 1);
    },

    /**
     * Handler that is called when the menu receives focus.
     *
     * @param {FocusEvent} event A focus event.
     */
    _onFocus: function(event) {
      if (Polymer.IronMenuBehaviorImpl._shiftTabPressed) {
        // do not focus the menu itself
        return;
      }

      // Do not focus the selected tab if the deepest target is part of the
      // menu element's local DOM and is focusable.
      var rootTarget = /** @type {?HTMLElement} */(
          Polymer.dom(event).rootTarget);
      if (rootTarget !== this && typeof rootTarget.tabIndex !== "undefined" && !this.isLightDescendant(rootTarget)) {
        return;
      }

      // clear the cached focus item
      this._defaultFocusAsync = this.async(function() {
        // focus the selected item when the menu receives focus, or the first item
        // if no item is selected
        var selectedItem = this.multi ? (this.selectedItems && this.selectedItems[0]) : this.selectedItem;

        this._setFocusedItem(null);

        if (selectedItem) {
          this._setFocusedItem(selectedItem);
        } else if (this.items[0]) {
          // We find the first none-disabled item (if one exists)
          this._focusNext();
        }
      });
    },

    /**
     * Handler that is called when the up key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onUpKey: function(event) {
      // up and down arrows moves the focus
      this._focusPrevious();
      event.detail.keyboardEvent.preventDefault();
    },

    /**
     * Handler that is called when the down key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onDownKey: function(event) {
      this._focusNext();
      event.detail.keyboardEvent.preventDefault();
    },

    /**
     * Handler that is called when the esc key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onEscKey: function(event) {
      // esc blurs the control
      this.focusedItem.blur();
    },

    /**
     * Handler that is called when a keydown event is detected.
     *
     * @param {KeyboardEvent} event A keyboard event.
     */
    _onKeydown: function(event) {
      if (!this.keyboardEventMatchesKeys(event, 'up down esc')) {
        // all other keys focus the menu item starting with that character
        this._focusWithKeyboardEvent(event);
      }
      event.stopPropagation();
    },

    // override _activateHandler
    _activateHandler: function(event) {
      Polymer.IronSelectableBehavior._activateHandler.call(this, event);
      event.stopPropagation();
    }
  };

  Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;

  /** @polymerBehavior Polymer.IronMenuBehavior */
  Polymer.IronMenuBehavior = [
    Polymer.IronMultiSelectableBehavior,
    Polymer.IronA11yKeysBehavior,
    Polymer.IronMenuBehaviorImpl
  ];
(function() {
      Polymer({
        is: 'paper-menu',

        behaviors: [
          Polymer.IronMenuBehavior
        ]
      });
    })();
(function() {

    // monostate data
    var metaDatas = {};
    var metaArrays = {};
    var singleton = null;

    Polymer.IronMeta = Polymer({

      is: 'iron-meta',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * The key used to store `value` under the `type` namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          observer: '_valueChanged'
        },

        /**
         * If true, `value` is set to the iron-meta instance itself.
         */
         self: {
          type: Boolean,
          observer: '_selfChanged'
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      hostAttributes: {
        hidden: true
      },

      /**
       * Only runs if someone invokes the factory/constructor directly
       * e.g. `new Polymer.IronMeta()`
       *
       * @param {{type: (string|undefined), key: (string|undefined), value}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
              case 'value':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key, old) {
        this._resetRegistration(old);
      },

      _valueChanged: function(value) {
        this._resetRegistration(this.key);
      },

      _selfChanged: function(self) {
        if (self) {
          this.value = this;
        }
      },

      _typeChanged: function(type) {
        this._unregisterKey(this.key);
        if (!metaDatas[type]) {
          metaDatas[type] = {};
        }
        this._metaData = metaDatas[type];
        if (!metaArrays[type]) {
          metaArrays[type] = [];
        }
        this.list = metaArrays[type];
        this._registerKeyValue(this.key, this.value);
      },

      /**
       * Retrieves meta data value by key.
       *
       * @method byKey
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      },

      _resetRegistration: function(oldKey) {
        this._unregisterKey(oldKey);
        this._registerKeyValue(this.key, this.value);
      },

      _unregisterKey: function(key) {
        this._unregister(key, this._metaData, this.list);
      },

      _registerKeyValue: function(key, value) {
        this._register(key, value, this._metaData, this.list);
      },

      _register: function(key, value, data, list) {
        if (key && data && value !== undefined) {
          data[key] = value;
          list.push(value);
        }
      },

      _unregister: function(key, data, list) {
        if (key && data) {
          if (key in data) {
            var value = data[key];
            delete data[key];
            this.arrayDelete(list, value);
          }
        }
      }

    });

    Polymer.IronMeta.getIronMeta = function getIronMeta() {
       if (singleton === null) {
         singleton = new Polymer.IronMeta();
       }
       return singleton;
     };

    /**
    `iron-meta-query` can be used to access infomation stored in `iron-meta`.

    Examples:

    If I create an instance like this:

        <iron-meta key="info" value="foo/bar"></iron-meta>

    Note that value="foo/bar" is the metadata I've defined. I could define more
    attributes or use child nodes to define additional metadata.

    Now I can access that element (and it's metadata) from any `iron-meta-query` instance:

         var value = new Polymer.IronMetaQuery({key: 'info'}).value;

    @group Polymer Iron Elements
    @element iron-meta-query
    */
    Polymer.IronMetaQuery = Polymer({

      is: 'iron-meta-query',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * Specifies a key to use for retrieving `value` from the `type`
         * namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          readOnly: true
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      /**
       * Actually a factory method, not a true constructor. Only runs if
       * someone invokes it directly (via `new Polymer.IronMeta()`);
       *
       * @param {{type: (string|undefined), key: (string|undefined)}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key) {
        this._setValue(this._metaData && this._metaData[key]);
      },

      _typeChanged: function(type) {
        this._metaData = metaDatas[type];
        this.list = metaArrays[type];
        if (this.key) {
          this._keyChanged(this.key);
        }
      },

      /**
       * Retrieves meta data value by key.
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      }

    });

  })();
/**
   * Use `Polymer.NeonAnimationBehavior` to implement an animation.
   * @polymerBehavior
   */
  Polymer.NeonAnimationBehavior = {

    properties: {

      /**
       * Defines the animation timing.
       */
      animationTiming: {
        type: Object,
        value: function() {
          return {
            duration: 500,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'both'
          }
        }
      }

    },

    registered: function() {
      new Polymer.IronMeta({type: 'animation', key: this.is, value: this.constructor});
    },

    /**
     * Do any animation configuration here.
     */
    // configure: function(config) {
    // },

    /**
     * Returns the animation timing by mixing in properties from `config` to the defaults defined
     * by the animation.
     */
    timingFromConfig: function(config) {
      if (config.timing) {
        for (var property in config.timing) {
          this.animationTiming[property] = config.timing[property];
        }
      }
      return this.animationTiming;
    },

    /**
     * Sets `transform` and `transformOrigin` properties along with the prefixed versions.
     */
    setPrefixedProperty: function(node, property, value) {
      var map = {
        'transform': ['webkitTransform'],
        'transformOrigin': ['mozTransformOrigin', 'webkitTransformOrigin']
      };
      var prefixes = map[property];
      for (var prefix, index = 0; prefix = prefixes[index]; index++) {
        node.style[prefix] = value;
      }
      node.style[property] = value;
    },

    /**
     * Called when the animation finishes.
     */
    complete: function() {}

  };
// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

!function(a,b){b["true"]=a;var c={},d={},e={},f=null;!function(a){function b(a){if("number"==typeof a)return a;var b={};for(var c in a)b[c]=a[c];return b}function c(){this._delay=0,this._endDelay=0,this._fill="none",this._iterationStart=0,this._iterations=1,this._duration=0,this._playbackRate=1,this._direction="normal",this._easing="linear"}function d(b,d){var e=new c;return d&&(e.fill="both",e.duration="auto"),"number"!=typeof b||isNaN(b)?void 0!==b&&Object.getOwnPropertyNames(b).forEach(function(c){if("auto"!=b[c]){if(("number"==typeof e[c]||"duration"==c)&&("number"!=typeof b[c]||isNaN(b[c])))return;if("fill"==c&&-1==s.indexOf(b[c]))return;if("direction"==c&&-1==t.indexOf(b[c]))return;if("playbackRate"==c&&1!==b[c]&&a.isDeprecated("AnimationEffectTiming.playbackRate","2014-11-28","Use Animation.playbackRate instead."))return;e[c]=b[c]}}):e.duration=b,e}function e(a){return"number"==typeof a&&(a=isNaN(a)?{duration:0}:{duration:a}),a}function f(b,c){b=a.numericTimingToObject(b);var e=d(b,c);return e._easing=i(e.easing),e}function g(a,b,c,d){return 0>a||a>1||0>c||c>1?B:function(e){function f(a,b,c){return 3*a*(1-c)*(1-c)*c+3*b*(1-c)*c*c+c*c*c}if(0==e||1==e)return e;for(var g=0,h=1;;){var i=(g+h)/2,j=f(a,c,i);if(Math.abs(e-j)<.001)return f(b,d,i);e>j?g=i:h=i}}}function h(a,b){return function(c){if(c>=1)return 1;var d=1/a;return c+=b*d,c-c%d}}function i(a){var b=z.exec(a);if(b)return g.apply(this,b.slice(1).map(Number));var c=A.exec(a);if(c)return h(Number(c[1]),{start:u,middle:v,end:w}[c[2]]);var d=x[a];return d?d:B}function j(a){return Math.abs(k(a)/a.playbackRate)}function k(a){return a.duration*a.iterations}function l(a,b,c){return null==b?C:b<c.delay?D:b>=c.delay+a?E:F}function m(a,b,c,d,e){switch(d){case D:return"backwards"==b||"both"==b?0:null;case F:return c-e;case E:return"forwards"==b||"both"==b?a:null;case C:return null}}function n(a,b,c,d){return(d.playbackRate<0?b-a:b)*d.playbackRate+c}function o(a,b,c,d,e){return 1/0===c||c===-1/0||c-d==b&&e.iterations&&(e.iterations+e.iterationStart)%1==0?a:c%a}function p(a,b,c,d){return 0===c?0:b==a?d.iterationStart+d.iterations-1:Math.floor(c/a)}function q(a,b,c,d){var e=a%2>=1,f="normal"==d.direction||d.direction==(e?"alternate-reverse":"alternate"),g=f?c:b-c,h=g/b;return b*d.easing(h)}function r(a,b,c){var d=l(a,b,c),e=m(a,c.fill,b,d,c.delay);if(null===e)return null;if(0===a)return d===D?0:1;var f=c.iterationStart*c.duration,g=n(a,e,f,c),h=o(c.duration,k(c),g,f,c),i=p(c.duration,h,g,c);return q(i,c.duration,h,c)/c.duration}var s="backwards|forwards|both|none".split("|"),t="reverse|alternate|alternate-reverse".split("|");c.prototype={_setMember:function(b,c){this["_"+b]=c,this._effect&&(this._effect._timingInput[b]=c,this._effect._timing=a.normalizeTimingInput(a.normalizeTimingInput(this._effect._timingInput)),this._effect.activeDuration=a.calculateActiveDuration(this._effect._timing),this._effect._animation&&this._effect._animation._rebuildUnderlyingAnimation())},get playbackRate(){return this._playbackRate},set delay(a){this._setMember("delay",a)},get delay(){return this._delay},set endDelay(a){this._setMember("endDelay",a)},get endDelay(){return this._endDelay},set fill(a){this._setMember("fill",a)},get fill(){return this._fill},set iterationStart(a){this._setMember("iterationStart",a)},get iterationStart(){return this._iterationStart},set duration(a){this._setMember("duration",a)},get duration(){return this._duration},set direction(a){this._setMember("direction",a)},get direction(){return this._direction},set easing(a){this._setMember("easing",a)},get easing(){return this._easing},set iterations(a){this._setMember("iterations",a)},get iterations(){return this._iterations}};var u=1,v=.5,w=0,x={ease:g(.25,.1,.25,1),"ease-in":g(.42,0,1,1),"ease-out":g(0,0,.58,1),"ease-in-out":g(.42,0,.58,1),"step-start":h(1,u),"step-middle":h(1,v),"step-end":h(1,w)},y="\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*",z=new RegExp("cubic-bezier\\("+y+","+y+","+y+","+y+"\\)"),A=/steps\(\s*(\d+)\s*,\s*(start|middle|end)\s*\)/,B=function(a){return a},C=0,D=1,E=2,F=3;a.cloneTimingInput=b,a.makeTiming=d,a.numericTimingToObject=e,a.normalizeTimingInput=f,a.calculateActiveDuration=j,a.calculateTimeFraction=r,a.calculatePhase=l,a.toTimingFunction=i}(c,f),function(a){function b(a,b){return a in h?h[a][b]||b:b}function c(a,c,d){var g=e[a];if(g){f.style[a]=c;for(var h in g){var i=g[h],j=f.style[i];d[i]=b(i,j)}}else d[a]=b(a,c)}function d(b){function d(){var a=e.length;null==e[a-1].offset&&(e[a-1].offset=1),a>1&&null==e[0].offset&&(e[0].offset=0);for(var b=0,c=e[0].offset,d=1;a>d;d++){var f=e[d].offset;if(null!=f){for(var g=1;d-b>g;g++)e[b+g].offset=c+(f-c)*g/(d-b);b=d,c=f}}}if(!Array.isArray(b)&&null!==b)throw new TypeError("Keyframes must be null or an array of keyframes");if(null==b)return[];for(var e=b.map(function(b){var d={};for(var e in b){var f=b[e];if("offset"==e){if(null!=f&&(f=Number(f),!isFinite(f)))throw new TypeError("keyframe offsets must be numbers.")}else{if("composite"==e)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"add compositing is not supported"};f="easing"==e?a.toTimingFunction(f):""+f}c(e,f,d)}return void 0==d.offset&&(d.offset=null),void 0==d.easing&&(d.easing=a.toTimingFunction("linear")),d}),f=!0,g=-1/0,h=0;h<e.length;h++){var i=e[h].offset;if(null!=i){if(g>i)throw{code:DOMException.INVALID_MODIFICATION_ERR,name:"InvalidModificationError",message:"Keyframes are not loosely sorted by offset. Sort or specify offsets."};g=i}else f=!1}return e=e.filter(function(a){return a.offset>=0&&a.offset<=1}),f||d(),e}var e={background:["backgroundImage","backgroundPosition","backgroundSize","backgroundRepeat","backgroundAttachment","backgroundOrigin","backgroundClip","backgroundColor"],border:["borderTopColor","borderTopStyle","borderTopWidth","borderRightColor","borderRightStyle","borderRightWidth","borderBottomColor","borderBottomStyle","borderBottomWidth","borderLeftColor","borderLeftStyle","borderLeftWidth"],borderBottom:["borderBottomWidth","borderBottomStyle","borderBottomColor"],borderColor:["borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"],borderLeft:["borderLeftWidth","borderLeftStyle","borderLeftColor"],borderRadius:["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],borderRight:["borderRightWidth","borderRightStyle","borderRightColor"],borderTop:["borderTopWidth","borderTopStyle","borderTopColor"],borderWidth:["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"],flex:["flexGrow","flexShrink","flexBasis"],font:["fontFamily","fontSize","fontStyle","fontVariant","fontWeight","lineHeight"],margin:["marginTop","marginRight","marginBottom","marginLeft"],outline:["outlineColor","outlineStyle","outlineWidth"],padding:["paddingTop","paddingRight","paddingBottom","paddingLeft"]},f=document.createElementNS("http://www.w3.org/1999/xhtml","div"),g={thin:"1px",medium:"3px",thick:"5px"},h={borderBottomWidth:g,borderLeftWidth:g,borderRightWidth:g,borderTopWidth:g,fontSize:{"xx-small":"60%","x-small":"75%",small:"89%",medium:"100%",large:"120%","x-large":"150%","xx-large":"200%"},fontWeight:{normal:"400",bold:"700"},outlineWidth:g,textShadow:{none:"0px 0px 0px transparent"},boxShadow:{none:"0px 0px 0px 0px transparent"}};a.normalizeKeyframes=d}(c,f),function(a){var b={};a.isDeprecated=function(a,c,d,e){var f=e?"are":"is",g=new Date,h=new Date(c);return h.setMonth(h.getMonth()+3),h>g?(a in b||console.warn("Web Animations: "+a+" "+f+" deprecated and will stop working on "+h.toDateString()+". "+d),b[a]=!0,!1):!0},a.deprecated=function(b,c,d,e){var f=e?"are":"is";if(a.isDeprecated(b,c,d,e))throw new Error(b+" "+f+" no longer supported. "+d)}}(c),function(){if(document.documentElement.animate){var a=document.documentElement.animate([],0),b=!0;if(a&&(b=!1,"play|currentTime|pause|reverse|playbackRate|cancel|finish|startTime|playState".split("|").forEach(function(c){void 0===a[c]&&(b=!0)})),!b)return}!function(a,b){function c(a){for(var b={},c=0;c<a.length;c++)for(var d in a[c])if("offset"!=d&&"easing"!=d&&"composite"!=d){var e={offset:a[c].offset,easing:a[c].easing,value:a[c][d]};b[d]=b[d]||[],b[d].push(e)}for(var f in b){var g=b[f];if(0!=g[0].offset||1!=g[g.length-1].offset)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"Partial keyframes are not supported"}}return b}function d(a){var c=[];for(var d in a)for(var e=a[d],f=0;f<e.length-1;f++){var g=e[f].offset,h=e[f+1].offset,i=e[f].value,j=e[f+1].value;g==h&&(1==h?i=j:j=i),c.push({startTime:g,endTime:h,easing:e[f].easing,property:d,interpolation:b.propertyInterpolation(d,i,j)})}return c.sort(function(a,b){return a.startTime-b.startTime}),c}b.convertEffectInput=function(e){var f=a.normalizeKeyframes(e),g=c(f),h=d(g);return function(a,c){if(null!=c)h.filter(function(a){return 0>=c&&0==a.startTime||c>=1&&1==a.endTime||c>=a.startTime&&c<=a.endTime}).forEach(function(d){var e=c-d.startTime,f=d.endTime-d.startTime,g=0==f?0:d.easing(e/f);b.apply(a,d.property,d.interpolation(g))});else for(var d in g)"offset"!=d&&"easing"!=d&&"composite"!=d&&b.clear(a,d)}}}(c,d,f),function(a){function b(a,b,c){e[c]=e[c]||[],e[c].push([a,b])}function c(a,c,d){for(var e=0;e<d.length;e++){var f=d[e];b(a,c,f),/-/.test(f)&&b(a,c,f.replace(/-(.)/g,function(a,b){return b.toUpperCase()}))}}function d(b,c,d){if("initial"==c||"initial"==d){var g=b.replace(/-(.)/g,function(a,b){return b.toUpperCase()});"initial"==c&&(c=f[g]),"initial"==d&&(d=f[g])}for(var h=c==d?[]:e[b],i=0;h&&i<h.length;i++){var j=h[i][0](c),k=h[i][0](d);if(void 0!==j&&void 0!==k){var l=h[i][1](j,k);if(l){var m=a.Interpolation.apply(null,l);return function(a){return 0==a?c:1==a?d:m(a)}}}}return a.Interpolation(!1,!0,function(a){return a?d:c})}var e={};a.addPropertiesHandler=c;var f={backgroundColor:"transparent",backgroundPosition:"0% 0%",borderBottomColor:"currentColor",borderBottomLeftRadius:"0px",borderBottomRightRadius:"0px",borderBottomWidth:"3px",borderLeftColor:"currentColor",borderLeftWidth:"3px",borderRightColor:"currentColor",borderRightWidth:"3px",borderSpacing:"2px",borderTopColor:"currentColor",borderTopLeftRadius:"0px",borderTopRightRadius:"0px",borderTopWidth:"3px",bottom:"auto",clip:"rect(0px, 0px, 0px, 0px)",color:"black",fontSize:"100%",fontWeight:"400",height:"auto",left:"auto",letterSpacing:"normal",lineHeight:"120%",marginBottom:"0px",marginLeft:"0px",marginRight:"0px",marginTop:"0px",maxHeight:"none",maxWidth:"none",minHeight:"0px",minWidth:"0px",opacity:"1.0",outlineColor:"invert",outlineOffset:"0px",outlineWidth:"3px",paddingBottom:"0px",paddingLeft:"0px",paddingRight:"0px",paddingTop:"0px",right:"auto",textIndent:"0px",textShadow:"0px 0px 0px transparent",top:"auto",transform:"",verticalAlign:"0px",visibility:"visible",width:"auto",wordSpacing:"normal",zIndex:"auto"};a.propertyInterpolation=d}(d,f),function(a,b){function c(b){var c=a.calculateActiveDuration(b),d=function(d){return a.calculateTimeFraction(c,d,b)};return d._totalDuration=b.delay+c+b.endDelay,d._isCurrent=function(d){var e=a.calculatePhase(c,d,b);return e===PhaseActive||e===PhaseBefore},d}b.KeyframeEffect=function(d,e,f){var g,h=c(a.normalizeTimingInput(f)),i=b.convertEffectInput(e),j=function(){i(d,g)};return j._update=function(a){return g=h(a),null!==g},j._clear=function(){i(d,null)},j._hasSameTarget=function(a){return d===a},j._isCurrent=h._isCurrent,j._totalDuration=h._totalDuration,j},b.NullEffect=function(a){var b=function(){a&&(a(),a=null)};return b._update=function(){return null},b._totalDuration=0,b._isCurrent=function(){return!1},b._hasSameTarget=function(){return!1},b}}(c,d,f),function(a){a.apply=function(b,c,d){b.style[a.propertyName(c)]=d},a.clear=function(b,c){b.style[a.propertyName(c)]=""}}(d,f),function(a){window.Element.prototype.animate=function(b,c){return a.timeline._play(a.KeyframeEffect(this,b,c))}}(d),function(a){function b(a,c,d){if("number"==typeof a&&"number"==typeof c)return a*(1-d)+c*d;if("boolean"==typeof a&&"boolean"==typeof c)return.5>d?a:c;if(a.length==c.length){for(var e=[],f=0;f<a.length;f++)e.push(b(a[f],c[f],d));return e}throw"Mismatched interpolation arguments "+a+":"+c}a.Interpolation=function(a,c,d){return function(e){return d(b(a,c,e))}}}(d,f),function(a,b){a.sequenceNumber=0;var c=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="finish",this.bubbles=!1,this.cancelable=!1,this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()};b.Animation=function(b){this._sequenceNumber=a.sequenceNumber++,this._currentTime=0,this._startTime=null,this._paused=!1,this._playbackRate=1,this._inTimeline=!0,this._finishedFlag=!1,this.onfinish=null,this._finishHandlers=[],this._effect=b,this._inEffect=this._effect._update(0),this._idle=!0,this._currentTimePending=!1},b.Animation.prototype={_ensureAlive:function(){this._inEffect=this._effect._update(this.playbackRate<0&&0===this.currentTime?-1:this.currentTime),this._inTimeline||!this._inEffect&&this._finishedFlag||(this._inTimeline=!0,b.timeline._animations.push(this))},_tickCurrentTime:function(a,b){a!=this._currentTime&&(this._currentTime=a,this._isFinished&&!b&&(this._currentTime=this._playbackRate>0?this._totalDuration:0),this._ensureAlive())},get currentTime(){return this._idle||this._currentTimePending?null:this._currentTime},set currentTime(a){a=+a,isNaN(a)||(b.restart(),this._paused||null==this._startTime||(this._startTime=this._timeline.currentTime-a/this._playbackRate),this._currentTimePending=!1,this._currentTime!=a&&(this._tickCurrentTime(a,!0),b.invalidateEffects()))},get startTime(){return this._startTime},set startTime(a){a=+a,isNaN(a)||this._paused||this._idle||(this._startTime=a,this._tickCurrentTime((this._timeline.currentTime-this._startTime)*this.playbackRate),b.invalidateEffects())},get playbackRate(){return this._playbackRate},set playbackRate(a){if(a!=this._playbackRate){var b=this.currentTime;this._playbackRate=a,this._startTime=null,"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!=b&&(this.currentTime=b)}},get _isFinished(){return!this._idle&&(this._playbackRate>0&&this._currentTime>=this._totalDuration||this._playbackRate<0&&this._currentTime<=0)},get _totalDuration(){return this._effect._totalDuration},get playState(){return this._idle?"idle":null==this._startTime&&!this._paused&&0!=this.playbackRate||this._currentTimePending?"pending":this._paused?"paused":this._isFinished?"finished":"running"},play:function(){this._paused=!1,(this._isFinished||this._idle)&&(this._currentTime=this._playbackRate>0?0:this._totalDuration,this._startTime=null,b.invalidateEffects()),this._finishedFlag=!1,b.restart(),this._idle=!1,this._ensureAlive()},pause:function(){this._isFinished||this._paused||this._idle||(this._currentTimePending=!0),this._startTime=null,this._paused=!0},finish:function(){this._idle||(this.currentTime=this._playbackRate>0?this._totalDuration:0,this._startTime=this._totalDuration-this.currentTime,this._currentTimePending=!1)},cancel:function(){this._inEffect&&(this._inEffect=!1,this._idle=!0,this.currentTime=0,this._startTime=null,this._effect._update(null),b.invalidateEffects(),b.restart())},reverse:function(){this.playbackRate*=-1,this.play()},addEventListener:function(a,b){"function"==typeof b&&"finish"==a&&this._finishHandlers.push(b)},removeEventListener:function(a,b){if("finish"==a){var c=this._finishHandlers.indexOf(b);c>=0&&this._finishHandlers.splice(c,1)}},_fireEvents:function(a){var b=this._isFinished;if((b||this._idle)&&!this._finishedFlag){var d=new c(this,this._currentTime,a),e=this._finishHandlers.concat(this.onfinish?[this.onfinish]:[]);setTimeout(function(){e.forEach(function(a){a.call(d.target,d)})},0)}this._finishedFlag=b},_tick:function(a){return this._idle||this._paused||(null==this._startTime?this.startTime=a-this._currentTime/this.playbackRate:this._isFinished||this._tickCurrentTime((a-this._startTime)*this.playbackRate)),this._currentTimePending=!1,this._fireEvents(a),!this._idle&&(this._inEffect||!this._finishedFlag)}}}(c,d,f),function(a,b){function c(a){var b=i;i=[],a<s.currentTime&&(a=s.currentTime),g(a),b.forEach(function(b){b[1](a)}),o&&g(a),f(),l=void 0}function d(a,b){return a._sequenceNumber-b._sequenceNumber}function e(){this._animations=[],this.currentTime=window.performance&&performance.now?performance.now():0}function f(){p.forEach(function(a){a()}),p.length=0}function g(a){n=!1;var c=b.timeline;c.currentTime=a,c._animations.sort(d),m=!1;var e=c._animations;c._animations=[];var f=[],g=[];e=e.filter(function(b){return b._inTimeline=b._tick(a),b._inEffect?g.push(b._effect):f.push(b._effect),b._isFinished||b._paused||b._idle||(m=!0),b._inTimeline}),p.push.apply(p,f),p.push.apply(p,g),c._animations.push.apply(c._animations,e),o=!1,m&&requestAnimationFrame(function(){})}var h=window.requestAnimationFrame,i=[],j=0;window.requestAnimationFrame=function(a){var b=j++;return 0==i.length&&h(c),i.push([b,a]),b},window.cancelAnimationFrame=function(a){i.forEach(function(b){b[0]==a&&(b[1]=function(){})})},e.prototype={_play:function(c){c._timing=a.normalizeTimingInput(c.timing);var d=new b.Animation(c);return d._idle=!1,d._timeline=this,this._animations.push(d),b.restart(),b.invalidateEffects(),d}};var k,l=void 0,k=function(){return void 0==l&&(l=performance.now()),l},m=!1,n=!1;b.restart=function(){return m||(m=!0,requestAnimationFrame(function(){}),n=!0),n};var o=!1;b.invalidateEffects=function(){o=!0};var p=[],q=1e3/60,r=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){if(o){var a=k();a-s.currentTime>0&&(s.currentTime+=q*(Math.floor((a-s.currentTime)/q)+1)),g(s.currentTime)}return f(),r.apply(this,arguments)}});var s=new e;b.timeline=s}(c,d,f),function(a){function b(a,b){var c=a.exec(b);return c?(c=a.ignoreCase?c[0].toLowerCase():c[0],[c,b.substr(c.length)]):void 0}function c(a,b){b=b.replace(/^\s*/,"");var c=a(b);return c?[c[0],c[1].replace(/^\s*/,"")]:void 0}function d(a,d,e){a=c.bind(null,a);for(var f=[];;){var g=a(e);if(!g)return[f,e];if(f.push(g[0]),e=g[1],g=b(d,e),!g||""==g[1])return[f,e];e=g[1]}}function e(a,b){for(var c=0,d=0;d<b.length&&(!/\s|,/.test(b[d])||0!=c);d++)if("("==b[d])c++;else if(")"==b[d]&&(c--,0==c&&d++,0>=c))break;var e=a(b.substr(0,d));return void 0==e?void 0:[e,b.substr(d)]}function f(a,b){for(var c=a,d=b;c&&d;)c>d?c%=d:d%=c;return c=a*b/(c+d)}function g(a){return function(b){var c=a(b);return c&&(c[0]=void 0),c}}function h(a,b){return function(c){var d=a(c);return d?d:[b,c]}}function i(b,c){for(var d=[],e=0;e<b.length;e++){var f=a.consumeTrimmed(b[e],c);if(!f||""==f[0])return;void 0!==f[0]&&d.push(f[0]),c=f[1]}return""==c?d:void 0}function j(a,b,c,d,e){for(var g=[],h=[],i=[],j=f(d.length,e.length),k=0;j>k;k++){var l=b(d[k%d.length],e[k%e.length]);if(!l)return;g.push(l[0]),h.push(l[1]),i.push(l[2])}return[g,h,function(b){var d=b.map(function(a,b){return i[b](a)}).join(c);return a?a(d):d}]}function k(a,b,c){for(var d=[],e=[],f=[],g=0,h=0;h<c.length;h++)if("function"==typeof c[h]){var i=c[h](a[g],b[g++]);d.push(i[0]),e.push(i[1]),f.push(i[2])}else!function(a){d.push(!1),e.push(!1),f.push(function(){return c[a]})}(h);return[d,e,function(a){for(var b="",c=0;c<a.length;c++)b+=f[c](a[c]);return b}]}a.consumeToken=b,a.consumeTrimmed=c,a.consumeRepeated=d,a.consumeParenthesised=e,a.ignore=g,a.optional=h,a.consumeList=i,a.mergeNestedRepeated=j.bind(null,null),a.mergeWrappedNestedRepeated=j,a.mergeList=k}(d),function(a){function b(b){function c(b){var c=a.consumeToken(/^inset/i,b);if(c)return d.inset=!0,c;var c=a.consumeLengthOrPercent(b);if(c)return d.lengths.push(c[0]),c;var c=a.consumeColor(b);return c?(d.color=c[0],c):void 0}var d={inset:!1,lengths:[],color:null},e=a.consumeRepeated(c,/^/,b);return e&&e[0].length?[d,e[1]]:void 0}function c(c){var d=a.consumeRepeated(b,/^,/,c);return d&&""==d[1]?d[0]:void 0}function d(b,c){for(;b.lengths.length<Math.max(b.lengths.length,c.lengths.length);)b.lengths.push({px:0});for(;c.lengths.length<Math.max(b.lengths.length,c.lengths.length);)c.lengths.push({px:0});if(b.inset==c.inset&&!!b.color==!!c.color){for(var d,e=[],f=[[],0],g=[[],0],h=0;h<b.lengths.length;h++){var i=a.mergeDimensions(b.lengths[h],c.lengths[h],2==h);f[0].push(i[0]),g[0].push(i[1]),e.push(i[2])}if(b.color&&c.color){var j=a.mergeColors(b.color,c.color);f[1]=j[0],g[1]=j[1],d=j[2]}return[f,g,function(a){for(var c=b.inset?"inset ":" ",f=0;f<e.length;f++)c+=e[f](a[0][f])+" ";return d&&(c+=d(a[1])),c}]}}function e(b,c,d,e){function f(a){return{inset:a,color:[0,0,0,0],lengths:[{px:0},{px:0},{px:0},{px:0}]}}for(var g=[],h=[],i=0;i<d.length||i<e.length;i++){var j=d[i]||f(e[i].inset),k=e[i]||f(d[i].inset);g.push(j),h.push(k)}return a.mergeNestedRepeated(b,c,g,h)}var f=e.bind(null,d,", ");a.addPropertiesHandler(c,f,["box-shadow","text-shadow"])}(d),function(a){function b(a){return a.toFixed(3).replace(".000","")}function c(a,b,c){return Math.min(b,Math.max(a,c))}function d(a){return/^\s*[-+]?(\d*\.)?\d+\s*$/.test(a)?Number(a):void 0}function e(a,c){return[a,c,b]}function f(a,b){return 0!=a?h(0,1/0)(a,b):void 0}function g(a,b){return[a,b,function(a){return Math.round(c(1,1/0,a))}]}function h(a,d){return function(e,f){return[e,f,function(e){return b(c(a,d,e))}]}}function i(a,b){return[a,b,Math.round]}a.clamp=c,a.addPropertiesHandler(d,h(0,1/0),["border-image-width","line-height"]),a.addPropertiesHandler(d,h(0,1),["opacity","shape-image-threshold"]),a.addPropertiesHandler(d,f,["flex-grow","flex-shrink"]),a.addPropertiesHandler(d,g,["orphans","widows"]),a.addPropertiesHandler(d,i,["z-index"]),a.parseNumber=d,a.mergeNumbers=e,a.numberToString=b}(d,f),function(a){function b(a,b){return"visible"==a||"visible"==b?[0,1,function(c){return 0>=c?a:c>=1?b:"visible"}]:void 0}a.addPropertiesHandler(String,b,["visibility"])}(d),function(a){function b(a){a=a.trim(),e.fillStyle="#000",e.fillStyle=a;var b=e.fillStyle;if(e.fillStyle="#fff",e.fillStyle=a,b==e.fillStyle){e.fillRect(0,0,1,1);var c=e.getImageData(0,0,1,1).data;e.clearRect(0,0,1,1);var d=c[3]/255;return[c[0]*d,c[1]*d,c[2]*d,d]}}function c(b,c){return[b,c,function(b){function c(a){return Math.max(0,Math.min(255,a))}if(b[3])for(var d=0;3>d;d++)b[d]=Math.round(c(b[d]/b[3]));return b[3]=a.numberToString(a.clamp(0,1,b[3])),"rgba("+b.join(",")+")"}]}var d=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");d.width=d.height=1;var e=d.getContext("2d");a.addPropertiesHandler(b,c,["background-color","border-bottom-color","border-left-color","border-right-color","border-top-color","color","outline-color","text-decoration-color"]),a.consumeColor=a.consumeParenthesised.bind(null,b),a.mergeColors=c}(d,f),function(a,b){function c(a,b){if(b=b.trim().toLowerCase(),"0"==b&&"px".search(a)>=0)return{px:0};if(/^[^(]*$|^calc/.test(b)){b=b.replace(/calc\(/g,"(");var c={};b=b.replace(a,function(a){return c[a]=null,"U"+a});for(var d="U("+a.source+")",e=b.replace(/[-+]?(\d*\.)?\d+/g,"N").replace(new RegExp("N"+d,"g"),"D").replace(/\s[+-]\s/g,"O").replace(/\s/g,""),f=[/N\*(D)/g,/(N|D)[*/]N/g,/(N|D)O\1/g,/\((N|D)\)/g],g=0;g<f.length;)f[g].test(e)?(e=e.replace(f[g],"$1"),g=0):g++;if("D"==e){for(var h in c){var i=eval(b.replace(new RegExp("U"+h,"g"),"").replace(new RegExp(d,"g"),"*0"));if(!isFinite(i))return;c[h]=i}return c}}}function d(a,b){return e(a,b,!0)}function e(b,c,d){var e,f=[];for(e in b)f.push(e);for(e in c)f.indexOf(e)<0&&f.push(e);return b=f.map(function(a){return b[a]||0}),c=f.map(function(a){return c[a]||0}),[b,c,function(b){var c=b.map(function(c,e){return 1==b.length&&d&&(c=Math.max(c,0)),a.numberToString(c)+f[e]}).join(" + ");return b.length>1?"calc("+c+")":c}]}var f="px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc",g=c.bind(null,new RegExp(f,"g")),h=c.bind(null,new RegExp(f+"|%","g")),i=c.bind(null,/deg|rad|grad|turn/g);a.parseLength=g,a.parseLengthOrPercent=h,a.consumeLengthOrPercent=a.consumeParenthesised.bind(null,h),a.parseAngle=i,a.mergeDimensions=e;var j=a.consumeParenthesised.bind(null,g),k=a.consumeRepeated.bind(void 0,j,/^/),l=a.consumeRepeated.bind(void 0,k,/^,/);a.consumeSizePairList=l;var m=function(a){var b=l(a);return b&&""==b[1]?b[0]:void 0},n=a.mergeNestedRepeated.bind(void 0,d," "),o=a.mergeNestedRepeated.bind(void 0,n,",");a.mergeNonNegativeSizePair=n,a.addPropertiesHandler(m,o,["background-size"]),a.addPropertiesHandler(h,d,["border-bottom-width","border-image-width","border-left-width","border-right-width","border-top-width","flex-basis","font-size","height","line-height","max-height","max-width","outline-width","width"]),a.addPropertiesHandler(h,e,["border-bottom-left-radius","border-bottom-right-radius","border-top-left-radius","border-top-right-radius","bottom","left","letter-spacing","margin-bottom","margin-left","margin-right","margin-top","min-height","min-width","outline-offset","padding-bottom","padding-left","padding-right","padding-top","perspective","right","shape-margin","text-indent","top","vertical-align","word-spacing"])}(d,f),function(a){function b(b){return a.consumeLengthOrPercent(b)||a.consumeToken(/^auto/,b)}function c(c){var d=a.consumeList([a.ignore(a.consumeToken.bind(null,/^rect/)),a.ignore(a.consumeToken.bind(null,/^\(/)),a.consumeRepeated.bind(null,b,/^,/),a.ignore(a.consumeToken.bind(null,/^\)/))],c);return d&&4==d[0].length?d[0]:void 0}function d(b,c){return"auto"==b||"auto"==c?[!0,!1,function(d){var e=d?b:c;if("auto"==e)return"auto";var f=a.mergeDimensions(e,e);return f[2](f[0])}]:a.mergeDimensions(b,c)}function e(a){return"rect("+a+")"}var f=a.mergeWrappedNestedRepeated.bind(null,e,d,", ");a.parseBox=c,a.mergeBoxes=f,a.addPropertiesHandler(c,f,["clip"])}(d,f),function(a){function b(a){return function(b){var c=0;return a.map(function(a){return a===j?b[c++]:a})}}function c(a){return a}function d(b){if(b=b.toLowerCase().trim(),"none"==b)return[];for(var c,d=/\s*(\w+)\(([^)]*)\)/g,e=[],f=0;c=d.exec(b);){if(c.index!=f)return;f=c.index+c[0].length;var g=c[1],h=m[g];if(!h)return;var i=c[2].split(","),j=h[0];if(j.length<i.length)return;for(var n=[],o=0;o<j.length;o++){var p,q=i[o],r=j[o];if(p=q?{A:function(b){return"0"==b.trim()?l:a.parseAngle(b)},N:a.parseNumber,T:a.parseLengthOrPercent,L:a.parseLength}[r.toUpperCase()](q):{a:l,n:n[0],t:k}[r],void 0===p)return;n.push(p)}if(e.push({t:g,d:n}),d.lastIndex==b.length)return e}}function e(a){return a.toFixed(6).replace(".000000","")}function f(b,c){if(b.decompositionPair!==c){b.decompositionPair=c;var d=a.makeMatrixDecomposition(b)}if(c.decompositionPair!==b){c.decompositionPair=b;var f=a.makeMatrixDecomposition(c)}return null==d[0]||null==f[0]?[[!1],[!0],function(a){return a?c[0].d:b[0].d}]:(d[0].push(0),f[0].push(1),[d,f,function(b){var c=a.quat(d[0][3],f[0][3],b[5]),g=a.composeMatrix(b[0],b[1],b[2],c,b[4]),h=g.map(e).join(",");return h}])}function g(a){return a.replace(/[xy]/,"")}function h(a){return a.replace(/(x|y|z|3d)?$/,"3d")}function i(b,c){var d=a.makeMatrixDecomposition&&!0,e=!1;if(!b.length||!c.length){b.length||(e=!0,b=c,c=[]);for(var i=0;i<b.length;i++){var j=b[i].t,k=b[i].d,l="scale"==j.substr(0,5)?1:0;c.push({t:j,d:k.map(function(a){if("number"==typeof a)return l;var b={};for(var c in a)b[c]=l;return b})})}}var n=function(a,b){return"perspective"==a&&"perspective"==b||("matrix"==a||"matrix3d"==a)&&("matrix"==b||"matrix3d"==b)},o=[],p=[],q=[];if(b.length!=c.length){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]]}else for(var i=0;i<b.length;i++){var j,s=b[i].t,t=c[i].t,u=b[i].d,v=c[i].d,w=m[s],x=m[t];if(n(s,t)){if(!d)return;var r=f([b[i]],[c[i]]);o.push(r[0]),p.push(r[1]),q.push(["matrix",[r[2]]])}else{if(s==t)j=s;else if(w[2]&&x[2]&&g(s)==g(t))j=g(s),u=w[2](u),v=x[2](v);else{if(!w[1]||!x[1]||h(s)!=h(t)){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]];break}j=h(s),u=w[1](u),v=x[1](v)}for(var y=[],z=[],A=[],B=0;B<u.length;B++){var C="number"==typeof u[B]?a.mergeNumbers:a.mergeDimensions,r=C(u[B],v[B]);y[B]=r[0],z[B]=r[1],A.push(r[2])}o.push(y),p.push(z),q.push([j,A])}}if(e){var D=o;o=p,p=D}return[o,p,function(a){return a.map(function(a,b){var c=a.map(function(a,c){return q[b][1][c](a)}).join(",");return"matrix"==q[b][0]&&16==c.split(",").length&&(q[b][0]="matrix3d"),q[b][0]+"("+c+")"}).join(" ")}]}var j=null,k={px:0},l={deg:0},m={matrix:["NNNNNN",[j,j,0,0,j,j,0,0,0,0,1,0,j,j,0,1],c],matrix3d:["NNNNNNNNNNNNNNNN",c],rotate:["A"],rotatex:["A"],rotatey:["A"],rotatez:["A"],rotate3d:["NNNA"],perspective:["L"],scale:["Nn",b([j,j,1]),c],scalex:["N",b([j,1,1]),b([j,1])],scaley:["N",b([1,j,1]),b([1,j])],scalez:["N",b([1,1,j])],scale3d:["NNN",c],skew:["Aa",null,c],skewx:["A",null,b([j,l])],skewy:["A",null,b([l,j])],translate:["Tt",b([j,j,k]),c],translatex:["T",b([j,k,k]),b([j,k])],translatey:["T",b([k,j,k]),b([k,j])],translatez:["L",b([k,k,j])],translate3d:["TTL",c]};a.addPropertiesHandler(d,i,["transform"])}(d,f),function(a){function b(a,b){b.concat([a]).forEach(function(b){b in document.documentElement.style&&(c[a]=b)})}var c={};b("transform",["webkitTransform","msTransform"]),b("transformOrigin",["webkitTransformOrigin"]),b("perspective",["webkitPerspective"]),b("perspectiveOrigin",["webkitPerspectiveOrigin"]),a.propertyName=function(a){return c[a]||a}}(d,f)}(),!function(a,b){function c(a){var b=window.document.timeline;b.currentTime=a,b._discardAnimations(),0==b._animations.length?e=!1:requestAnimationFrame(c)}var d=window.requestAnimationFrame;window.requestAnimationFrame=function(a){return d(function(b){window.document.timeline._updateAnimationsPromises(),a(b),window.document.timeline._updateAnimationsPromises()})},b.AnimationTimeline=function(){this._animations=[],this.currentTime=void 0},b.AnimationTimeline.prototype={getAnimations:function(){return this._discardAnimations(),this._animations.slice()},_updateAnimationsPromises:function(){b.animationsWithPromises=b.animationsWithPromises.filter(function(a){return a._updatePromises()})},_discardAnimations:function(){this._updateAnimationsPromises(),this._animations=this._animations.filter(function(a){return"finished"!=a.playState&&"idle"!=a.playState})},_play:function(a){var c=new b.Animation(a,this);return this._animations.push(c),b.restartWebAnimationsNextTick(),c._updatePromises(),c._animation.play(),c._updatePromises(),c},play:function(a){return a&&a.remove(),this._play(a)}};var e=!1;b.restartWebAnimationsNextTick=function(){e||(e=!0,requestAnimationFrame(c))};var f=new b.AnimationTimeline;b.timeline=f;try{Object.defineProperty(window.document,"timeline",{configurable:!0,get:function(){return f}})}catch(g){}try{window.document.timeline=f}catch(g){}}(c,e,f),function(a,b){b.animationsWithPromises=[],b.Animation=function(b,c){if(this.effect=b,b&&(b._animation=this),!c)throw new Error("Animation with null timeline is not supported");this._timeline=c,this._sequenceNumber=a.sequenceNumber++,this._holdTime=0,this._paused=!1,this._isGroup=!1,this._animation=null,this._childAnimations=[],this._callback=null,this._oldPlayState="idle",this._rebuildUnderlyingAnimation(),this._animation.cancel(),this._updatePromises()},b.Animation.prototype={_updatePromises:function(){var a=this._oldPlayState,b=this.playState;return this._readyPromise&&b!==a&&("idle"==b?(this._rejectReadyPromise(),this._readyPromise=void 0):"pending"==a?this._resolveReadyPromise():"pending"==b&&(this._readyPromise=void 0)),this._finishedPromise&&b!==a&&("idle"==b?(this._rejectFinishedPromise(),this._finishedPromise=void 0):"finished"==b?this._resolveFinishedPromise():"finished"==a&&(this._finishedPromise=void 0)),this._oldPlayState=this.playState,this._readyPromise||this._finishedPromise},_rebuildUnderlyingAnimation:function(){this._updatePromises();var a,c,d,e,f=this._animation?!0:!1;f&&(a=this.playbackRate,c=this._paused,d=this.startTime,e=this.currentTime,this._animation.cancel(),this._animation._wrapper=null,this._animation=null),(!this.effect||this.effect instanceof window.KeyframeEffect)&&(this._animation=b.newUnderlyingAnimationForKeyframeEffect(this.effect),b.bindAnimationForKeyframeEffect(this)),(this.effect instanceof window.SequenceEffect||this.effect instanceof window.GroupEffect)&&(this._animation=b.newUnderlyingAnimationForGroup(this.effect),b.bindAnimationForGroup(this)),this.effect&&this.effect._onsample&&b.bindAnimationForCustomEffect(this),f&&(1!=a&&(this.playbackRate=a),null!==d?this.startTime=d:null!==e?this.currentTime=e:null!==this._holdTime&&(this.currentTime=this._holdTime),c&&this.pause()),this._updatePromises()
},_updateChildren:function(){if(this.effect&&"idle"!=this.playState){var a=this.effect._timing.delay;this._childAnimations.forEach(function(c){this._arrangeChildren(c,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c.effect))}.bind(this))}},_setExternalAnimation:function(a){if(this.effect&&this._isGroup)for(var b=0;b<this.effect.children.length;b++)this.effect.children[b]._animation=a,this._childAnimations[b]._setExternalAnimation(a)},_constructChildAnimations:function(){if(this.effect&&this._isGroup){var a=this.effect._timing.delay;this._removeChildAnimations(),this.effect.children.forEach(function(c){var d=window.document.timeline._play(c);this._childAnimations.push(d),d.playbackRate=this.playbackRate,this._paused&&d.pause(),c._animation=this.effect._animation,this._arrangeChildren(d,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c))}.bind(this))}},_arrangeChildren:function(a,b){null===this.startTime?a.currentTime=this.currentTime-b/this.playbackRate:a.startTime!==this.startTime+b/this.playbackRate&&(a.startTime=this.startTime+b/this.playbackRate)},get timeline(){return this._timeline},get playState(){return this._animation?this._animation.playState:"idle"},get finished(){return window.Promise?(this._finishedPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._finishedPromise=new Promise(function(a,b){this._resolveFinishedPromise=function(){a(this)},this._rejectFinishedPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"finished"==this.playState&&this._resolveFinishedPromise()),this._finishedPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get ready(){return window.Promise?(this._readyPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._readyPromise=new Promise(function(a,b){this._resolveReadyPromise=function(){a(this)},this._rejectReadyPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"pending"!==this.playState&&this._resolveReadyPromise()),this._readyPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get onfinish(){return this._onfinish},set onfinish(a){"function"==typeof a?(this._onfinish=a,this._animation.onfinish=function(b){b.target=this,a.call(this,b)}.bind(this)):(this._animation.onfinish=a,this.onfinish=this._animation.onfinish)},get currentTime(){this._updatePromises();var a=this._animation.currentTime;return this._updatePromises(),a},set currentTime(a){this._updatePromises(),this._animation.currentTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.currentTime=a-c}),this._updatePromises()},get startTime(){return this._animation.startTime},set startTime(a){this._updatePromises(),this._animation.startTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.startTime=a+c}),this._updatePromises()},get playbackRate(){return this._animation.playbackRate},set playbackRate(a){this._updatePromises();var b=this.currentTime;this._animation.playbackRate=a,this._forEachChild(function(b){b.playbackRate=a}),"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!==b&&(this.currentTime=b),this._updatePromises()},play:function(){this._updatePromises(),this._paused=!1,this._animation.play(),-1==this._timeline._animations.indexOf(this)&&this._timeline._animations.push(this),this._register(),b.awaitStartTime(this),this._forEachChild(function(a){var b=a.currentTime;a.play(),a.currentTime=b}),this._updatePromises()},pause:function(){this._updatePromises(),this.currentTime&&(this._holdTime=this.currentTime),this._animation.pause(),this._register(),this._forEachChild(function(a){a.pause()}),this._paused=!0,this._updatePromises()},finish:function(){this._updatePromises(),this._animation.finish(),this._register(),this._updatePromises()},cancel:function(){this._updatePromises(),this._animation.cancel(),this._register(),this._removeChildAnimations(),this._updatePromises()},reverse:function(){this._updatePromises();var a=this.currentTime;this._animation.reverse(),this._forEachChild(function(a){a.reverse()}),null!==a&&(this.currentTime=a),this._updatePromises()},addEventListener:function(a,b){var c=b;"function"==typeof b&&(c=function(a){a.target=this,b.call(this,a)}.bind(this),b._wrapper=c),this._animation.addEventListener(a,c)},removeEventListener:function(a,b){this._animation.removeEventListener(a,b&&b._wrapper||b)},_removeChildAnimations:function(){for(;this._childAnimations.length;)this._childAnimations.pop().cancel()},_forEachChild:function(b){var c=0;if(this.effect.children&&this._childAnimations.length<this.effect.children.length&&this._constructChildAnimations(),this._childAnimations.forEach(function(a){b.call(this,a,c),this.effect instanceof window.SequenceEffect&&(c+=a.effect.activeDuration)}.bind(this)),"pending"!=this.playState){var d=this.effect._timing,e=this.currentTime;null!==e&&(e=a.calculateTimeFraction(a.calculateActiveDuration(d),e,d)),(null==e||isNaN(e))&&this._removeChildAnimations()}}},window.Animation=b.Animation}(c,e,f),function(a,b){function c(b){this._frames=a.normalizeKeyframes(b)}function d(){for(var a=!1;h.length;){var b=h.shift();b._updateChildren(),a=!0}return a}var e=function(a){if(a._animation=void 0,a instanceof window.SequenceEffect||a instanceof window.GroupEffect)for(var b=0;b<a.children.length;b++)e(a.children[b])};b.removeMulti=function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c];d._parent?(-1==b.indexOf(d._parent)&&b.push(d._parent),d._parent.children.splice(d._parent.children.indexOf(d),1),d._parent=null,e(d)):d._animation&&d._animation.effect==d&&(d._animation.cancel(),d._animation.effect=new KeyframeEffect(null,[]),d._animation._callback&&(d._animation._callback._animation=null),d._animation._rebuildUnderlyingAnimation(),e(d))}for(c=0;c<b.length;c++)b[c]._rebuild()},b.KeyframeEffect=function(b,d,e){return this.target=b,this._parent=null,e=a.numericTimingToObject(e),this._timingInput=a.cloneTimingInput(e),this._timing=a.normalizeTimingInput(e),this.timing=a.makeTiming(e,!1,this),this.timing._effect=this,"function"==typeof d?(a.deprecated("Custom KeyframeEffect","2015-06-22","Use KeyframeEffect.onsample instead."),this._normalizedKeyframes=d):this._normalizedKeyframes=new c(d),this._keyframes=d,this.activeDuration=a.calculateActiveDuration(this._timing),this},b.KeyframeEffect.prototype={getFrames:function(){return"function"==typeof this._normalizedKeyframes?this._normalizedKeyframes:this._normalizedKeyframes._frames},set onsample(a){if("function"==typeof this.getFrames())throw new Error("Setting onsample on custom effect KeyframeEffect is not supported.");this._onsample=a,this._animation&&this._animation._rebuildUnderlyingAnimation()},get parent(){return this._parent},clone:function(){if("function"==typeof this.getFrames())throw new Error("Cloning custom effects is not supported.");var b=new KeyframeEffect(this.target,[],a.cloneTimingInput(this._timingInput));return b._normalizedKeyframes=this._normalizedKeyframes,b._keyframes=this._keyframes,b},remove:function(){b.removeMulti([this])}};var f=Element.prototype.animate;Element.prototype.animate=function(a,c){return b.timeline._play(new b.KeyframeEffect(this,a,c))};var g=document.createElementNS("http://www.w3.org/1999/xhtml","div");b.newUnderlyingAnimationForKeyframeEffect=function(a){if(a){var b=a.target||g,c=a._keyframes;"function"==typeof c&&(c=[]);var d=a._timingInput}else var b=g,c=[],d=0;return f.apply(b,[c,d])},b.bindAnimationForKeyframeEffect=function(a){a.effect&&"function"==typeof a.effect._normalizedKeyframes&&b.bindAnimationForCustomEffect(a)};var h=[];b.awaitStartTime=function(a){null===a.startTime&&a._isGroup&&(0==h.length&&requestAnimationFrame(d),h.push(a))};var i=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){window.document.timeline._updateAnimationsPromises();var a=i.apply(this,arguments);return d()&&(a=i.apply(this,arguments)),window.document.timeline._updateAnimationsPromises(),a}}),window.KeyframeEffect=b.KeyframeEffect,window.Element.prototype.getAnimations=function(){return document.timeline.getAnimations().filter(function(a){return null!==a.effect&&a.effect.target==this}.bind(this))}}(c,e,f),function(a,b){function c(a){a._registered||(a._registered=!0,f.push(a),g||(g=!0,requestAnimationFrame(d)))}function d(){var a=f;f=[],a.sort(function(a,b){return a._sequenceNumber-b._sequenceNumber}),a=a.filter(function(a){a();var b=a._animation?a._animation.playState:"idle";return"running"!=b&&"pending"!=b&&(a._registered=!1),a._registered}),f.push.apply(f,a),f.length?(g=!0,requestAnimationFrame(d)):g=!1}var e=(document.createElementNS("http://www.w3.org/1999/xhtml","div"),0);b.bindAnimationForCustomEffect=function(b){var d,f=b.effect.target,g="function"==typeof b.effect.getFrames();d=g?b.effect.getFrames():b.effect._onsample;var h=b.effect.timing,i=null;h=a.normalizeTimingInput(h);var j=function(){var c=j._animation?j._animation.currentTime:null;null!==c&&(c=a.calculateTimeFraction(a.calculateActiveDuration(h),c,h),isNaN(c)&&(c=null)),c!==i&&(g?d(c,f,b.effect):d(c,b.effect,b.effect._animation)),i=c};j._animation=b,j._registered=!1,j._sequenceNumber=e++,b._callback=j,c(j)};var f=[],g=!1;b.Animation.prototype._register=function(){this._callback&&c(this._callback)}}(c,e,f),function(a,b){function c(a){return a._timing.delay+a.activeDuration+a._timing.endDelay}function d(b,c){this._parent=null,this.children=b||[],this._reparent(this.children),c=a.numericTimingToObject(c),this._timingInput=a.cloneTimingInput(c),this._timing=a.normalizeTimingInput(c,!0),this.timing=a.makeTiming(c,!0,this),this.timing._effect=this,"auto"===this._timing.duration&&(this._timing.duration=this.activeDuration)}window.SequenceEffect=function(){d.apply(this,arguments)},window.GroupEffect=function(){d.apply(this,arguments)},d.prototype={_isAncestor:function(a){for(var b=this;null!==b;){if(b==a)return!0;b=b._parent}return!1},_rebuild:function(){for(var a=this;a;)"auto"===a.timing.duration&&(a._timing.duration=a.activeDuration),a=a._parent;this._animation&&this._animation._rebuildUnderlyingAnimation()},_reparent:function(a){b.removeMulti(a);for(var c=0;c<a.length;c++)a[c]._parent=this},_putChild:function(a,b){for(var c=b?"Cannot append an ancestor or self":"Cannot prepend an ancestor or self",d=0;d<a.length;d++)if(this._isAncestor(a[d]))throw{type:DOMException.HIERARCHY_REQUEST_ERR,name:"HierarchyRequestError",message:c};for(var d=0;d<a.length;d++)b?this.children.push(a[d]):this.children.unshift(a[d]);this._reparent(a),this._rebuild()},append:function(){this._putChild(arguments,!0)},prepend:function(){this._putChild(arguments,!1)},get parent(){return this._parent},get firstChild(){return this.children.length?this.children[0]:null},get lastChild(){return this.children.length?this.children[this.children.length-1]:null},clone:function(){for(var b=a.cloneTimingInput(this._timingInput),c=[],d=0;d<this.children.length;d++)c.push(this.children[d].clone());return this instanceof GroupEffect?new GroupEffect(c,b):new SequenceEffect(c,b)},remove:function(){b.removeMulti([this])}},window.SequenceEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.SequenceEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a+=c(b)}),Math.max(a,0)}}),window.GroupEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.GroupEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a=Math.max(a,c(b))}),a}}),b.newUnderlyingAnimationForGroup=function(c){var d,e=null,f=function(b){var c=d._wrapper;return c&&"pending"!=c.playState&&c.effect?null==b?void c._removeChildAnimations():0==b&&c.playbackRate<0&&(e||(e=a.normalizeTimingInput(c.effect.timing)),b=a.calculateTimeFraction(a.calculateActiveDuration(e),-1,e),isNaN(b)||null==b)?(c._forEachChild(function(a){a.currentTime=-1}),void c._removeChildAnimations()):void 0:void 0},g=new KeyframeEffect(null,[],c._timing);return g.onsample=f,d=b.timeline._play(g)},b.bindAnimationForGroup=function(a){a._animation._wrapper=a,a._isGroup=!0,b.awaitStartTime(a),a._constructChildAnimations(),a._setExternalAnimation(a)},b.groupChildDuration=c}(c,e,f)}({},function(){return this}());
//# sourceMappingURL=web-animations-next-lite.min.js.map
Polymer({

    is: 'opaque-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      node.style.opacity = '0';
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function(config) {
      config.node.style.opacity = '';
    }

  });
/**
   * `Polymer.NeonAnimatableBehavior` is implemented by elements containing animations for use with
   * elements implementing `Polymer.NeonAnimationRunnerBehavior`.
   * @polymerBehavior
   */
  Polymer.NeonAnimatableBehavior = {

    properties: {

      /**
       * Animation configuration. See README for more info.
       */
      animationConfig: {
        type: Object
      },

      /**
       * Convenience property for setting an 'entry' animation. Do not set `animationConfig.entry`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      entryAnimation: {
        observer: '_entryAnimationChanged',
        type: String
      },

      /**
       * Convenience property for setting an 'exit' animation. Do not set `animationConfig.exit`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      exitAnimation: {
        observer: '_exitAnimationChanged',
        type: String
      }

    },

    _entryAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      if (this.entryAnimation !== 'fade-in-animation') {
        // insert polyfill hack
        this.animationConfig['entry'] = [{
          name: 'opaque-animation',
          node: this
        }, {
          name: this.entryAnimation,
          node: this
        }];
      } else {
        this.animationConfig['entry'] = [{
          name: this.entryAnimation,
          node: this
        }];
      }
    },

    _exitAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      this.animationConfig['exit'] = [{
        name: this.exitAnimation,
        node: this
      }];
    },

    _copyProperties: function(config1, config2) {
      // shallowly copy properties from config2 to config1
      for (var property in config2) {
        config1[property] = config2[property];
      }
    },

    _cloneConfig: function(config) {
      var clone = {
        isClone: true
      };
      this._copyProperties(clone, config);
      return clone;
    },

    _getAnimationConfigRecursive: function(type, map, allConfigs) {
      if (!this.animationConfig) {
        return;
      }

      if(this.animationConfig.value && typeof this.animationConfig.value === 'function') {
      	this._warn(this._logf('playAnimation', "Please put 'animationConfig' inside of your components 'properties' object instead of outside of it."));
      	return;
      }

      // type is optional
      var thisConfig;
      if (type) {
        thisConfig = this.animationConfig[type];
      } else {
        thisConfig = this.animationConfig;
      }

      if (!Array.isArray(thisConfig)) {
        thisConfig = [thisConfig];
      }

      // iterate animations and recurse to process configurations from child nodes
      if (thisConfig) {
        for (var config, index = 0; config = thisConfig[index]; index++) {
          if (config.animatable) {
            config.animatable._getAnimationConfigRecursive(config.type || type, map, allConfigs);
          } else {
            if (config.id) {
              var cachedConfig = map[config.id];
              if (cachedConfig) {
                // merge configurations with the same id, making a clone lazily
                if (!cachedConfig.isClone) {
                  map[config.id] = this._cloneConfig(cachedConfig)
                  cachedConfig = map[config.id];
                }
                this._copyProperties(cachedConfig, config);
              } else {
                // put any configs with an id into a map
                map[config.id] = config;
              }
            } else {
              allConfigs.push(config);
            }
          }
        }
      }
    },

    /**
     * An element implementing `Polymer.NeonAnimationRunnerBehavior` calls this method to configure
     * an animation with an optional type. Elements implementing `Polymer.NeonAnimatableBehavior`
     * should define the property `animationConfig`, which is either a configuration object
     * or a map of animation type to array of configuration objects.
     */
    getAnimationConfig: function(type) {
      var map = {};
      var allConfigs = [];
      this._getAnimationConfigRecursive(type, map, allConfigs);
      // append the configurations saved in the map to the array
      for (var key in map) {
        allConfigs.push(map[key]);
      }
      return allConfigs;
    }

  };
/**
   * `Polymer.NeonAnimationRunnerBehavior` adds a method to run animations.
   *
   * @polymerBehavior Polymer.NeonAnimationRunnerBehavior
   */
  Polymer.NeonAnimationRunnerBehaviorImpl = {

    properties: {

      _animationMeta: {
        type: Object,
        value: function() {
          return new Polymer.IronMeta({type: 'animation'});
        }
      },

      /** @type {?Object} */
      _player: {
        type: Object
      }

    },

    _configureAnimationEffects: function(allConfigs) {
      var allAnimations = [];
      if (allConfigs.length > 0) {
        for (var config, index = 0; config = allConfigs[index]; index++) {
          var animationConstructor = this._animationMeta.byKey(config.name);
          if (animationConstructor) {
            var animation = animationConstructor && new animationConstructor();
            var effect = animation.configure(config);
            if (effect) {
              allAnimations.push({
                animation: animation,
                config: config,
                effect: effect
              });
            }
          } else {
            console.warn(this.is + ':', config.name, 'not found!');
          }
        }
      }
      return allAnimations;
    },

    _runAnimationEffects: function(allEffects) {
      return document.timeline.play(new GroupEffect(allEffects));
    },

    _completeAnimations: function(allAnimations) {
      for (var animation, index = 0; animation = allAnimations[index]; index++) {
        animation.animation.complete(animation.config);
      }
    },

    /**
     * Plays an animation with an optional `type`.
     * @param {string=} type
     * @param {!Object=} cookie
     */
    playAnimation: function(type, cookie) {
      var allConfigs = this.getAnimationConfig(type);
      if (!allConfigs) {
        return;
      }
      var allAnimations = this._configureAnimationEffects(allConfigs);
      var allEffects = allAnimations.map(function(animation) {
        return animation.effect;
      });

      if (allEffects.length > 0) {
        this._player = this._runAnimationEffects(allEffects);
        this._player.onfinish = function() {
          this._completeAnimations(allAnimations);

          if (this._player) {
            this._player.cancel();
            this._player = null;
          }

          this.fire('neon-animation-finish', cookie, {bubbles: false});
        }.bind(this);

      } else {
        this.fire('neon-animation-finish', cookie, {bubbles: false});
      }
    },

    /**
     * Cancels the currently running animation.
     */
    cancelAnimation: function() {
      if (this._player) {
        this._player.cancel();
      }
    }
  };

  /** @polymerBehavior Polymer.NeonAnimationRunnerBehavior */
  Polymer.NeonAnimationRunnerBehavior = [
    Polymer.NeonAnimatableBehavior,
    Polymer.NeonAnimationRunnerBehaviorImpl
  ];
(function() {

  Polymer({

    is: 'neon-animated-pages',

    behaviors: [
      Polymer.IronResizableBehavior,
      Polymer.IronSelectableBehavior,
      Polymer.NeonAnimationRunnerBehavior
    ],

    properties: {

      activateEvent: {
        type: String,
        value: ''
      },

      // if true, the initial page selection will also be animated according to its animation config.
      animateInitialSelection: {
        type: Boolean,
        value: false
      }

    },

    observers: [
      '_selectedChanged(selected)'
    ],

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _selectedChanged: function(selected) {

      var selectedPage = this.selectedItem;
      var oldPage = this._valueToItem(this._prevSelected) || false;
      this._prevSelected = selected;

      // on initial load and if animateInitialSelection is negated, simply display selectedPage.
      if (!oldPage && !this.animateInitialSelection) {
        this._completeSelectedChanged();
        return;
      }

      // insert safari fix.
      this.animationConfig = [{
        name: 'opaque-animation',
        node: selectedPage
      }];

      // configure selectedPage animations.
      if (this.entryAnimation) {
        this.animationConfig.push({
          name: this.entryAnimation,
          node: selectedPage
        });
      } else {
        if (selectedPage.getAnimationConfig) {
          this.animationConfig.push({
            animatable: selectedPage,
            type: 'entry'
          });
        }
      }

      // configure oldPage animations iff exists.
      if (oldPage) {

        // cancel the currently running animation if one is ongoing.
        if (oldPage.classList.contains('neon-animating')) {
          this._squelchNextFinishEvent = true;
          this.cancelAnimation();
          this._completeSelectedChanged();
          this._squelchNextFinishEvent = false;
        }

        // configure the animation.
        if (this.exitAnimation) {
          this.animationConfig.push({
            name: this.exitAnimation,
            node: oldPage
          });
        } else {
          if (oldPage.getAnimationConfig) {
            this.animationConfig.push({
              animatable: oldPage,
              type: 'exit'
            });
          }
        }

        // display the oldPage during the transition.
        oldPage.classList.add('neon-animating');
      }

      // display the selectedPage during the transition.
      selectedPage.classList.add('neon-animating');

      // actually run the animations.
      if (this.animationConfig.length > 1) {

        // on first load, ensure we run animations only after element is attached.
        if (!this.isAttached) {
          this.async(function () {
            this.playAnimation(undefined, {
              fromPage: null,
              toPage: selectedPage
            });
          });

        } else {
          this.playAnimation(undefined, {
            fromPage: oldPage,
            toPage: selectedPage
          });
        }

      } else {
        this._completeSelectedChanged(oldPage, selectedPage);
      }
    },

    /**
     * @param {Object=} oldPage
     * @param {Object=} selectedPage
     */
    _completeSelectedChanged: function(oldPage, selectedPage) {
      if (selectedPage) {
        selectedPage.classList.remove('neon-animating');
      }
      if (oldPage) {
        oldPage.classList.remove('neon-animating');
      }
      if (!selectedPage || !oldPage) {
        var nodes = Polymer.dom(this.$.content).getDistributedNodes();
        for (var node, index = 0; node = nodes[index]; index++) {
          node.classList && node.classList.remove('neon-animating');
        }
      }
      this.async(this._notifyPageResize);
    },

    _onNeonAnimationFinish: function(event) {
      if (this._squelchNextFinishEvent) {
        this._squelchNextFinishEvent = false;
        return;
      }
      this._completeSelectedChanged(event.detail.fromPage, event.detail.toPage);
    },

    _notifyPageResize: function() {
      var selectedPage = this.selectedItem || this._valueToItem(this.selected);
      this.resizerShouldNotify = function(element) {
        return element == selectedPage;
      }
      this.notifyResize();
    }

  })

})();
/**
   * The `iron-iconset-svg` element allows users to define their own icon sets
   * that contain svg icons. The svg icon elements should be children of the
   * `iron-iconset-svg` element. Multiple icons should be given distinct id's.
   *
   * Using svg elements to create icons has a few advantages over traditional
   * bitmap graphics like jpg or png. Icons that use svg are vector based so
   * they are resolution independent and should look good on any device. They
   * are stylable via css. Icons can be themed, colorized, and even animated.
   *
   * Example:
   *
   *     <iron-iconset-svg name="my-svg-icons" size="24">
   *       <svg>
   *         <defs>
   *           <g id="shape">
   *             <rect x="12" y="0" width="12" height="24" />
   *             <circle cx="12" cy="12" r="12" />
   *           </g>
   *         </defs>
   *       </svg>
   *     </iron-iconset-svg>
   *
   * This will automatically register the icon set "my-svg-icons" to the iconset
   * database.  To use these icons from within another element, make a
   * `iron-iconset` element and call the `byId` method
   * to retrieve a given iconset. To apply a particular icon inside an
   * element use the `applyIcon` method. For example:
   *
   *     iconset.applyIcon(iconNode, 'car');
   *
   * @element iron-iconset-svg
   * @demo demo/index.html
   * @implements {Polymer.Iconset}
   */
  Polymer({
    is: 'iron-iconset-svg',

    properties: {

      /**
       * The name of the iconset.
       */
      name: {
        type: String,
        observer: '_nameChanged'
      },

      /**
       * The size of an individual icon. Note that icons must be square.
       */
      size: {
        type: Number,
        value: 24
      }

    },

    attached: function() {
      this.style.display = 'none';
    },

    /**
     * Construct an array of all icon names in this iconset.
     *
     * @return {!Array} Array of icon names.
     */
    getIconNames: function() {
      this._icons = this._createIconMap();
      return Object.keys(this._icons).map(function(n) {
        return this.name + ':' + n;
      }, this);
    },

    /**
     * Applies an icon to the given element.
     *
     * An svg icon is prepended to the element's shadowRoot if it exists,
     * otherwise to the element itself.
     *
     * @method applyIcon
     * @param {Element} element Element to which the icon is applied.
     * @param {string} iconName Name of the icon to apply.
     * @return {?Element} The svg element which renders the icon.
     */
    applyIcon: function(element, iconName) {
      // insert svg element into shadow root, if it exists
      element = element.root || element;
      // Remove old svg element
      this.removeIcon(element);
      // install new svg element
      var svg = this._cloneIcon(iconName);
      if (svg) {
        var pde = Polymer.dom(element);
        pde.insertBefore(svg, pde.childNodes[0]);
        return element._svgIcon = svg;
      }
      return null;
    },

    /**
     * Remove an icon from the given element by undoing the changes effected
     * by `applyIcon`.
     *
     * @param {Element} element The element from which the icon is removed.
     */
    removeIcon: function(element) {
      // Remove old svg element
      if (element._svgIcon) {
        Polymer.dom(element).removeChild(element._svgIcon);
        element._svgIcon = null;
      }
    },

    /**
     *
     * When name is changed, register iconset metadata
     *
     */
    _nameChanged: function() {
      new Polymer.IronMeta({type: 'iconset', key: this.name, value: this});
      this.async(function() {
        this.fire('iron-iconset-added', this, {node: window});
      });
    },

    /**
     * Create a map of child SVG elements by id.
     *
     * @return {!Object} Map of id's to SVG elements.
     */
    _createIconMap: function() {
      // Objects chained to Object.prototype (`{}`) have members. Specifically,
      // on FF there is a `watch` method that confuses the icon map, so we
      // need to use a null-based object here.
      var icons = Object.create(null);
      Polymer.dom(this).querySelectorAll('[id]')
        .forEach(function(icon) {
          icons[icon.id] = icon;
        });
      return icons;
    },

    /**
     * Produce installable clone of the SVG element matching `id` in this
     * iconset, or `undefined` if there is no matching element.
     *
     * @return {Element} Returns an installable clone of the SVG element
     * matching `id`.
     */
    _cloneIcon: function(id) {
      // create the icon map on-demand, since the iconset itself has no discrete
      // signal to know when it's children are fully parsed
      this._icons = this._icons || this._createIconMap();
      return this._prepareSvgClone(this._icons[id], this.size);
    },

    /**
     * @param {Element} sourceSvg
     * @param {number} size
     * @return {Element}
     */
    _prepareSvgClone: function(sourceSvg, size) {
      if (sourceSvg) {
        var content = sourceSvg.cloneNode(true),
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
            viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size;
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // TODO(dfreedm): `pointer-events: none` works around https://crbug.com/370136
        // TODO(sjmiles): inline style may not be ideal, but avoids requiring a shadow-root
        svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
        svg.appendChild(content).removeAttribute('id');
        return svg;
      }
      return null;
    }

  });
Polymer({

      is: 'iron-icon',

      properties: {

        /**
         * The name of the icon to use. The name should be of the form:
         * `iconset_name:icon_name`.
         */
        icon: {
          type: String,
          observer: '_iconChanged'
        },

        /**
         * The name of the theme to used, if one is specified by the
         * iconset.
         */
        theme: {
          type: String,
          observer: '_updateIcon'
        },

        /**
         * If using iron-icon without an iconset, you can set the src to be
         * the URL of an individual icon image file. Note that this will take
         * precedence over a given icon attribute.
         */
        src: {
          type: String,
          observer: '_srcChanged'
        },

        /**
         * @type {!Polymer.IronMeta}
         */
        _meta: {
          value: Polymer.Base.create('iron-meta', {type: 'iconset'}),
          observer: '_updateIcon'
        }

      },

      _DEFAULT_ICONSET: 'icons',

      _iconChanged: function(icon) {
        var parts = (icon || '').split(':');
        this._iconName = parts.pop();
        this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
        this._updateIcon();
      },

      _srcChanged: function(src) {
        this._updateIcon();
      },

      _usesIconset: function() {
        return this.icon || !this.src;
      },

      /** @suppress {visibility} */
      _updateIcon: function() {
        if (this._usesIconset()) {
          if (this._img && this._img.parentNode) {
            Polymer.dom(this.root).removeChild(this._img);
          }
          if (this._iconName === "") {
            if (this._iconset) {
              this._iconset.removeIcon(this);
            }
          } else if (this._iconsetName && this._meta) {
            this._iconset = /** @type {?Polymer.Iconset} */ (
              this._meta.byKey(this._iconsetName));
            if (this._iconset) {
              this._iconset.applyIcon(this, this._iconName, this.theme);
              this.unlisten(window, 'iron-iconset-added', '_updateIcon');
            } else {
              this.listen(window, 'iron-iconset-added', '_updateIcon');
            }
          }
        } else {
          if (this._iconset) {
            this._iconset.removeIcon(this);
          }
          if (!this._img) {
            this._img = document.createElement('img');
            this._img.style.width = '100%';
            this._img.style.height = '100%';
            this._img.draggable = false;
          }
          this._img.src = this.src;
          Polymer.dom(this.root).appendChild(this._img);
        }
      }

    });
function MakePromise (asap) {
  function Promise(fn) {
		if (typeof this !== 'object' || typeof fn !== 'function') throw new TypeError();
		this._state = null;
		this._value = null;
		this._deferreds = []

		doResolve(fn, resolve.bind(this), reject.bind(this));
	}

	function handle(deferred) {
		var me = this;
		if (this._state === null) {
			this._deferreds.push(deferred);
			return
		}
		asap(function() {
			var cb = me._state ? deferred.onFulfilled : deferred.onRejected
			if (typeof cb !== 'function') {
				(me._state ? deferred.resolve : deferred.reject)(me._value);
				return;
			}
			var ret;
			try {
				ret = cb(me._value);
			}
			catch (e) {
				deferred.reject(e);
				return;
			}
			deferred.resolve(ret);
		})
	}

	function resolve(newValue) {
		try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
			if (newValue === this) throw new TypeError();
			if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
				var then = newValue.then;
				if (typeof then === 'function') {
					doResolve(then.bind(newValue), resolve.bind(this), reject.bind(this));
					return;
				}
			}
			this._state = true;
			this._value = newValue;
			finale.call(this);
		} catch (e) { reject.call(this, e); }
	}

	function reject(newValue) {
		this._state = false;
		this._value = newValue;
		finale.call(this);
	}

	function finale() {
		for (var i = 0, len = this._deferreds.length; i < len; i++) {
			handle.call(this, this._deferreds[i]);
		}
		this._deferreds = null;
	}

	/**
	 * Take a potentially misbehaving resolver function and make sure
	 * onFulfilled and onRejected are only called once.
	 *
	 * Makes no guarantees about asynchrony.
	 */
	function doResolve(fn, onFulfilled, onRejected) {
		var done = false;
		try {
			fn(function (value) {
				if (done) return;
				done = true;
				onFulfilled(value);
			}, function (reason) {
				if (done) return;
				done = true;
				onRejected(reason);
			})
		} catch (ex) {
			if (done) return;
			done = true;
			onRejected(ex);
		}
	}

	Promise.prototype['catch'] = function (onRejected) {
		return this.then(null, onRejected);
	};

	Promise.prototype.then = function(onFulfilled, onRejected) {
		var me = this;
		return new Promise(function(resolve, reject) {
      handle.call(me, {
        onFulfilled: onFulfilled,
        onRejected: onRejected,
        resolve: resolve,
        reject: reject
      });
		})
	};

	Promise.resolve = function (value) {
		if (value && typeof value === 'object' && value.constructor === Promise) {
			return value;
		}

		return new Promise(function (resolve) {
			resolve(value);
		});
	};

	Promise.reject = function (value) {
		return new Promise(function (resolve, reject) {
			reject(value);
		});
	};

	
  return Promise;
}

if (typeof module !== 'undefined') {
  module.exports = MakePromise;
};
if (!window.Promise) {
  window.Promise = MakePromise(Polymer.Base.async);
};
'use strict';

  Polymer({
    is: 'iron-request',

    hostAttributes: {
      hidden: true
    },

    properties: {

      /**
       * A reference to the XMLHttpRequest instance used to generate the
       * network request.
       *
       * @type {XMLHttpRequest}
       */
      xhr: {
        type: Object,
        notify: true,
        readOnly: true,
        value: function() {
          return new XMLHttpRequest();
        }
      },

      /**
       * A reference to the parsed response body, if the `xhr` has completely
       * resolved.
       *
       * @type {*}
       * @default null
       */
      response: {
        type: Object,
        notify: true,
        readOnly: true,
        value: function() {
          return null;
        }
      },

      /**
       * A reference to the status code, if the `xhr` has completely resolved.
       */
      status: {
        type: Number,
        notify: true,
        readOnly: true,
        value: 0
      },

      /**
       * A reference to the status text, if the `xhr` has completely resolved.
       */
      statusText: {
        type: String,
        notify: true,
        readOnly: true,
        value: ''
      },

      /**
       * A promise that resolves when the `xhr` response comes back, or rejects
       * if there is an error before the `xhr` completes.
       *
       * @type {Promise}
       */
      completes: {
        type: Object,
        readOnly: true,
        notify: true,
        value: function() {
          return new Promise(function (resolve, reject) {
            this.resolveCompletes = resolve;
            this.rejectCompletes = reject;
          }.bind(this));
        }
      },

      /**
       * An object that contains progress information emitted by the XHR if
       * available.
       *
       * @default {}
       */
      progress: {
        type: Object,
        notify: true,
        readOnly: true,
        value: function() {
          return {};
        }
      },

      /**
       * Aborted will be true if an abort of the request is attempted.
       */
      aborted: {
        type: Boolean,
        notify: true,
        readOnly: true,
        value: false,
      },

      /**
       * Errored will be true if the browser fired an error event from the
       * XHR object (mainly network errors).
       */
      errored: {
        type: Boolean,
        notify: true,
        readOnly: true,
        value: false
      },

      /**
       * TimedOut will be true if the XHR threw a timeout event.
       */
      timedOut: {
        type: Boolean,
        notify: true,
        readOnly: true,
        value: false
      }
    },

    /**
     * Succeeded is true if the request succeeded. The request succeeded if it
     * loaded without error, wasn't aborted, and the status code is ≥ 200, and
     * < 300, or if the status code is 0.
     *
     * The status code 0 is accepted as a success because some schemes - e.g.
     * file:// - don't provide status codes.
     *
     * @return {boolean}
     */
    get succeeded() {
      if (this.errored || this.aborted || this.timedOut) {
        return false;
      }
      var status = this.xhr.status || 0;

      // Note: if we are using the file:// protocol, the status code will be 0
      // for all outcomes (successful or otherwise).
      return status === 0 ||
        (status >= 200 && status < 300);
    },

    /**
     * Sends an HTTP request to the server and returns the XHR object.
     *
     * The handling of the `body` parameter will vary based on the Content-Type
     * header. See the docs for iron-ajax's `body` param for details.
     *
     * @param {{
     *   url: string,
     *   method: (string|undefined),
     *   async: (boolean|undefined),
     *   body: (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined|Object),
     *   headers: (Object|undefined),
     *   handleAs: (string|undefined),
     *   jsonPrefix: (string|undefined),
     *   withCredentials: (boolean|undefined)}} options -
     *     url The url to which the request is sent.
     *     method The HTTP method to use, default is GET.
     *     async By default, all requests are sent asynchronously. To send synchronous requests,
     *         set to false.
     *     body The content for the request body for POST method.
     *     headers HTTP request headers.
     *     handleAs The response type. Default is 'text'.
     *     withCredentials Whether or not to send credentials on the request. Default is false.
     *   timeout: (Number|undefined)
     * @return {Promise}
     */
    send: function (options) {
      var xhr = this.xhr;

      if (xhr.readyState > 0) {
        return null;
      }

      xhr.addEventListener('progress', function (progress) {
        this._setProgress({
          lengthComputable: progress.lengthComputable,
          loaded: progress.loaded,
          total: progress.total
        });
      }.bind(this))

      xhr.addEventListener('error', function (error) {
        this._setErrored(true);
        this._updateStatus();
        this.rejectCompletes(error);
      }.bind(this));

      xhr.addEventListener('timeout', function (error) {
        this._setTimedOut(true);
        this._updateStatus();
        this.rejectCompletes(error);
      }.bind(this));

      xhr.addEventListener('abort', function () {
        this._updateStatus();
        this.rejectCompletes(new Error('Request aborted.'));
      }.bind(this));

      // Called after all of the above.
      xhr.addEventListener('loadend', function () {
        this._updateStatus();
        this._setResponse(this.parseResponse());

        if (!this.succeeded) {
          this.rejectCompletes(new Error('The request failed with status code: ' + this.xhr.status));
          return;
        }

        this.resolveCompletes(this);
      }.bind(this));

      this.url = options.url;
      xhr.open(
        options.method || 'GET',
        options.url,
        options.async !== false
      );

      var acceptType = {
        'json': 'application/json',
        'text': 'text/plain',
        'html': 'text/html',
        'xml': 'application/xml',
        'arraybuffer': 'application/octet-stream'
      }[options.handleAs];
      var headers = options.headers || Object.create(null);
      var newHeaders = Object.create(null);
      for (var key in headers) {
        newHeaders[key.toLowerCase()] = headers[key];
      }
      headers = newHeaders;

      if (acceptType && !headers['accept']) {
        headers['accept'] = acceptType;
      }
      Object.keys(headers).forEach(function (requestHeader) {
        if (/[A-Z]/.test(requestHeader)) {
          Polymer.Base._error('Headers must be lower case, got', requestHeader);
        }
        xhr.setRequestHeader(
          requestHeader,
          headers[requestHeader]
        );
      }, this);

      if (options.async !== false) {
        if (options.async) {
          xhr.timeout = options.timeout;
        }

        var handleAs = options.handleAs;

        // If a JSON prefix is present, the responseType must be 'text' or the
        // browser won’t be able to parse the response.
        if (!!options.jsonPrefix || !handleAs) {
          handleAs = 'text';
        }

        // In IE, `xhr.responseType` is an empty string when the response
        // returns. Hence, caching it as `xhr._responseType`.
        xhr.responseType = xhr._responseType = handleAs;

        // Cache the JSON prefix, if it exists.
        if (!!options.jsonPrefix) {
          xhr._jsonPrefix = options.jsonPrefix;
        }
      }

      xhr.withCredentials = !!options.withCredentials;


      var body = this._encodeBodyObject(options.body, headers['content-type']);

      xhr.send(
        /** @type {ArrayBuffer|ArrayBufferView|Blob|Document|FormData|
                   null|string|undefined} */
        (body));

      return this.completes;
    },

    /**
     * Attempts to parse the response body of the XHR. If parsing succeeds,
     * the value returned will be deserialized based on the `responseType`
     * set on the XHR.
     *
     * @return {*} The parsed response,
     * or undefined if there was an empty response or parsing failed.
     */
    parseResponse: function () {
      var xhr = this.xhr;
      var responseType = xhr.responseType || xhr._responseType;
      var preferResponseText = !this.xhr.responseType;
      var prefixLen = (xhr._jsonPrefix && xhr._jsonPrefix.length) || 0;

      try {
        switch (responseType) {
          case 'json':
            // If the xhr object doesn't have a natural `xhr.responseType`,
            // we can assume that the browser hasn't parsed the response for us,
            // and so parsing is our responsibility. Likewise if response is
            // undefined, as there's no way to encode undefined in JSON.
            if (preferResponseText || xhr.response === undefined) {
              // Try to emulate the JSON section of the response body section of
              // the spec: https://xhr.spec.whatwg.org/#response-body
              // That is to say, we try to parse as JSON, but if anything goes
              // wrong return null.
              try {
                return JSON.parse(xhr.responseText);
              } catch (_) {
                return null;
              }
            }

            return xhr.response;
          case 'xml':
            return xhr.responseXML;
          case 'blob':
          case 'document':
          case 'arraybuffer':
            return xhr.response;
          case 'text':
          default: {
            // If `prefixLen` is set, it implies the response should be parsed
            // as JSON once the prefix of length `prefixLen` is stripped from
            // it. Emulate the behavior above where null is returned on failure
            // to parse.
            if (prefixLen) {
              try {
                return JSON.parse(xhr.responseText.substring(prefixLen));
              } catch (_) {
                return null;
              }
            }
            return xhr.responseText;
          }
        }
      } catch (e) {
        this.rejectCompletes(new Error('Could not parse response. ' + e.message));
      }
    },

    /**
     * Aborts the request.
     */
    abort: function () {
      this._setAborted(true);
      this.xhr.abort();
    },

    /**
     * @param {*} body The given body of the request to try and encode.
     * @param {?string} contentType The given content type, to infer an encoding
     *     from.
     * @return {*} Either the encoded body as a string, if successful,
     *     or the unaltered body object if no encoding could be inferred.
     */
    _encodeBodyObject: function(body, contentType) {
      if (typeof body == 'string') {
        return body;  // Already encoded.
      }
      var bodyObj = /** @type {Object} */ (body);
      switch(contentType) {
        case('application/json'):
          return JSON.stringify(bodyObj);
        case('application/x-www-form-urlencoded'):
          return this._wwwFormUrlEncode(bodyObj);
      }
      return body;
    },

    /**
     * @param {Object} object The object to encode as x-www-form-urlencoded.
     * @return {string} .
     */
    _wwwFormUrlEncode: function(object) {
      if (!object) {
        return '';
      }
      var pieces = [];
      Object.keys(object).forEach(function(key) {
        // TODO(rictic): handle array values here, in a consistent way with
        //   iron-ajax params.
        pieces.push(
            this._wwwFormUrlEncodePiece(key) + '=' +
            this._wwwFormUrlEncodePiece(object[key]));
      }, this);
      return pieces.join('&');
    },

    /**
     * @param {*} str A key or value to encode as x-www-form-urlencoded.
     * @return {string} .
     */
    _wwwFormUrlEncodePiece: function(str) {
      // Spec says to normalize newlines to \r\n and replace %20 spaces with +.
      // jQuery does this as well, so this is likely to be widely compatible.
      if (str === null) {
        return '';
      }
      return encodeURIComponent(str.toString().replace(/\r?\n/g, '\r\n'))
          .replace(/%20/g, '+');
    },

    /**
     * Updates the status code and status text.
     */
    _updateStatus: function() {
      this._setStatus(this.xhr.status);
      this._setStatusText((this.xhr.statusText === undefined) ? '' : this.xhr.statusText);
    }
  });
'use strict';

  Polymer({

    is: 'iron-ajax',

    /**
     * Fired when a request is sent.
     *
     * @event request
     * @event iron-ajax-request
     */

    /**
     * Fired when a response is received.
     *
     * @event response
     * @event iron-ajax-response
     */

    /**
     * Fired when an error is received.
     *
     * @event error
     * @event iron-ajax-error
     */

    hostAttributes: {
      hidden: true
    },

    properties: {
      /**
       * The URL target of the request.
       */
      url: {
        type: String
      },

      /**
       * An object that contains query parameters to be appended to the
       * specified `url` when generating a request. If you wish to set the body
       * content when making a POST request, you should use the `body` property
       * instead.
       */
      params: {
        type: Object,
        value: function() {
          return {};
        }
      },

      /**
       * The HTTP method to use such as 'GET', 'POST', 'PUT', or 'DELETE'.
       * Default is 'GET'.
       */
      method: {
        type: String,
        value: 'GET'
      },

      /**
       * HTTP request headers to send.
       *
       * Example:
       *
       *     <iron-ajax
       *         auto
       *         url="http://somesite.com"
       *         headers='{"X-Requested-With": "XMLHttpRequest"}'
       *         handle-as="json"></iron-ajax>
       *
       * Note: setting a `Content-Type` header here will override the value
       * specified by the `contentType` property of this element.
       */
      headers: {
        type: Object,
        value: function() {
          return {};
        }
      },

      /**
       * Content type to use when sending data. If the `contentType` property
       * is set and a `Content-Type` header is specified in the `headers`
       * property, the `headers` property value will take precedence.
       *
       * Varies the handling of the `body` param.
       */
      contentType: {
        type: String,
        value: null
      },

      /**
       * Body content to send with the request, typically used with "POST"
       * requests.
       *
       * If body is a string it will be sent unmodified.
       *
       * If Content-Type is set to a value listed below, then
       * the body will be encoded accordingly.
       *
       *    * `content-type="application/json"`
       *      * body is encoded like `{"foo":"bar baz","x":1}`
       *    * `content-type="application/x-www-form-urlencoded"`
       *      * body is encoded like `foo=bar+baz&x=1`
       *
       * Otherwise the body will be passed to the browser unmodified, and it
       * will handle any encoding (e.g. for FormData, Blob, ArrayBuffer).
       *
       * @type (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined|Object)
       */
      body: {
        type: Object,
        value: null
      },

      /**
       * Toggle whether XHR is synchronous or asynchronous. Don't change this
       * to true unless You Know What You Are Doing™.
       */
      sync: {
        type: Boolean,
        value: false
      },

      /**
       * Specifies what data to store in the `response` property, and
       * to deliver as `event.detail.response` in `response` events.
       *
       * One of:
       *
       *    `text`: uses `XHR.responseText`.
       *
       *    `xml`: uses `XHR.responseXML`.
       *
       *    `json`: uses `XHR.responseText` parsed as JSON.
       *
       *    `arraybuffer`: uses `XHR.response`.
       *
       *    `blob`: uses `XHR.response`.
       *
       *    `document`: uses `XHR.response`.
       */
      handleAs: {
        type: String,
        value: 'json'
      },

      /**
       * Set the withCredentials flag on the request.
       */
      withCredentials: {
        type: Boolean,
        value: false
      },

      /**
       * Set the timeout flag on the request.
       */
      timeout: {
        type: Number,
        value: 0
      },

      /**
       * If true, automatically performs an Ajax request when either `url` or
       * `params` changes.
       */
      auto: {
        type: Boolean,
        value: false
      },

      /**
       * If true, error messages will automatically be logged to the console.
       */
      verbose: {
        type: Boolean,
        value: false
      },

      /**
       * The most recent request made by this iron-ajax element.
       */
      lastRequest: {
        type: Object,
        notify: true,
        readOnly: true
      },

      /**
       * True while lastRequest is in flight.
       */
      loading: {
        type: Boolean,
        notify: true,
        readOnly: true
      },

      /**
       * lastRequest's response.
       *
       * Note that lastResponse and lastError are set when lastRequest finishes,
       * so if loading is true, then lastResponse and lastError will correspond
       * to the result of the previous request.
       *
       * The type of the response is determined by the value of `handleAs` at
       * the time that the request was generated.
       *
       * @type {Object}
       */
      lastResponse: {
        type: Object,
        notify: true,
        readOnly: true
      },

      /**
       * lastRequest's error, if any.
       *
       * @type {Object}
       */
      lastError: {
        type: Object,
        notify: true,
        readOnly: true
      },

      /**
       * An Array of all in-flight requests originating from this iron-ajax
       * element.
       */
      activeRequests: {
        type: Array,
        notify: true,
        readOnly: true,
        value: function() {
          return [];
        }
      },

      /**
       * Length of time in milliseconds to debounce multiple automatically generated requests.
       */
      debounceDuration: {
        type: Number,
        value: 0,
        notify: true
      },

      /**
       * Prefix to be stripped from a JSON response before parsing it.
       *
       * In order to prevent an attack using CSRF with Array responses
       * (http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx/)
       * many backends will mitigate this by prefixing all JSON response bodies
       * with a string that would be nonsensical to a JavaScript parser.
       *
       */
      jsonPrefix: {
        type: String,
        value: ''
      },

      /**
       * By default, iron-ajax's events do not bubble. Setting this attribute will cause its
       * request and response events as well as its iron-ajax-request, -response,  and -error
       * events to bubble to the window object. The vanilla error event never bubbles when
       * using shadow dom even if this.bubbles is true because a scoped flag is not passed with
       * it (first link) and because the shadow dom spec did not used to allow certain events,
       * including events named error, to leak outside of shadow trees (second link).
       * https://www.w3.org/TR/shadow-dom/#scoped-flag
       * https://www.w3.org/TR/2015/WD-shadow-dom-20151215/#events-that-are-not-leaked-into-ancestor-trees
       */
      bubbles: {
        type: Boolean,
        value: false
      },

      _boundHandleResponse: {
        type: Function,
        value: function() {
          return this._handleResponse.bind(this);
        }
      }
    },

    observers: [
      '_requestOptionsChanged(url, method, params.*, headers, contentType, ' +
          'body, sync, handleAs, jsonPrefix, withCredentials, timeout, auto)'
    ],

    /**
     * The query string that should be appended to the `url`, serialized from
     * the current value of `params`.
     *
     * @return {string}
     */
    get queryString () {
      var queryParts = [];
      var param;
      var value;

      for (param in this.params) {
        value = this.params[param];
        param = window.encodeURIComponent(param);

        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            queryParts.push(param + '=' + window.encodeURIComponent(value[i]));
          }
        } else if (value !== null) {
          queryParts.push(param + '=' + window.encodeURIComponent(value));
        } else {
          queryParts.push(param);
        }
      }

      return queryParts.join('&');
    },

    /**
     * The `url` with query string (if `params` are specified), suitable for
     * providing to an `iron-request` instance.
     *
     * @return {string}
     */
    get requestUrl() {
      var queryString = this.queryString;
      var url = this.url || '';

      if (queryString) {
        var bindingChar = url.indexOf('?') >= 0 ? '&' : '?';
        return url + bindingChar + queryString;
      }

      return url;
    },

    /**
     * An object that maps header names to header values, first applying the
     * the value of `Content-Type` and then overlaying the headers specified
     * in the `headers` property.
     *
     * @return {Object}
     */
    get requestHeaders() {
      var headers = {};
      var contentType = this.contentType;
      if (contentType == null && (typeof this.body === 'string')) {
        contentType = 'application/x-www-form-urlencoded';
      }
      if (contentType) {
        headers['content-type'] = contentType;
      }
      var header;

      if (this.headers instanceof Object) {
        for (header in this.headers) {
          headers[header] = this.headers[header].toString();
        }
      }

      return headers;
    },

    /**
     * Request options suitable for generating an `iron-request` instance based
     * on the current state of the `iron-ajax` instance's properties.
     *
     * @return {{
     *   url: string,
     *   method: (string|undefined),
     *   async: (boolean|undefined),
     *   body: (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined|Object),
     *   headers: (Object|undefined),
     *   handleAs: (string|undefined),
     *   jsonPrefix: (string|undefined),
     *   withCredentials: (boolean|undefined)}}
     */
    toRequestOptions: function() {
      return {
        url: this.requestUrl || '',
        method: this.method,
        headers: this.requestHeaders,
        body: this.body,
        async: !this.sync,
        handleAs: this.handleAs,
        jsonPrefix: this.jsonPrefix,
        withCredentials: this.withCredentials,
        timeout: this.timeout
      };
    },

    /**
     * Performs an AJAX request to the specified URL.
     *
     * @return {!IronRequestElement}
     */
    generateRequest: function() {
      var request = /** @type {!IronRequestElement} */ (document.createElement('iron-request'));
      var requestOptions = this.toRequestOptions();

      this.push('activeRequests', request);

      request.completes.then(
        this._boundHandleResponse
      ).catch(
        this._handleError.bind(this, request)
      ).then(
        this._discardRequest.bind(this, request)
      );

      request.send(requestOptions);

      this._setLastRequest(request);
      this._setLoading(true);

      this.fire('request', {
        request: request,
        options: requestOptions
      }, {bubbles: this.bubbles});

      this.fire('iron-ajax-request', {
        request: request,
        options: requestOptions
      }, {bubbles: this.bubbles});

      return request;
    },

    _handleResponse: function(request) {
      if (request === this.lastRequest) {
        this._setLastResponse(request.response);
        this._setLastError(null);
        this._setLoading(false);
      }
      this.fire('response', request, {bubbles: this.bubbles});
      this.fire('iron-ajax-response', request, {bubbles: this.bubbles});
    },

    _handleError: function(request, error) {
      if (this.verbose) {
        Polymer.Base._error(error);
      }

      if (request === this.lastRequest) {
        this._setLastError({
          request: request,
          error: error,
          status: request.xhr.status,
          statusText: request.xhr.statusText,
          response: request.xhr.response
        });
        this._setLastResponse(null);
        this._setLoading(false);
      }

      // Tests fail if this goes after the normal this.fire('error', ...)
      this.fire('iron-ajax-error', {
        request: request,
        error: error
      }, {bubbles: this.bubbles});

      this.fire('error', {
        request: request,
        error: error
      }, {bubbles: this.bubbles});
    },

    _discardRequest: function(request) {
      var requestIndex = this.activeRequests.indexOf(request);

      if (requestIndex > -1) {
        this.splice('activeRequests', requestIndex, 1);
      }
    },

    _requestOptionsChanged: function() {
      this.debounce('generate-request', function() {
        if (this.url == null) {
          return;
        }

        if (this.auto) {
          this.generateRequest();
        }
      }, this.debounceDuration);
    },

  });
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var AppData = function () {
    function AppData() {
      _classCallCheck(this, AppData);
    }

    _createClass(AppData, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          speakersSource: {
            type: String,
            value: '/data/speakers.json'
          },
          sessionsSource: {
            type: String,
            value: '/data/sessions.json'
          },
          postsSource: {
            type: String,
            value: '/data/blog.json'
          },
          partnersSource: {
            type: String,
            value: '/data/partners.json'
          },
          scheduleSource: {
            type: String,
            value: '/data/schedule.json'
          },
          speakers: {
            type: Array,
            notify: true
          },
          sessions: {
            type: Object,
            notify: true
          },
          posts: {
            type: Array,
            notify: true
          },
          partners: {
            type: Array,
            notify: true
          },
          schedule: {
            type: Array,
            notify: true
          },
          videos: {
            type: Array,
            notify: true
          },
          _speakersRaw: Object,
          _scheduleRaw: Array,
          _tempVideos: {
            type: Array,
            value: []
          }
        };
        this.observers = ['_generateSchedule(_speakersRaw, sessions, _scheduleRaw)'];
      }
    }, {
      key: '_generateSchedule',
      value: function _generateSchedule() {
        for (var i = 0, scheduleLen = this._scheduleRaw.length; i < scheduleLen; i++) {
          var day = this._scheduleRaw[i];
          this._scheduleRaw[i].tags = [];
          for (var j = 0, timeslotsLen = day.timeslots.length; j < timeslotsLen; j++) {
            var timeslot = day.timeslots[j];
            for (var k = 0, sessionsLen = timeslot.sessions.length; k < sessionsLen; k++) {
              for (var l = 0, subSessionsLen = timeslot.sessions[k].length; l < subSessionsLen; l++) {
                var session = this._getSession(timeslot.sessions[k][l], day);
                if (session && !session.track) {
                  session.track = day.tracks[k];
                }
                session.startTime = timeslot.startTime;
                session.endTime = subSessionsLen > 1 ? this._getEndTime(day.date, timeslot.startTime, timeslot.endTime, subSessionsLen, l + 1) : timeslot.endTime;
                session.dateReadable = day.dateReadable;
                this._scheduleRaw[i].timeslots[j].sessions[k][l] = session;
              }
            }
          }
        }
        this.schedule = this._scheduleRaw;
        this.speakers = this._speakersRaw;
        this.videos = this._tempVideos;
      }
    }, {
      key: '_getSession',
      value: function _getSession(sessionId, day) {
        var session = this.sessions[sessionId];
        session.mainTag = session.tags ? session.tags[0] : 'General';

        if (day.tags.indexOf(session.mainTag) < 0) {
          day.tags.push(session.mainTag);
        }
        var speakers = [];
        if (session.speakers) {
          for (var j = 0, speakersLen = session.speakers.length; j < speakersLen; j++) {
            if (!session.speakers[j].id) {
              session.speakers[j] = this._speakersRaw[session.speakers[j]];
              var tempSession = JSON.parse(JSON.stringify(session));
              delete tempSession.speakers;
              if (!session.speakers[j].sessions) {
                session.speakers[j].sessions = [];
              }
              session.speakers[j].sessions.push(tempSession);
              speakers.push(session.speakers[j].name);
            }
          }
        }
        if (session.videoId) {
          this.push('_tempVideos', {
            youtubeId: session.videoId,
            title: session.title,
            speakers: speakers.join(', '),
            thumbnail: session.thumbnail
          });
        }
        return session;
      }
    }, {
      key: '_getEndTime',
      value: function _getEndTime(date, startTime, endTime, totalNumber, number) {
        var timezone = new Date().toString().match(/([A-Z]+[\+-][0-9]+.*)/)[1],
            timeStart = new Date(date + ' ' + startTime + ' ' + timezone).getTime(),
            timeEnd = new Date(date + ' ' + endTime + ' ' + timezone).getTime(),
            difference = Math.floor((timeEnd - timeStart) / totalNumber),
            result = new Date(timeStart + difference * number);
        return result.getHours() + ':' + result.getMinutes();
      }
    }, {
      key: '_reversePosts',
      value: function _reversePosts(response) {
        this.posts = response.detail.response.reverse();
      }
    }]);

    return AppData;
  }();

  Polymer(AppData);
})();
/**
   * `Polymer.PaperInkyFocusBehavior` implements a ripple when the element has keyboard focus.
   *
   * @polymerBehavior Polymer.PaperInkyFocusBehavior
   */
  Polymer.PaperInkyFocusBehaviorImpl = {
    observers: [
      '_focusedChanged(receivedFocusFromKeyboard)'
    ],

    _focusedChanged: function(receivedFocusFromKeyboard) {
      if (receivedFocusFromKeyboard) {
        this.ensureRipple();
      }
      if (this.hasRipple()) {
        this._ripple.holdDown = receivedFocusFromKeyboard;
      }
    },

    _createRipple: function() {
      var ripple = Polymer.PaperRippleBehavior._createRipple();
      ripple.id = 'ink';
      ripple.setAttribute('center', '');
      ripple.classList.add('circle');
      return ripple;
    }
  };

  /** @polymerBehavior Polymer.PaperInkyFocusBehavior */
  Polymer.PaperInkyFocusBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperRippleBehavior,
    Polymer.PaperInkyFocusBehaviorImpl
  ];
Polymer({
      is: 'paper-icon-button',

      hostAttributes: {
        role: 'button',
        tabindex: '0'
      },

      behaviors: [
        Polymer.PaperInkyFocusBehavior
      ],

      properties: {
        /**
         * The URL of an image for the icon. If the src property is specified,
         * the icon property should not be.
         */
        src: {
          type: String
        },

        /**
         * Specifies the icon name or index in the set of icons available in
         * the icon's icon set. If the icon property is specified,
         * the src property should not be.
         */
        icon: {
          type: String
        },

        /**
         * Specifies the alternate text for the button, for accessibility.
         */
        alt: {
          type: String,
          observer: "_altChanged"
        }
      },

      _altChanged: function(newValue, oldValue) {
        var label = this.getAttribute('aria-label');

        // Don't stomp over a user-set aria-label.
        if (!label || oldValue == label) {
          this.setAttribute('aria-label', newValue);
        }
      }
    });
/**
   * `Polymer.IronMenubarBehavior` implements accessible menubar behavior.
   *
   * @polymerBehavior Polymer.IronMenubarBehavior
   */
  Polymer.IronMenubarBehaviorImpl = {

    hostAttributes: {
      'role': 'menubar'
    },

    keyBindings: {
      'left': '_onLeftKey',
      'right': '_onRightKey'
    },

    _onUpKey: function(event) {
      this.focusedItem.click();
      event.detail.keyboardEvent.preventDefault();
    },

    _onDownKey: function(event) {
      this.focusedItem.click();
      event.detail.keyboardEvent.preventDefault();
    },

    get _isRTL() {
      return window.getComputedStyle(this)['direction'] === 'rtl';
    },

    _onLeftKey: function(event) {
      if (this._isRTL) {
        this._focusNext();
      } else {
        this._focusPrevious();
      }
      event.detail.keyboardEvent.preventDefault();
    },

    _onRightKey: function(event) {
      if (this._isRTL) {
        this._focusPrevious();
      } else {
        this._focusNext();
      }
      event.detail.keyboardEvent.preventDefault();
    },

    _onKeydown: function(event) {
      if (this.keyboardEventMatchesKeys(event, 'up down left right esc')) {
        return;
      }

      // all other keys focus the menu item starting with that character
      this._focusWithKeyboardEvent(event);
    }

  };

  /** @polymerBehavior Polymer.IronMenubarBehavior */
  Polymer.IronMenubarBehavior = [
    Polymer.IronMenuBehavior,
    Polymer.IronMenubarBehaviorImpl
  ];
Polymer({
      is: 'paper-tab',

      behaviors: [
        Polymer.IronControlState,
        Polymer.IronButtonState,
        Polymer.PaperRippleBehavior
      ],

      properties: {

        /**
         * If true, the tab will forward keyboard clicks (enter/space) to
         * the first anchor element found in its descendants
         */
        link: {
          type: Boolean,
          value: false,
          reflectToAttribute: true
        }

      },

      hostAttributes: {
        role: 'tab'
      },

      listeners: {
        down: '_updateNoink',
        tap: '_onTap'
      },

      attached: function() {
        this._updateNoink();
      },

      get _parentNoink () {
        var parent = Polymer.dom(this).parentNode;
        return !!parent && !!parent.noink;
      },

      _updateNoink: function() {
        this.noink = !!this.noink || !!this._parentNoink;
      },

      _onTap: function(event) {
        if (this.link) {
          var anchor = this.queryEffectiveChildren('a');

          if (!anchor) {
            return;
          }

          // Don't get stuck in a loop delegating
          // the listener from the child anchor
          if (event.target === anchor) {
            return;
          }

          anchor.click();
        }
      }

    });
Polymer({
      is: 'paper-tabs',

      behaviors: [
        Polymer.IronResizableBehavior,
        Polymer.IronMenubarBehavior
      ],

      properties: {
        /**
         * If true, ink ripple effect is disabled. When this property is changed,
         * all descendant `<paper-tab>` elements have their `noink` property
         * changed to the new value as well.
         */
        noink: {
          type: Boolean,
          value: false,
          observer: '_noinkChanged'
        },

        /**
         * If true, the bottom bar to indicate the selected tab will not be shown.
         */
        noBar: {
          type: Boolean,
          value: false
        },

        /**
         * If true, the slide effect for the bottom bar is disabled.
         */
        noSlide: {
          type: Boolean,
          value: false
        },

        /**
         * If true, tabs are scrollable and the tab width is based on the label width.
         */
        scrollable: {
          type: Boolean,
          value: false
        },

        /**
         * If true, tabs expand to fit their container. This currently only applies when
         * scrollable is true.
         */
        fitContainer: {
          type: Boolean,
          value: false
        },

        /**
         * If true, dragging on the tabs to scroll is disabled.
         */
        disableDrag: {
          type: Boolean,
          value: false
        },

        /**
         * If true, scroll buttons (left/right arrow) will be hidden for scrollable tabs.
         */
        hideScrollButtons: {
          type: Boolean,
          value: false
        },

        /**
         * If true, the tabs are aligned to bottom (the selection bar appears at the top).
         */
        alignBottom: {
          type: Boolean,
          value: false
        },

        selectable: {
          type: String,
          value: 'paper-tab'
        },

        /**
         * If true, tabs are automatically selected when focused using the
         * keyboard.
         */
        autoselect: {
          type: Boolean,
          value: false
        },

        /**
         * The delay (in milliseconds) between when the user stops interacting
         * with the tabs through the keyboard and when the focused item is
         * automatically selected (if `autoselect` is true).
         */
        autoselectDelay: {
          type: Number,
          value: 0
        },

        _step: {
          type: Number,
          value: 10
        },

        _holdDelay: {
          type: Number,
          value: 1
        },

        _leftHidden: {
          type: Boolean,
          value: false
        },

        _rightHidden: {
          type: Boolean,
          value: false
        },

        _previousTab: {
          type: Object
        }
      },

      hostAttributes: {
        role: 'tablist'
      },

      listeners: {
        'iron-resize': '_onTabSizingChanged',
        'iron-items-changed': '_onTabSizingChanged',
        'iron-select': '_onIronSelect',
        'iron-deselect': '_onIronDeselect'
      },

      keyBindings: {
        'left:keyup right:keyup': '_onArrowKeyup'
      },

      created: function() {
        this._holdJob = null;
        this._pendingActivationItem = undefined;
        this._pendingActivationTimeout = undefined;
        this._bindDelayedActivationHandler = this._delayedActivationHandler.bind(this);
        this.addEventListener('blur', this._onBlurCapture.bind(this), true);
      },

      ready: function() {
        this.setScrollDirection('y', this.$.tabsContainer);
      },

      detached: function() {
        this._cancelPendingActivation();
      },

      _noinkChanged: function(noink) {
        var childTabs = Polymer.dom(this).querySelectorAll('paper-tab');
        childTabs.forEach(noink ? this._setNoinkAttribute : this._removeNoinkAttribute);
      },

      _setNoinkAttribute: function(element) {
        element.setAttribute('noink', '');
      },

      _removeNoinkAttribute: function(element) {
        element.removeAttribute('noink');
      },

      _computeScrollButtonClass: function(hideThisButton, scrollable, hideScrollButtons) {
        if (!scrollable || hideScrollButtons) {
          return 'hidden';
        }

        if (hideThisButton) {
          return 'not-visible';
        }

        return '';
      },

      _computeTabsContentClass: function(scrollable, fitContainer) {
        return scrollable ? 'scrollable' + (fitContainer ? ' fit-container' : '') : ' fit-container';
      },

      _computeSelectionBarClass: function(noBar, alignBottom) {
        if (noBar) {
          return 'hidden';
        } else if (alignBottom) {
          return 'align-bottom';
        }

        return '';
      },

      // TODO(cdata): Add `track` response back in when gesture lands.

      _onTabSizingChanged: function() {
        this.debounce('_onTabSizingChanged', function() {
          this._scroll();
          this._tabChanged(this.selectedItem);
        }, 10);
      },

      _onIronSelect: function(event) {
        this._tabChanged(event.detail.item, this._previousTab);
        this._previousTab = event.detail.item;
        this.cancelDebouncer('tab-changed');
      },

      _onIronDeselect: function(event) {
        this.debounce('tab-changed', function() {
          this._tabChanged(null, this._previousTab);
          this._previousTab = null;
        // See polymer/polymer#1305
        }, 1);
      },

      _activateHandler: function() {
        // Cancel item activations scheduled by keyboard events when any other
        // action causes an item to be activated (e.g. clicks).
        this._cancelPendingActivation();

        Polymer.IronMenuBehaviorImpl._activateHandler.apply(this, arguments);
      },

      /**
       * Activates an item after a delay (in milliseconds).
       */
      _scheduleActivation: function(item, delay) {
        this._pendingActivationItem = item;
        this._pendingActivationTimeout = this.async(
            this._bindDelayedActivationHandler, delay);
      },

      /**
       * Activates the last item given to `_scheduleActivation`.
       */
      _delayedActivationHandler: function() {
        var item = this._pendingActivationItem;
        this._pendingActivationItem = undefined;
        this._pendingActivationTimeout = undefined;
        item.fire(this.activateEvent, null, {
          bubbles: true,
          cancelable: true
        });
      },

      /**
       * Cancels a previously scheduled item activation made with
       * `_scheduleActivation`.
       */
      _cancelPendingActivation: function() {
        if (this._pendingActivationTimeout !== undefined) {
          this.cancelAsync(this._pendingActivationTimeout);
          this._pendingActivationItem = undefined;
          this._pendingActivationTimeout = undefined;
        }
      },

      _onArrowKeyup: function(event) {
        if (this.autoselect) {
          this._scheduleActivation(this.focusedItem, this.autoselectDelay);
        }
      },

      _onBlurCapture: function(event) {
        // Cancel a scheduled item activation (if any) when that item is
        // blurred.
        if (event.target === this._pendingActivationItem) {
          this._cancelPendingActivation();
        }
      },

      get _tabContainerScrollSize () {
        return Math.max(
          0,
          this.$.tabsContainer.scrollWidth -
            this.$.tabsContainer.offsetWidth
        );
      },

      _scroll: function(e, detail) {
        if (!this.scrollable) {
          return;
        }

        var ddx = (detail && -detail.ddx) || 0;
        this._affectScroll(ddx);
      },

      _down: function(e) {
        // go one beat async to defeat IronMenuBehavior
        // autorefocus-on-no-selection timeout
        this.async(function() {
          if (this._defaultFocusAsync) {
            this.cancelAsync(this._defaultFocusAsync);
            this._defaultFocusAsync = null;
          }
        }, 1);
      },

      _affectScroll: function(dx) {
        this.$.tabsContainer.scrollLeft += dx;

        var scrollLeft = this.$.tabsContainer.scrollLeft;

        this._leftHidden = scrollLeft === 0;
        this._rightHidden = scrollLeft === this._tabContainerScrollSize;
      },

      _onLeftScrollButtonDown: function() {
        this._scrollToLeft();
        this._holdJob = setInterval(this._scrollToLeft.bind(this), this._holdDelay);
      },

      _onRightScrollButtonDown: function() {
        this._scrollToRight();
        this._holdJob = setInterval(this._scrollToRight.bind(this), this._holdDelay);
      },

      _onScrollButtonUp: function() {
        clearInterval(this._holdJob);
        this._holdJob = null;
      },

      _scrollToLeft: function() {
        this._affectScroll(-this._step);
      },

      _scrollToRight: function() {
        this._affectScroll(this._step);
      },

      _tabChanged: function(tab, old) {
        if (!tab) {
          // Remove the bar without animation.
          this.$.selectionBar.classList.remove('expand');
          this.$.selectionBar.classList.remove('contract');
          this._positionBar(0, 0);
          return;
        }

        var r = this.$.tabsContent.getBoundingClientRect();
        var w = r.width;
        var tabRect = tab.getBoundingClientRect();
        var tabOffsetLeft = tabRect.left - r.left;

        this._pos = {
          width: this._calcPercent(tabRect.width, w),
          left: this._calcPercent(tabOffsetLeft, w)
        };

        if (this.noSlide || old == null) {
          // Position the bar without animation.
          this.$.selectionBar.classList.remove('expand');
          this.$.selectionBar.classList.remove('contract');
          this._positionBar(this._pos.width, this._pos.left);
          return;
        }

        var oldRect = old.getBoundingClientRect();
        var oldIndex = this.items.indexOf(old);
        var index = this.items.indexOf(tab);
        var m = 5;

        // bar animation: expand
        this.$.selectionBar.classList.add('expand');

        var moveRight = oldIndex < index;
        var isRTL = this._isRTL;
        if (isRTL) {
          moveRight = !moveRight;
        }

        if (moveRight) {
          this._positionBar(this._calcPercent(tabRect.left + tabRect.width - oldRect.left, w) - m,
              this._left);
        } else {
          this._positionBar(this._calcPercent(oldRect.left + oldRect.width - tabRect.left, w) - m,
              this._calcPercent(tabOffsetLeft, w) + m);
        }

        if (this.scrollable) {
          this._scrollToSelectedIfNeeded(tabRect.width, tabOffsetLeft);
        }
      },

      _scrollToSelectedIfNeeded: function(tabWidth, tabOffsetLeft) {
        var l = tabOffsetLeft - this.$.tabsContainer.scrollLeft;
        if (l < 0) {
          this.$.tabsContainer.scrollLeft += l;
        } else {
          l += (tabWidth - this.$.tabsContainer.offsetWidth);
          if (l > 0) {
            this.$.tabsContainer.scrollLeft += l;
          }
        }
      },

      _calcPercent: function(w, w0) {
        return 100 * w / w0;
      },

      _positionBar: function(width, left) {
        width = width || 0;
        left = left || 0;

        this._width = width;
        this._left = left;
        this.transform(
            'translateX(' + left + '%) scaleX(' + (width / 100) + ')',
            this.$.selectionBar);
      },

      _onBarTransitionEnd: function(e) {
        var cl = this.$.selectionBar.classList;
        // bar animation: expand -> contract
        if (cl.contains('expand')) {
          cl.remove('expand');
          cl.add('contract');
          this._positionBar(this._pos.width, this._pos.left);
        // bar animation done
        } else if (cl.contains('contract')) {
          cl.remove('contract');
        }
      }
    });
/**
Use `Polymer.PaperDialogBehavior` and `paper-dialog-shared-styles.html` to implement a Material Design
dialog.

For example, if `<paper-dialog-impl>` implements this behavior:

    <paper-dialog-impl>
        <h2>Header</h2>
        <div>Dialog body</div>
        <div class="buttons">
            <paper-button dialog-dismiss>Cancel</paper-button>
            <paper-button dialog-confirm>Accept</paper-button>
        </div>
    </paper-dialog-impl>

`paper-dialog-shared-styles.html` provide styles for a header, content area, and an action area for buttons.
Use the `<h2>` tag for the header and the `buttons` class for the action area. You can use the
`paper-dialog-scrollable` element (in its own repository) if you need a scrolling content area.

Use the `dialog-dismiss` and `dialog-confirm` attributes on interactive controls to close the
dialog. If the user dismisses the dialog with `dialog-confirm`, the `closingReason` will update
to include `confirmed: true`.

### Accessibility

This element has `role="dialog"` by default. Depending on the context, it may be more appropriate
to override this attribute with `role="alertdialog"`.

If `modal` is set, the element will prevent the focus from exiting the element.
It will also ensure that focus remains in the dialog.

@hero hero.svg
@demo demo/index.html
@polymerBehavior Polymer.PaperDialogBehavior
*/

  Polymer.PaperDialogBehaviorImpl = {

    hostAttributes: {
      'role': 'dialog',
      'tabindex': '-1'
    },

    properties: {

      /**
       * If `modal` is true, this implies `no-cancel-on-outside-click`, `no-cancel-on-esc-key` and `with-backdrop`.
       */
      modal: {
        type: Boolean,
        value: false
      }

    },

    observers: [
      '_modalChanged(modal, _readied)'
    ],

    listeners: {
      'tap': '_onDialogClick'
    },

    ready: function () {
      // Only now these properties can be read.
      this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
      this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
      this.__prevWithBackdrop = this.withBackdrop;
    },

    _modalChanged: function(modal, readied) {
      // modal implies noCancelOnOutsideClick, noCancelOnEscKey and withBackdrop.
      // We need to wait for the element to be ready before we can read the
      // properties values.
      if (!readied) {
        return;
      }

      if (modal) {
        this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
        this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
        this.__prevWithBackdrop = this.withBackdrop;
        this.noCancelOnOutsideClick = true;
        this.noCancelOnEscKey = true;
        this.withBackdrop = true;
      } else {
        // If the value was changed to false, let it false.
        this.noCancelOnOutsideClick = this.noCancelOnOutsideClick &&
          this.__prevNoCancelOnOutsideClick;
        this.noCancelOnEscKey = this.noCancelOnEscKey &&
          this.__prevNoCancelOnEscKey;
        this.withBackdrop = this.withBackdrop && this.__prevWithBackdrop;
      }
    },

    _updateClosingReasonConfirmed: function(confirmed) {
      this.closingReason = this.closingReason || {};
      this.closingReason.confirmed = confirmed;
    },

    /**
     * Will dismiss the dialog if user clicked on an element with dialog-dismiss
     * or dialog-confirm attribute.
     */
    _onDialogClick: function(event) {
      // Search for the element with dialog-confirm or dialog-dismiss,
      // from the root target until this (excluded).
      var path = Polymer.dom(event).path;
      for (var i = 0; i < path.indexOf(this); i++) {
        var target = path[i];
        if (target.hasAttribute && (target.hasAttribute('dialog-dismiss') || target.hasAttribute('dialog-confirm'))) {
          this._updateClosingReasonConfirmed(target.hasAttribute('dialog-confirm'));
          this.close();
          event.stopPropagation();
          break;
        }
      }
    }

  };

  /** @polymerBehavior */
  Polymer.PaperDialogBehavior = [Polymer.IronOverlayBehavior, Polymer.PaperDialogBehaviorImpl];
Polymer({
    is: 'iron-localstorage',

    properties: {
      /**
       * localStorage item key
       */
      name: {
        type: String,
        value: ''
      },
      /**
       * The data associated with this storage.
       * If set to null item will be deleted.
       * @type {*}
       */
      value: {
        type: Object,
        notify: true
      },

      /**
       * If true: do not convert value to JSON on save/load
       */
      useRaw: {
        type: Boolean,
        value: false
      },

      /**
       * Value will not be saved automatically if true. You'll have to do it manually with `save()`
       */
      autoSaveDisabled: {
        type: Boolean,
        value: false
      },
      /**
       * Last error encountered while saving/loading items
       */
      errorMessage: {
        type: String,
        notify: true
      },

      /** True if value has been loaded */
      _loaded: {
        type: Boolean,
        value: false
      }
    },

    observers: [
      '_debounceReload(name,useRaw)',
      '_trySaveValue(autoSaveDisabled)',
      '_trySaveValue(value.*)'
    ],

    ready: function() {
      this._boundHandleStorage = this._handleStorage.bind(this);
    },

    attached: function() {
      window.addEventListener('storage', this._boundHandleStorage);
    },

    detached: function() {
      window.removeEventListener('storage', this._boundHandleStorage);
    },

    _handleStorage: function(ev) {
      if (ev.key == this.name) {
        this._load(true);
      }
    },

    _trySaveValue: function() {
      if (this._doNotSave) {
        return;
      }
      if (this._loaded && !this.autoSaveDisabled) {
        this.debounce('save', this.save);
      }
    },

    _debounceReload: function() {
      this.debounce('reload', this.reload);
    },

    /**
     * Loads the value again. Use if you modify
     * localStorage using DOM calls, and want to
     * keep this element in sync.
     */
    reload: function() {
      this._loaded = false;
      this._load();
    },

    /**
     * loads value from local storage
     * @param {boolean=} externalChange true if loading changes from a different window
     */
    _load: function(externalChange) {
      try {
        var v = window.localStorage.getItem(this.name);
      } catch (ex) {
        this.errorMessage = ex.message;

        this._error("Could not save to localStorage.  Try enabling cookies for this page.", ex);
      };

      if (v === null) {
        this._loaded = true;
        this._doNotSave = true;  // guard for save watchers
        this.value = null;
        this._doNotSave = false;
        this.fire('iron-localstorage-load-empty', { externalChange: externalChange});
      } else {
        if (!this.useRaw) {
          try { // parse value as JSON
            v = JSON.parse(v);
          } catch(x) {
            this.errorMessage = "Could not parse local storage value";
            Polymer.Base._error("could not parse local storage value", v);
            v = null;
          }
        }
        this._loaded = true;
        this._doNotSave = true;
        this.value = v;
        this._doNotSave = false;
        this.fire('iron-localstorage-load', { externalChange: externalChange});
      }
    },

    /**
     * Saves the value to localStorage. Call to save if autoSaveDisabled is set.
     * If `value` is null or undefined, deletes localStorage.
     */
    save: function() {
      var v = this.useRaw ? this.value : JSON.stringify(this.value);
      try {
        if (this.value === null || this.value === undefined) {
          window.localStorage.removeItem(this.name);
        } else {
          window.localStorage.setItem(this.name, /** @type {string} */ (v));
        }
      }
      catch(ex) {
        // Happens in Safari incognito mode,
        this.errorMessage = ex.message;
        Polymer.Base._error("Could not save to localStorage. Incognito mode may be blocking this action", ex);
      }
    }

    /**
     * Fired when value loads from localStorage.
     *
     * @event iron-localstorage-load
     * @param {{externalChange:boolean}} detail -
     *     externalChange: true if change occured in different window.
     */

    /**
     * Fired when loaded value does not exist.
     * Event handler can be used to initialize default value.
     *
     * @event iron-localstorage-load-empty
     * @param {{externalChange:boolean}} detail -
     *     externalChange: true if change occured in different window.
     */
  });
(function() {
  "use strict";
  /**
    `Polymer.IronJsonpLibraryBehavior` loads a jsonp library.
    Multiple components can request same library, only one copy will load.

    Some libraries require a specific global function be defined.
    If this is the case, specify the `callbackName` property.

    You should use an HTML Import to load library dependencies
    when possible instead of using this element.

    @hero hero.svg
    @demo demo/index.html
    @polymerBehavior
   */
  Polymer.IronJsonpLibraryBehavior = {

    properties: {
      /**
       * True if library has been successfully loaded
       */
      libraryLoaded: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true
      },
      /**
       * Not null if library has failed to load
       */
      libraryErrorMessage: {
        type: String,
        value: null,
        notify: true,
        readOnly: true
      }
      // Following properties are to be set by behavior users
      /**
       * Library url. Must contain string `%%callback%%`.
       *
       * `%%callback%%` is a placeholder for jsonp wrapper function name
       *
       * Ex: https://maps.googleapis.com/maps/api/js?callback=%%callback%%
       * @property libraryUrl
       */
      /**
       * Set if library requires specific callback name.
       * Name will be automatically generated if not set.
       * @property callbackName
       */
      /**
       * name of event to be emitted when library loads. Standard is `api-load`
       * @property notifyEvent
       */
      /**
       * event with name specified in `notifyEvent` attribute
       * will fire upon successful load2
       * @event `notifyEvent`
       */
    },

    observers: [
      '_libraryUrlChanged(libraryUrl)'
    ],

    _libraryUrlChanged: function(libraryUrl) {
      // can't load before ready because notifyEvent might not be set
      if (this._isReady && this.libraryUrl)
        this._loadLibrary();
    },

    _libraryLoadCallback: function(err, result) {
      if (err) {
        console.warn("Library load failed:", err.message);
        this._setLibraryErrorMessage(err.message);
      }
      else {
        this._setLibraryErrorMessage(null);
        this._setLibraryLoaded(true);
        if (this.notifyEvent)
          this.fire(this.notifyEvent, result);
      }
    },

    /** loads the library, and fires this.notifyEvent upon completion */
    _loadLibrary: function() {
      LoaderMap.require(
        this.libraryUrl,
        this._libraryLoadCallback.bind(this),
        this.callbackName
      );
    },

    ready: function() {
      this._isReady = true;
      if (this.libraryUrl)
        this._loadLibrary();
    }
  };

  /**
   * LoaderMap keeps track of all Loaders
   */
  var LoaderMap = {
    apiMap: {}, // { hash -> Loader }

    /**
     * @param {Function} notifyCallback loaded callback fn(result)
     * @param {string} jsonpCallbackName name of jsonpcallback. If API does not provide it, leave empty. Optional.
     */
    require: function(url, notifyCallback, jsonpCallbackName) {

      // make hashable string form url
      var name = this.nameFromUrl(url);

      // create a loader as needed
      if (!this.apiMap[name])
        this.apiMap[name] = new Loader(name, url, jsonpCallbackName);

      // ask for notification
      this.apiMap[name].requestNotify(notifyCallback);
    },

    nameFromUrl: function(url) {
      return url.replace(/[\:\/\%\?\&\.\=\-\,]/g, '_') + '_api';
    }
  };

  /** @constructor */
  var Loader = function(name, url, callbackName) {
    this.notifiers = [];  // array of notifyFn [ notifyFn* ]

    // callback is specified either as callback name
    // or computed dynamically if url has callbackMacro in it
    if (!callbackName) {
      if (url.indexOf(this.callbackMacro) >= 0) {
        callbackName = name + '_loaded';
        url = url.replace(this.callbackMacro, callbackName);
      } else {
        this.error = new Error('IronJsonpLibraryBehavior a %%callback%% parameter is required in libraryUrl');
        // TODO(sjmiles): we should probably fallback to listening to script.load
        return;
      }
    }
    this.callbackName = callbackName;
    window[this.callbackName] = this.success.bind(this);
    this.addScript(url);
  };

  Loader.prototype = {

    callbackMacro: '%%callback%%',
    loaded: false,

    addScript: function(src) {
      var script = document.createElement('script');
      script.src = src;
      script.onerror = this.handleError.bind(this);
      var s = document.querySelector('script') || document.body;
      s.parentNode.insertBefore(script, s);
      this.script = script;
    },

    removeScript: function() {
      if (this.script.parentNode) {
        this.script.parentNode.removeChild(this.script);
      }
      this.script = null;
    },

    handleError: function(ev) {
      this.error = new Error("Library failed to load");
      this.notifyAll();
      this.cleanup();
    },

    success: function() {
      this.loaded = true;
      this.result = Array.prototype.slice.call(arguments);
      this.notifyAll();
      this.cleanup();
    },

    cleanup: function() {
      delete window[this.callbackName];
    },

    notifyAll: function() {
      this.notifiers.forEach( function(notifyCallback) {
        notifyCallback(this.error, this.result);
      }.bind(this));
      this.notifiers = [];
    },

    requestNotify: function(notifyCallback) {
      if (this.loaded || this.error) {
        notifyCallback( this.error, this.result);
      } else {
        this.notifiers.push(notifyCallback);
      }
    }
  };
})();
Polymer({

    is: 'iron-jsonp-library',

    behaviors: [ Polymer.IronJsonpLibraryBehavior ],

    properties: {
      /**
       * Library url. Must contain string `%%callback%%`.
       *
       * `%%callback%%` is a placeholder for jsonp wrapper function name
       *
       * Ex: https://maps.googleapis.com/maps/api/js?callback=%%callback%%
       */
      libraryUrl: String,
      /**
       * Set if library requires specific callback name.
       * Name will be automatically generated if not set.
       */
      callbackName: String,
      /**
       * event with name specified in 'notifyEvent' attribute
       * will fire upon successful load
       */
      notifyEvent: String
      /**
       * event with name specified in 'notifyEvent' attribute
       * will fire upon successful load
       * @event `notifyEvent`
       */

    }
  });
Polymer({

    is: 'google-youtube-api',

    behaviors: [
      Polymer.IronJsonpLibraryBehavior
    ],

    properties: {

      /** @private */
      libraryUrl:  {
        type: String,
        value: 'https://www.youtube.com/iframe_api'
      },

      /**
       * Fired when the API library is loaded and available.
       * @event api-load
       */
      /**
       * Name of event fired when library loads.
       */
      notifyEvent:  {
        type: String,
        value: 'api-load'
      },

      callbackName:  {
        type: String,
        value: 'onYouTubeIframeAPIReady'
      }

    },

    get api() {
      return YT;
    }

  });
Polymer({
    is: 'google-youtube',
    /**
     * Fired when the YouTube player is fully initialized and ready for use.
     *
     * @event google-youtube-ready
     */

    /**
     * Fired when the state of the player changes. `e.detail.data` is set to one of
     * [the documented](https://developers.google.com/youtube/iframe_api_reference#onStateChange)
     * states.
     *
     * @event google-youtube-state-change
     * @param {Object} e Event parameters.
     */

    /**
     * Fired when playback fails due to an error. `e.detail.data` is set to one of
     * [the documented](https://developers.google.com/youtube/iframe_api_reference#onError)
     * error codes.
     *
     * @event google-youtube-error
     * @param {Object} e Event parameters.
     */

     properties: {
    /**
     * Sets the id of the video to play. Changing this attribute will trigger a call
     * to load a new video into the player (if `this.autoplay` is set to `1` and `playsupported` is true)
     * or cue a new video otherwise.
     *
     * The underlying YouTube embed will not be added to the page unless this
     * value is set.
     *
     * You can [search for videos programmatically](https://developers.google.com/youtube/v3/docs/search/list)
     * using the YouTube Data API, or just hardcode known video ids to display on your page.
     */
      videoId: {
        type: String,
        value: '',
        observer: '_videoIdChanged'
      },

      /**
       * Whether programmatic `<video>.play()` for initial playback is supported in the current browser.
       *
       * Most mobile browsers [do not support](https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html#//apple_ref/doc/uid/TP40009523-CH5-SW1) autoplaying or scripted playback of videos.
       * If you attempt to automatically initiate playback of a `<google-youtube>`, e.g. by calling the `play()` method before
       * playback has initially begun, the YouTube Player will enter an unrecoverable "stuck" state.
       * To protect against this, check the value of `playsupported` and don't call `play()` if it is set to `false`.
       * (You can hide/disable your custom play button, etc.)
       *
       * The `playsupported` value is determined at runtime, by dynamically creating a `<video>` element with an
       * inlined data source and calling `play()` on it. (Inspired by [Modernizr](https://github.com/Modernizr/Modernizr/blob/master/feature-detects/video/autoplay.js).)
       *
       * If you would rather not incur the minimal overhead involved in going through this process, you can explicitly set
       * `playsupported` to `true` or `false` when initializing `<google-youtube>`. This is only recommended if you know that
       * your web app will never (or only) be used on mobile browsers.
       */
      playsupported: {
        type: Boolean,
        value: null,
        notify: true
      },

      /**
       * "1" if video should start automatically
       */
      autoplay: {
        type: Number,
        value: 0
      },
      /**
       * Whether playback has started.
       *
       * This defaults to `false` and is set to `true` once the first 'playing' event is fired by
       * the underlying YouTube Player API.
       *
       * Once set to `true`, it will remain that way indefinitely.
       * Paused/buffering/ended events won't cause `playbackstarted` to reset to `false`.
       * Nor will loading a new video into the player.
       */
      playbackstarted: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * Sets the height of the player on the page.
       * Accepts anything valid for a CSS measurement, e.g. '200px' or '50%'.
       * If the unit of measurement is left off, 'px' is assumed.
       */
      height: {
        type: String,
        value: '270px'
      },

      /**
       * Sets the width of the player on the page.
       * Accepts anything valid for a CSS measurement, e.g. '200px' or '50%'.
       * If the unit of measurement is left off, 'px' is assumed.
       */
      width: {
        type: String,
        value:'480px'
      },

      /**
       * Exposes the current player state.
       * Using this attribute is an alternative to listening to `google-youtube-state-change` events,
       * and can simplify the logic in templates with conditional binding.
       *
       * The [possible values](https://developers.google.com/youtube/iframe_api_reference#onStateChange):
       *   - -1 (unstarted)
       *   - 0 (ended)
       *   - 1 (playing)
       *   - 2 (paused)
       *   - 3 (buffering)
       *   - 5 (video cued)
       */
      state: {
        type: Number,
        value: -1,
        notify: true
      },

      /**
       * Exposes the current playback time, in seconds.
       *
       * You can divide this value by the `duration` to determine the playback percentage.
       */
      currenttime: {
        type: Number,
        value: 0,
        notify: true
      },

      /**
       * Exposes the video duration, in seconds.
       *
       * You can divide the `currenttime` to determine the playback percentage.
       *
       * @attribute duration
       * @type number
       */
      duration: {
        type: Number,
        value: 1, // To avoid divide-by-zero errors if used before video is cued.
        notify: true
      },

      /**
       * Exposes the current playback time, formatted as a (HH:)MM:SS string.
       */
      currenttimeformatted: {
        type: String,
        value: '0:00',
        notify: true
      },

      /**
       * Exposes the video duration, formatted as a (HH:)MM:SS string.
       */
      durationformatted: {
        type: String,
        value: '0:00', // To avoid divide-by-zero errors if used before video is cued.
        notify: true
      },

      /**
       * The fraction of the bytes that have been loaded for the current video, in the range [0-1].
       */
      fractionloaded: {
        type: Number,
        value: 0,
        notify: true
      },

      /**
       * A shorthand to enable a set of player attributes that, used together, simulate a "chromeless" YouTube player.
       *
       * Equivalent to setting the following attributes:
       * - `controls="0"`
       * - `modestbranding="1"`
       * - `showinfo="0"`
       * - `iv_load_policy="3"`
       * - `rel="0"`
       *
       * The "chromeless" player has minimal YouTube branding in cued state, and the native controls
       * will be disabled during playback. Creating your own custom play/pause/etc. controls is recommended.
       */
      chromeless: {
        type: Boolean,
        value: false
      },
      /**
       * The URL of an image to use as a custom thumbnail.
       *
       * This is optional; if not provided, the standard YouTube embed (which uses the thumbnail associated
       * with the video on YouTube) will be used.
       *
       * If `thumbnail` is set, than an `<img>` containing the thumbnail will be used in lieu of the actual
       * YouTube embed. When the thumbnail is clicked, the `<img>` is swapped out for the actual YouTube embed,
       * which will have [`autoplay=1`](https://developers.google.com/youtube/player_parameters#autoplay) set by default (in additional to any other player parameters specified on this element).
       *
       * Please note that `autoplay=1` won't actually autoplay videos on mobile browsers, so two taps will be required
       * to play the video there. Also, on desktop browsers, setting `autoplay=1` will prevent the playback
       * from [incrementing the view count](https://support.google.com/youtube/answer/1714329) for the video.
       */
      thumbnail: {
        type: String,
        value: ''
      },

      /**
       * If `fluid` is set, then the player will set its width to 100% to fill
       * the parent container, while adding `padding-top` to preserve the
       * aspect ratio provided by `width` and `height`. If `width` and `height`
       * have not been set, the player will fall back to a 16:9 aspect ratio.
       * This is useful for responsive designs where you don't want to
       * introduce letterboxing on your video.
       */
      fluid: {
        type: Boolean,
        value: false
      }

    },

    _computeContainerStyle: function(width, height) {
      return 'width:' + width + '; height:' + height;
    },

    _useExistingPlaySupportedValue: function() {
      this.playsupported = this._playsupportedLocalStorage;
    },

    /**
     * Detects whether programmatic <video>.play() is supported in the current browser.
     *
     * This is triggered via on-ironlocalstorage-load-empty. The logic is:
     * - If playsupported is explicitly set to true or false on the element, use that.
     * - Otherwise, if there's a cached value in localStorage, use that.
     * - Otherwise, create a hidden <video> element and call play() on it:
     *   - If playback starts, playsupported is true.
     *   - If playback doesn't start (within 500ms), playsupported is false.
     *   - Whatever happens, cache the result in localStorage.
     */
    _determinePlaySupported: function() {
      // If playsupported isn't already being overridden by the page using this component,
      // then attempt to determine if it's supported.
      // This is deliberately checking with ==, to match either undefined or null.
      if (this.playsupported == null) {
        // Run a new playback test.
        var timeout;
        var videoElement = document.createElement('video');

        if ('play' in videoElement) {
          videoElement.id = 'playtest';
          // Some browsers will refuse to play videos with 'display: none' set,
          // so position the video well offscreen instead.
          // Modify the .style property directly instead of using CSS to work around polyfill
          // issues; see https://github.com/GoogleWebComponents/google-youtube/issues/49
          videoElement.style.position = 'absolute';
          videoElement.style.top = '-9999px';
          videoElement.style.left = '-9999px';

          var mp4Source = document.createElement('source');
          mp4Source.src = "data:video/mp4;base64,AAAAFGZ0eXBNU05WAAACAE1TTlYAAAOUbW9vdgAAAGxtdmhkAAAAAM9ghv7PYIb+AAACWAAACu8AAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAnh0cmFrAAAAXHRraGQAAAAHz2CG/s9ghv4AAAABAAAAAAAACu8AAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAFAAAAA4AAAAAAHgbWRpYQAAACBtZGhkAAAAAM9ghv7PYIb+AAALuAAANq8AAAAAAAAAIWhkbHIAAAAAbWhscnZpZGVBVlMgAAAAAAABAB4AAAABl21pbmYAAAAUdm1oZAAAAAAAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAVdzdGJsAAAAp3N0c2QAAAAAAAAAAQAAAJdhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAFAAOABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAEmNvbHJuY2xjAAEAAQABAAAAL2F2Y0MBTUAz/+EAGGdNQDOadCk/LgIgAAADACAAAAMA0eMGVAEABGjuPIAAAAAYc3R0cwAAAAAAAAABAAAADgAAA+gAAAAUc3RzcwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAADgAAAAEAAABMc3RzegAAAAAAAAAAAAAADgAAAE8AAAAOAAAADQAAAA0AAAANAAAADQAAAA0AAAANAAAADQAAAA0AAAANAAAADQAAAA4AAAAOAAAAFHN0Y28AAAAAAAAAAQAAA7AAAAA0dXVpZFVTTVQh0k/Ou4hpXPrJx0AAAAAcTVREVAABABIAAAAKVcQAAAAAAAEAAAAAAAAAqHV1aWRVU01UIdJPzruIaVz6ycdAAAAAkE1URFQABAAMAAAAC1XEAAACHAAeAAAABBXHAAEAQQBWAFMAIABNAGUAZABpAGEAAAAqAAAAASoOAAEAZABlAHQAZQBjAHQAXwBhAHUAdABvAHAAbABhAHkAAAAyAAAAA1XEAAEAMgAwADAANQBtAGUALwAwADcALwAwADYAMAA2ACAAMwA6ADUAOgAwAAABA21kYXQAAAAYZ01AM5p0KT8uAiAAAAMAIAAAAwDR4wZUAAAABGjuPIAAAAAnZYiAIAAR//eBLT+oL1eA2Nlb/edvwWZflzEVLlhlXtJvSAEGRA3ZAAAACkGaAQCyJ/8AFBAAAAAJQZoCATP/AOmBAAAACUGaAwGz/wDpgAAAAAlBmgQCM/8A6YEAAAAJQZoFArP/AOmBAAAACUGaBgMz/wDpgQAAAAlBmgcDs/8A6YEAAAAJQZoIBDP/AOmAAAAACUGaCQSz/wDpgAAAAAlBmgoFM/8A6YEAAAAJQZoLBbP/AOmAAAAACkGaDAYyJ/8AFBAAAAAKQZoNBrIv/4cMeQ==";
          videoElement.appendChild(mp4Source);

          var webmSource = document.createElement('source');
          webmSource.src = "data:video/webm;base64,GkXfo49CgoR3ZWJtQoeBAUKFgQEYU4BnAQAAAAAAF60RTZt0vE27jFOrhBVJqWZTrIIQA027jFOrhBZUrmtTrIIQbE27jFOrhBFNm3RTrIIXmU27jFOrhBxTu2tTrIIWs+xPvwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFUmpZuQq17GDD0JATYCjbGliZWJtbCB2MC43LjcgKyBsaWJtYXRyb3NrYSB2MC44LjFXQY9BVlNNYXRyb3NrYUZpbGVEiYRFnEAARGGIBc2Lz1QNtgBzpJCy3XZ0KNuKNZS4+fDpFxzUFlSua9iu1teBAXPFhL4G+bmDgQG5gQGIgQFVqoEAnIEAbeeBASMxT4Q/gAAAVe6BAIaFVl9WUDiqgQEj44OEE95DVSK1nIN1bmTgkbCBULqBPJqBAFSwgVBUuoE87EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB9DtnVB4eeBAKC4obaBAAAAkAMAnQEqUAA8AABHCIWFiIWEiAICAAamYnoOC6cfJa8f5Zvda4D+/7YOf//nNefQYACgnKGWgQFNANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQKbANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQPoANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQU1ANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQaDANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQfQANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQkdANEBAAEQEBRgAGFgv9AAIiGAAPuC/rOgnKGWgQprANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQu4ANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQ0FANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgQ5TANEBAAEQEAAYABhYL/QACIhgAPuC/rKgnKGWgQ+gANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgRDtANEBAAEQEAAYABhYL/QACIhgAPuC/rOgnKGWgRI7ANEBAAEQEAAYABhYL/QACIhgAPuC/rIcU7trQOC7jLOBALeH94EB8YIUzLuNs4IBTbeH94EB8YIUzLuNs4ICm7eH94EB8YIUzLuNs4ID6LeH94EB8YIUzLuNs4IFNbeH94EB8YIUzLuNs4IGg7eH94EB8YIUzLuNs4IH0LeH94EB8YIUzLuNs4IJHbeH94EB8YIUzLuNs4IKa7eH94EB8YIUzLuNs4ILuLeH94EB8YIUzLuNs4INBbeH94EB8YIUzLuNs4IOU7eH94EB8YIUzLuNs4IPoLeH94EB8YIUzLuNs4IQ7beH94EB8YIUzLuNs4ISO7eH94EB8YIUzBFNm3SPTbuMU6uEH0O2dVOsghTM";
          videoElement.appendChild(webmSource);

          document.body.appendChild(videoElement);

          this.async(function() {
            // Ideally, we'll get a 'playing' event if we're on a browser that supports
            // programmatic play().
            videoElement.onplaying = function(e) {
              clearTimeout(timeout);

              this.playsupported = (e && e.type === 'playing') || videoElement.currentTime !== 0;
              this._playsupportedLocalStorage = this.playsupported;

              videoElement.onplaying = null;

              document.body.removeChild(videoElement);
            }.bind(this);

            // If we haven't received a 'playing' event within 500ms, then we're most likely on a browser that doesn't
            // support programmatic plays. Do a final check after 500ms and set this.playsupported at that point.
            timeout = setTimeout(videoElement.onplaying, 500);

            // Try to initiate playback...
            videoElement.play();
          });
        } else {
          // If there's no play() method then we know that it's not supported.
          this.playsupported = false;
          this._playsupportedLocalStorage = false;
        }
      }
    },

    /**
     * Sets fluid width/height.
     *
     * If the fluid attribute is set, the aspect ratio of the video will
     * be inferred (if set in pixels), or assumed to be 16:9. The element
     * will give itself enough top padding to force the player to use the
     * correct aspect ratio, even as the screen size changes.
     *
     */
    ready: function() {
      if (this.hasAttribute('fluid')) {
        var ratio = parseInt(this.height, 10) / parseInt(this.width, 10);
        if (isNaN(ratio)) {
          ratio = 9/16;
        }
        ratio *= 100;
        this.width = '100%';
        this.height = 'auto';
        this.$.container.style['padding-top'] = ratio + '%';
      }
    },

    /**
     * Clean up the underlying Player `<iframe>` when we're removed from the DOM.
     */
    detached: function() {
      if (this._player) {
        this._player.destroy();
      }
    },

    /**
     * Plays the current video.
     *
     * Note that on certain mobile browsers, playback
     * [can't be initiated programmatically](https://developers.google.com/youtube/iframe_api_reference#Mobile_considerations).
     *
     * If `this.playsupported` is not `true`, calling `play()` will have no effect.
     *
     * @method play
     */
    play: function() {
      if (this._player && this._player.playVideo && this.playsupported) {
        this._player.playVideo();
      }
    },

    /**
     * Modifies the volume of the current video.
     *
     * Developers should take care not to break expected user experience by programmatically
     * modifying the volume on mobile browsers.
     * Note that the YouTube player, in addition, does not display volume controls in a
     * mobile environment.
     *
     * @method setVolume
     * @param {number} volume The new volume, an integer between 0 (muted) and 100 (loudest).
     */
    setVolume: function(volume) {
      if (this._player && this._player.setVolume) {
        this._player.setVolume(volume);
      }
    },

    /**
     * Mutes the current video.
     *
     * Developers should take care not to break expected user experience by programmatically
     * modifying the volume on mobile browsers.
     * Note that the YouTube player, in addition, does not display volume controls in a
     * mobile environment.
     *
     * @method mute
     */
    mute: function() {
      if (this._player && this._player.mute) {
        this._player.mute();
      }
    },

    /**
     * Unmutes the current video.
     *
     * Developers should take care not to break expected user experience by programmatically
     * modifying the volume on mobile browsers.
     * Note that the YouTube player, in addition, does not display volume controls in a
     * mobile environment.
     *
     * @method unMute
     */
    unMute: function() {
      if (this._player && this._player.unMute) {
        this._player.unMute();
      }
    },

    /**
     * Pauses the current video.
     *
     * @method pause
     */
    pause: function() {
      if (this._player && this._player.pauseVideo) {
        this._player.pauseVideo();
      }
    },

    /**
     * Skips ahead (or back) to the specified number of seconds.
     *
     * @method seekTo
     * @param {number} seconds Number of seconds to seek to.
     */
    seekTo: function(seconds) {
      if (this._player && this._player.seekTo) {
        this._player.seekTo(seconds, true);

        // Explicitly call _updatePlaybackStats() to ensure that the new playback info is
        // reflected in the bound attributes.
        // The 100ms delay is somewhat arbitrary, but the YouTube player does need time to
        // update its internal state following the call to player.seekTo().
        this.async(function() {
          this._updatePlaybackStats();
        }, null, 100);
      }
    },

    _videoIdChanged: function() {
      this.currenttime = 0;
      this.currenttimeformatted = this._toHHMMSS(0);
      this.fractionloaded = 0;
      this.duration = 1;
      this.durationformatted = this._toHHMMSS(0);

      if (!this._player || !this._player.cueVideoById) {
        this._pendingVideoId = this.videoId;
      } else {
        // Figure out whether we should cue or load (which will autoplay) the next video.
        if (this.playsupported && this.attributes['autoplay'] && this.attributes['autoplay'].value == '1') {
          this._player.loadVideoById(this.videoId);
        } else {
          this._player.cueVideoById(this.videoId);
        }
      }
    },

    _player: null,
    __updatePlaybackStatsInterval: null,
    _pendingVideoId: '',

    _apiLoad: function() {
      // Establish some defaults. Attributes set on the google-youtube element
      // can override defaults, or specify additional player parameters. See
      // https://developers.google.com/youtube/player_parameters
      var playerVars = {
        playsinline: 1,
        controls: 2,
        autohide: 1,
        // This will (intentionally) be overwritten if this.attributes['autoplay'] is set.
        autoplay: this.autoplay
      };

      if (this.chromeless) {
        playerVars.controls = 0;
        playerVars.modestbranding = 1;
        playerVars.showinfo = 0;
        // Disable annotations.
        playerVars.iv_load_policy = 3;
        // Disable related videos on the end screen.
        playerVars.rel = 0;
      }

      for (var i = 0; i < this.attributes.length; i++) {
        var attribute = this.attributes[i];
        playerVars[attribute.nodeName] = attribute.value;
      }

      this._player = new YT.Player(this.$.player, {
        videoId: this.videoId,
        width: '100%',
        height: '100%',
        playerVars: playerVars,
        events: {
          onReady: function(e) {
            if (this._pendingVideoId && this._pendingVideoId != this.videoId) {
              this._player.cueVideoById(this._pendingVideoId);
              this._pendingVideoId = '';
            }

            this.fire('google-youtube-ready', e);
          }.bind(this),
          onStateChange: function(e) {
            this.state = e.data;

            // The YouTube Player API only exposes playback data about a video once
            // playback has begun.
            if (this.state == 1) {
              this.playbackstarted = true;

              // After playback has begun, play() can always be used to resume playback if the video is paused.
              this.playsupported = true;

              this.duration = this._player.getDuration();
              this.durationformatted = this._toHHMMSS(this.duration);

              if (!this.__updatePlaybackStatsInterval) {
                this.__updatePlaybackStatsInterval = setInterval(this._updatePlaybackStats.bind(this), 1000);
              }
            } else {
              // We only need to update the stats if the video is playing.
              if (this.__updatePlaybackStatsInterval) {
                clearInterval(this.__updatePlaybackStatsInterval);
                this.__updatePlaybackStatsInterval = null;
              }
            }

            this.fire('google-youtube-state-change', e);
          }.bind(this),
          onError: function(e) {
            // Set the player state to 0 ('ended'), since playback will have stopped.
            this.state = 0;

            this.fire('google-youtube-error', e);
          }.bind(this)
        }
      });
    },

    _updatePlaybackStats: function() {
      this.currenttime = Math.round(this._player.getCurrentTime());
      this.currenttimeformatted = this._toHHMMSS(this.currenttime);
      this.fractionloaded = this._player.getVideoLoadedFraction();
    },

    _toHHMMSS: function(totalSeconds) {
      var hours = Math.floor(totalSeconds / 3600);
      totalSeconds -= hours * 3600;
      var minutes = Math.floor(totalSeconds / 60);
      var seconds = Math.round(totalSeconds - (minutes * 60));

      var hourPortion = '';
      if (hours > 0) {
        hourPortion += hours + ':';

        if (minutes < 10) {
          minutes = '0' + minutes;
        }
      }

      if (seconds < 10) {
        seconds = '0' + seconds;
      }

      return hourPortion + minutes + ':' + seconds;
    },

    _handleThumbnailTap: function() {
      this.autoplay = 1;
      this.thumbnail = '';
    }
  });
'use strict';

(function () {
  'use strict';

  Polymer({

    is: 'video-dialog',

    behaviors: [Polymer.PaperDialogBehavior, Polymer.NeonAnimationRunnerBehavior],

    properties: {
      title: String,
      youtubeId: String,
      disableControls: {
        type: Boolean,
        value: false
      }
    },

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _renderOpened: function _renderOpened() {
      if (this.withBackdrop) {
        this.backdropElement.open();
      }
      this.playAnimation('entry');
      this.$.video.play();
    },

    _renderClosed: function _renderClosed() {
      this.$.video.seekTo(0);
      this.$.video.pause();
      this.backdropElement.close();
      this.playAnimation('exit');
    },

    _onNeonAnimationFinish: function _onNeonAnimationFinish() {
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    }
  });
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var HeroToolbar = function () {
    function HeroToolbar() {
      _classCallCheck(this, HeroToolbar);
    }

    _createClass(HeroToolbar, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          route: {
            type: String,
            notify: true
          },
          backgroundColor: String,
          backgroundImage: String,
          fontColor: String,
          tabBarColor: String,
          video: {
            type: Object,
            value: {}
          }
        };
        this.observers = ['_stylesChanged(backgroundColor, fontColor, tabBarColor)'];
      }
    }, {
      key: 'togglePanel',
      value: function togglePanel() {
        app.toggleDrawer();
      }
    }, {
      key: 'openVideo',
      value: function openVideo() {
        this.fire('iron-signal', {
          name: 'track-event',
          data: {
            category: 'button',
            action: 'click',
            label: 'play ' + this.video.title,
            value: 1
          }
        });
        this.$.videoDialog.open();
      }
    }, {
      key: '_stylesChanged',
      value: function _stylesChanged(backgroundColor, fontColor, tabBarColor) {
        this.customStyle['--hero-background'] = backgroundColor;
        this.customStyle['--hero-color'] = fontColor;
        this.customStyle['--paper-tabs-selection-bar-color'] = tabBarColor;
        document.getElementsByName('theme-color')[0].content = backgroundColor;
        this.updateStyles();
      }
    }]);

    return HeroToolbar;
  }();

  Polymer(HeroToolbar);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var DrawerBlock = function () {
    function DrawerBlock() {
      _classCallCheck(this, DrawerBlock);
    }

    _createClass(DrawerBlock, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          route: {
            type: String,
            notify: true
          }
        };
      }
    }]);

    return DrawerBlock;
  }();

  Polymer(DrawerBlock);
})();
Polymer({
    is: 'paper-material',

    properties: {
      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        value: 1
      },

      /**
       * Set this to true to animate the shadow when setting a new
       * `elevation` value.
       *
       * @attribute animated
       * @type boolean
       * @default false
       */
      animated: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      }
    }
  });
Polymer({

    is: 'fade-in-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      this._effect = new KeyframeEffect(node, [
        {'opacity': '0'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      return this._effect;
    }

  });
Polymer({

    is: 'fade-out-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '0'}
      ], this.timingFromConfig(config));
      return this._effect;
    }

  });
Polymer({
      is: 'paper-tooltip',

      hostAttributes: {
        role: 'tooltip',
        tabindex: -1
      },

      behaviors: [
        Polymer.NeonAnimationRunnerBehavior
      ],

      properties: {
        /**
         * The id of the element that the tooltip is anchored to. This element
         * must be a sibling of the tooltip.
         */
        for: {
          type: String,
          observer: '_forChanged'
        },

        /**
         * Set this to true if you want to manually control when the tooltip
         * is shown or hidden.
         */
        manualMode: {
          type: Boolean,
          value: false
        },

        /**
         * Positions the tooltip to the top, right, bottom, left of its content.
         */
        position: {
          type: String,
          value: 'bottom'
        },

        /**
         * If true, no parts of the tooltip will ever be shown offscreen.
         */
        fitToVisibleBounds: {
          type: Boolean,
          value: false
        },

        /**
         * The spacing between the top of the tooltip and the element it is
         * anchored to.
         */
        offset: {
          type: Number,
          value: 14
        },

        /**
         * This property is deprecated, but left over so that it doesn't
         * break exiting code. Please use `offset` instead. If both `offset` and
         * `marginTop` are provided, `marginTop` will be ignored.
         * @deprecated since version 1.0.3
         */
        marginTop: {
          type: Number,
          value: 14
        },

        /**
         * The delay that will be applied before the `entry` animation is
         * played when showing the tooltip.
         */
        animationDelay: {
          type: Number,
          value: 500
        },

        /**
         * The entry and exit animations that will be played when showing and
         * hiding the tooltip. If you want to override this, you must ensure
         * that your animationConfig has the exact format below.
         */
        animationConfig: {
          type: Object,
          value: function() {
            return {
              'entry': [{
                name: 'fade-in-animation',
                node: this,
                timing: {delay: 0}
              }],
              'exit': [{
                name: 'fade-out-animation',
                node: this
              }]
            }
          }
        },

        _showing: {
          type: Boolean,
          value: false
        }
      },

      listeners: {
        'neon-animation-finish': '_onAnimationFinish',
        'mouseenter': 'hide'
      },

      /**
       * Returns the target element that this tooltip is anchored to. It is
       * either the element given by the `for` attribute, or the immediate parent
       * of the tooltip.
       */
      get target () {
        var parentNode = Polymer.dom(this).parentNode;
        // If the parentNode is a document fragment, then we need to use the host.
        var ownerRoot = Polymer.dom(this).getOwnerRoot();

        var target;
        if (this.for) {
          target = Polymer.dom(ownerRoot).querySelector('#' + this.for);
        } else {
          target = parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE ?
              ownerRoot.host : parentNode;
        }

        return target;
      },

      attached: function() {
        this._target = this.target;

        if (this.manualMode)
          return;

        this.listen(this._target, 'mouseenter', 'show');
        this.listen(this._target, 'focus', 'show');
        this.listen(this._target, 'mouseleave', 'hide');
        this.listen(this._target, 'blur', 'hide');
        this.listen(this._target, 'tap', 'hide');
      },

      detached: function() {
        if (this._target && !this.manualMode) {
          this.unlisten(this._target, 'mouseenter', 'show');
          this.unlisten(this._target, 'focus', 'show');
          this.unlisten(this._target, 'mouseleave', 'hide');
          this.unlisten(this._target, 'blur', 'hide');
          this.unlisten(this._target, 'tap', 'hide');
        }
      },

      show: function() {
        // If the tooltip is already showing, there's nothing to do.
        if (this._showing)
          return;

        if (Polymer.dom(this).textContent.trim() === '')
          return;


        this.cancelAnimation();
        this._showing = true;
        this.toggleClass('hidden', false, this.$.tooltip);
        this.updatePosition();

        this.animationConfig.entry[0].timing.delay = this.animationDelay;
        this._animationPlaying = true;
        this.playAnimation('entry');
      },

      hide: function() {
        // If the tooltip is already hidden, there's nothing to do.
        if (!this._showing) {
          return;
        }

        // If the entry animation is still playing, don't try to play the exit
        // animation since this will reset the opacity to 1. Just end the animation.
        if (this._animationPlaying) {
          this.cancelAnimation();
          this._showing = false;
          this._onAnimationFinish();
          return;
        }

        this._showing = false;
        this._animationPlaying = true;
        this.playAnimation('exit');
      },

      _forChanged: function() {
        this._target = this.target;
      },

      updatePosition: function() {
        if (!this._target || !this.offsetParent)
          return;

        var offset = this.offset;
        // If a marginTop has been provided by the user (pre 1.0.3), use it.
        if (this.marginTop != 14 && this.offset == 14)
          offset = this.marginTop;

        var parentRect = this.offsetParent.getBoundingClientRect();
        var targetRect = this._target.getBoundingClientRect();
        var thisRect = this.getBoundingClientRect();

        var horizontalCenterOffset = (targetRect.width - thisRect.width) / 2;
        var verticalCenterOffset = (targetRect.height - thisRect.height) / 2;

        var targetLeft = targetRect.left - parentRect.left;
        var targetTop = targetRect.top - parentRect.top;

        var tooltipLeft, tooltipTop;

        switch (this.position) {
          case 'top':
            tooltipLeft = targetLeft + horizontalCenterOffset;
            tooltipTop = targetTop - thisRect.height - offset;
            break;
          case 'bottom':
            tooltipLeft = targetLeft + horizontalCenterOffset;
            tooltipTop = targetTop + targetRect.height + offset;
            break;
          case 'left':
            tooltipLeft = targetLeft - thisRect.width - offset;
            tooltipTop = targetTop + verticalCenterOffset;
            break;
          case 'right':
            tooltipLeft = targetLeft + targetRect.width + offset;
            tooltipTop = targetTop + verticalCenterOffset;
            break;
        }

        // TODO(noms): This should use IronFitBehavior if possible.
        if (this.fitToVisibleBounds) {
          // Clip the left/right side.
          if (tooltipLeft + thisRect.width > window.innerWidth) {
            this.style.right = '0px';
            this.style.left = 'auto';
          } else {
            this.style.left = Math.max(0, tooltipLeft) + 'px';
            this.style.right = 'auto';
          }

          // Clip the top/bottom side.
          if (tooltipTop + thisRect.height > window.innerHeight) {
            this.style.bottom = '0px';
            this.style.top = 'auto';
          } else {
            this.style.top = Math.max(0, tooltipTop) + 'px';
            this.style.bottom = 'auto';
          }
        } else {
          this.style.left = tooltipLeft + 'px';
          this.style.top = tooltipTop + 'px';
        }

      },

      _onAnimationFinish: function() {
        this._animationPlaying = false;
        if (!this._showing) {
          this.toggleClass('hidden', true, this.$.tooltip);
        }
      },
    });
/**
   * Use `Polymer.NeonSharedElementAnimatableBehavior` to implement elements containing shared element
   * animations.
   * @polymerBehavior Polymer.NeonSharedElementAnimatableBehavior
   */
  Polymer.NeonSharedElementAnimatableBehaviorImpl = {

    properties: {

      /**
       * A map of shared element id to node.
       */
      sharedElements: {
        type: Object,
        value: {}
      }

    }

  };

  /** @polymerBehavior Polymer.NeonSharedElementAnimatableBehavior */
  Polymer.NeonSharedElementAnimatableBehavior = [
    Polymer.NeonAnimatableBehavior,
    Polymer.NeonSharedElementAnimatableBehaviorImpl
  ];
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /\x3c!--[\s\S]*?--\x3e/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^\x3c!--[\s\S]*?--\x3e|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
	// explicitly match decimal, hex, and named HTML entities 
  return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
'use strict';

  Polymer({

    is: 'marked-element',

    properties: {

      /**
       * The markdown source that should be rendered by this element.
       */
      markdown: {
        observer: 'render',
        type: String,
        value: null
      },
      /**
       * Conform to obscure parts of markdown.pl as much as possible. Don't fix any of the original markdown bugs or poor behavior.
       */
      pedantic: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Sanitize the output. Ignore any HTML that has been input.
       */
      sanitize: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Use "smart" typographic punctuation for things like quotes and dashes.
       */
      smartypants: {
        observer: 'render',
        type: Boolean,
        value: false
      }
    },

    ready: function() {
      if (!this.markdown) {
        // Use the Markdown from the first `<script>` descendant whose MIME type starts with
        // "text/markdown". Script elements beyond the first are ignored.
        var markdownElement = Polymer.dom(this).querySelector('[type^="text/markdown"]');
        if (markdownElement != null) {
          this.markdown = this._unindent(markdownElement.textContent);
        }
      }
    },

    /**
     * Renders `markdown` to HTML when the element is attached.
     *
     * This serves a dual purpose:
     *
     *  * Prevents unnecessary work (no need to render when not visible).
     *
     *  * `attached` fires top-down, so we can give ancestors a chance to
     *    register listeners for the `syntax-highlight` event _before_ we render
     *    any markdown.
     *
     */
    attached: function() {
      this._attached = true;
      this._outputElement = this.outputElement;
      this.render();
    },

    detached: function() {
      this._attached = false;
    },

    /**
     * Unindents the markdown source that will be rendered.
     */
    unindent: function(text) {
      return this._unindent(text);
    },

    get outputElement () {
      var child = Polymer.dom(this).queryDistributedElements('.markdown-html')[0];

      if (child)
        return child;

      this.toggleClass('hidden', false, this.$.content);
      return this.$.content;
    },

    /**
     * The `marked-render-complete` event is fired once Markdown to HTML
     * conversion has finished, and the DOM has been populated via the resulting
     * HTML.
     *
     * @event marked-render-complete
     */

    /**
     * Renders `markdown` into this element's DOM.
     *
     * This is automatically called whenever the `markdown` property is changed.
     *
     * The only case where you should be calling this is if you are providing
     * markdown via `<script type="text/markdown">` after this element has been
     * constructed (or updating that markdown).
     */
    render: function() {
      if (!this._attached) return;
      if (!this.markdown) {
        Polymer.dom(this._outputElement).innerHTML = '';
        return;
      }
      var opts = {
        highlight: this._highlight.bind(this),
        sanitize: this.sanitize,
        pedantic: this.pedantic,
        smartypants: this.smartypants
      };
      Polymer.dom(this._outputElement).innerHTML = marked(this.markdown, opts);
      this.fire('marked-render-complete');
    },

    _highlight: function(code, lang) {
      var event = this.fire('syntax-highlight', {code: code, lang: lang});
      return event.detail.code || code;
    },

    _unindent: function(text) {
      if (!text) return text;
      var lines  = text.replace(/\t/g, '  ').split('\n');
      var indent = lines.reduce(function(prev, line) {
        if (/^\s*$/.test(line)) return prev;  // Completely ignore blank lines.

        var lineIndent = line.match(/^(\s*)/)[0].length;
        if (prev === null) return lineIndent;
        return lineIndent < prev ? lineIndent : prev;
      }, null);

      return lines.map(function(l) { return l.substr(indent); }).join('\n');
    }

  });
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
    'use strict';

    var TruncateMarkedText = function () {
        function TruncateMarkedText() {
            _classCallCheck(this, TruncateMarkedText);
        }

        _createClass(TruncateMarkedText, [{
            key: 'beforeRegister',
            value: function beforeRegister() {
                this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
                this.properties = {
                    characters: Number,
                    words: Number,
                    breakLastWord: {
                        type: Boolean,
                        value: false
                    },
                    text: {
                        type: String,
                        observer: 'truncate'
                    },
                    _outputText: {
                        type: String,
                        notify: true
                    }
                };
            }
        }, {
            key: 'truncate',
            value: function truncate() {
                if (this.words && !this.characters) {
                    this._outputText = this._truncateByWords(this.text, this.words);
                } else {
                    this._outputText = this._truncateByCharacters(this.text, this.characters, this.breakLastWord);
                }
            }
        }, {
            key: '_truncateByWords',
            value: function _truncateByWords(input, words) {
                if (isNaN(words)) {
                    return input;
                }
                if (words <= 0) {
                    return '';
                }
                if (input) {
                    var inputWords = input.split(/\s+/);
                    if (inputWords.length > words) {
                        input = inputWords.slice(0, words).join(' ') + '...';
                    }
                }
                return input;
            }
        }, {
            key: '_truncateByCharacters',
            value: function _truncateByCharacters(input, chars, breakOnWord) {
                if (isNaN(chars)) {
                    return input;
                }
                if (chars <= 0) {
                    return '';
                }
                if (input && input.length > chars) {
                    input = input.trim().substring(0, chars);
                    if (!breakOnWord) {
                        var lastSpace = input.lastIndexOf(' ');
                        if (lastSpace !== -1) {
                            input = input.substr(0, lastSpace);
                        }
                    } else {
                        while (input.charAt(input.length - 1) === ' ') {
                            input = input.substr(0, input.length - 1);
                        }
                    }
                    return input + '...';
                }
                return input;
            }
        }]);

        return TruncateMarkedText;
    }();

    Polymer(TruncateMarkedText);
})();
'use strict';

(function () {
  'use strict';

  Polymer.UtilsBehavior = {

    _getIndexByProperty: function _getIndexByProperty(array, property, value) {
      for (var i = 0, length = array.length; i < length; i++) {
        if (array[i][property].toString() === value.toString()) {
          return i;
        }
      }
    },

    _generateClass: function _generateClass(value) {
      return value.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
    },

    _randomOrder: function _randomOrder(array) {
      return array.sort(function () {
        return 0.5 - Math.random();
      });
    },

    _toArray: function _toArray(obj) {
      return Object.keys(obj).map(function (key) {
        return obj[key];
      });
    }

  };
})();
'use strict';

(function () {
  'use strict';

  Polymer({

    is: 'speaker-details',

    behaviors: [Polymer.PaperDialogBehavior, Polymer.NeonAnimationRunnerBehavior, Polymer.UtilsBehavior],

    properties: {
      speaker: {
        type: Object,
        observer: '_speakerChanged'
      }
    },

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    ready: function ready() {
      var title = this.$.title;
      addEventListener('paper-header-transform', function (e) {
        var d = e.detail;
        var m = d.height - d.condensedHeight;
        var transform = 40 * (d.y / m > 1 ? 1 : d.y / m);
        Polymer.Base.translate3d(transform + 'px', 0, 0, title);
      });
    },

    _speakerChanged: function _speakerChanged() {
      var generatedClass = this._generateClass(this.speaker.tags[0]);
      this.customStyle['--paper-scroll-header-panel-color'] = 'var(--' + generatedClass + ')';
      this._previousBrowserColor = document.getElementsByName('theme-color')[0].content;
      document.getElementsByName('theme-color')[0].content = this.getComputedStyleValue('--' + generatedClass);

      if (window.innerWidth < 961) {
        this.$.scrollHeaderPanel.$.headerBg.style.background = 'linear-gradient(to top, rgba(0, 0, 0, 0.4) -10%, rgba(0, 0, 0, 0.1) 50%), url(' + this.speaker.photoUrl + ') 0 / cover no-repeat';
      }
      this.updateStyles();
    },

    _renderOpened: function _renderOpened() {
      page.redirect('/' + app.route + '/' + this.speaker.id);
      if (this.withBackdrop && window.innerWidth > 960) {
        this.backdropElement.open();
      }
      this.playAnimation('entry');
      this.async(function () {
        this.$.scrollHeaderPanel.scroll(1, true);
        this.$.scrollHeaderPanel.notifyResize();
      });
    },

    _renderClosed: function _renderClosed() {
      page.show('/' + app.route, null, false);
      document.getElementsByName('theme-color')[0].content = this._previousBrowserColor;
      this.backdropElement.close();
      this.playAnimation('exit');
    },

    _onNeonAnimationFinish: function _onNeonAnimationFinish() {
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    }

  });
})();
'use strict';

(function () {
        var po = document.createElement('script');
        po.type = 'text/javascript';
        po.async = true;
        po.src = 'https://apis.google.com/js/platform.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(po, s);
})();
Polymer({
    is: 'paper-input-container',

    properties: {
      /**
       * Set to true to disable the floating label. The label disappears when the input value is
       * not null.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the floating label.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * The attribute to listen for value changes on.
       */
      attrForValue: {
        type: String,
        value: 'bind-value'
      },

      /**
       * Set to true to auto-validate the input value when it changes.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * True if the input is invalid. This property is set automatically when the input value
       * changes if auto-validating, or when the `iron-input-validate` event is heard from a child.
       */
      invalid: {
        observer: '_invalidChanged',
        type: Boolean,
        value: false
      },

      /**
       * True if the input has focus.
       */
      focused: {
        readOnly: true,
        type: Boolean,
        value: false,
        notify: true
      },

      _addons: {
        type: Array
        // do not set a default value here intentionally - it will be initialized lazily when a
        // distributed child is attached, which may occur before configuration for this element
        // in polyfill.
      },

      _inputHasContent: {
        type: Boolean,
        value: false
      },

      _inputSelector: {
        type: String,
        value: 'input,textarea,.paper-input-input'
      },

      _boundOnFocus: {
        type: Function,
        value: function() {
          return this._onFocus.bind(this);
        }
      },

      _boundOnBlur: {
        type: Function,
        value: function() {
          return this._onBlur.bind(this);
        }
      },

      _boundOnInput: {
        type: Function,
        value: function() {
          return this._onInput.bind(this);
        }
      },

      _boundValueChanged: {
        type: Function,
        value: function() {
          return this._onValueChanged.bind(this);
        }
      }
    },

    listeners: {
      'addon-attached': '_onAddonAttached',
      'iron-input-validate': '_onIronInputValidate'
    },

    get _valueChangedEvent() {
      return this.attrForValue + '-changed';
    },

    get _propertyForValue() {
      return Polymer.CaseMap.dashToCamelCase(this.attrForValue);
    },

    get _inputElement() {
      return Polymer.dom(this).querySelector(this._inputSelector);
    },

    get _inputElementValue() {
      return this._inputElement[this._propertyForValue] || this._inputElement.value;
    },

    ready: function() {
      if (!this._addons) {
        this._addons = [];
      }
      this.addEventListener('focus', this._boundOnFocus, true);
      this.addEventListener('blur', this._boundOnBlur, true);
    },

    attached: function() {
      if (this.attrForValue) {
        this._inputElement.addEventListener(this._valueChangedEvent, this._boundValueChanged);
      } else {
        this.addEventListener('input', this._onInput);
      }

      // Only validate when attached if the input already has a value.
      if (this._inputElementValue != '') {
        this._handleValueAndAutoValidate(this._inputElement);
      } else {
        this._handleValue(this._inputElement);
      }
    },

    _onAddonAttached: function(event) {
      if (!this._addons) {
        this._addons = [];
      }
      var target = event.target;
      if (this._addons.indexOf(target) === -1) {
        this._addons.push(target);
        if (this.isAttached) {
          this._handleValue(this._inputElement);
        }
      }
    },

    _onFocus: function() {
      this._setFocused(true);
    },

    _onBlur: function() {
      this._setFocused(false);
      this._handleValueAndAutoValidate(this._inputElement);
    },

    _onInput: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _onValueChanged: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _handleValue: function(inputElement) {
      var value = this._inputElementValue;

      // type="number" hack needed because this.value is empty until it's valid
      if (value || value === 0 || (inputElement.type === 'number' && !inputElement.checkValidity())) {
        this._inputHasContent = true;
      } else {
        this._inputHasContent = false;
      }

      this.updateAddons({
        inputElement: inputElement,
        value: value,
        invalid: this.invalid
      });
    },

    _handleValueAndAutoValidate: function(inputElement) {
      if (this.autoValidate) {
        var valid;
        if (inputElement.validate) {
          valid = inputElement.validate(this._inputElementValue);
        } else {
          valid = inputElement.checkValidity();
        }
        this.invalid = !valid;
      }

      // Call this last to notify the add-ons.
      this._handleValue(inputElement);
    },

    _onIronInputValidate: function(event) {
      this.invalid = this._inputElement.invalid;
    },

    _invalidChanged: function() {
      if (this._addons) {
        this.updateAddons({invalid: this.invalid});
      }
    },

    /**
     * Call this to update the state of add-ons.
     * @param {Object} state Add-on state.
     */
    updateAddons: function(state) {
      for (var addon, index = 0; addon = this._addons[index]; index++) {
        addon.update(state);
      }
    },

    _computeInputContentClass: function(noLabelFloat, alwaysFloatLabel, focused, invalid, _inputHasContent) {
      var cls = 'input-content';
      if (!noLabelFloat) {
        var label = this.querySelector('label');

        if (alwaysFloatLabel || _inputHasContent) {
          cls += ' label-is-floating';
          // If the label is floating, ignore any offsets that may have been
          // applied from a prefix element.
          this.$.labelAndInputContainer.style.position = 'static';

          if (invalid) {
            cls += ' is-invalid';
          } else if (focused) {
            cls += " label-is-highlighted";
          }
        } else {
          // When the label is not floating, it should overlap the input element.
          if (label) {
            this.$.labelAndInputContainer.style.position = 'relative';
          }
        }
      } else {
        if (_inputHasContent) {
          cls += ' label-is-hidden';
        }
      }
      return cls;
    },

    _computeUnderlineClass: function(focused, invalid) {
      var cls = 'underline';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    },

    _computeAddOnContentClass: function(focused, invalid) {
      var cls = 'add-on-content';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    }
  });
/**
  Polymer.IronFormElementBehavior enables a custom element to be included
  in an `iron-form`.

  @demo demo/index.html
  @polymerBehavior
  */
  Polymer.IronFormElementBehavior = {

    properties: {
      /**
       * Fired when the element is added to an `iron-form`.
       *
       * @event iron-form-element-register
       */

      /**
       * Fired when the element is removed from an `iron-form`.
       *
       * @event iron-form-element-unregister
       */

      /**
       * The name of this element.
       */
      name: {
        type: String
      },

      /**
       * The value for this element.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to mark the input as required. If used in a form, a
       * custom element that uses this behavior should also use
       * Polymer.IronValidatableBehavior and define a custom validation method.
       * Otherwise, a `required` element will always be considered valid.
       * It's also strongly recommended to provide a visual style for the element
       * when its value is invalid.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The form that the element is registered to.
       */
      _parentForm: {
        type: Object
      }
    },

    attached: function() {
      // Note: the iron-form that this element belongs to will set this
      // element's _parentForm property when handling this event.
      this.fire('iron-form-element-register');
    },

    detached: function() {
      if (this._parentForm) {
        this._parentForm.fire('iron-form-element-unregister', {target: this});
      }
    }

  };
/**
   * Singleton IronMeta instance.
   */
  Polymer.IronValidatableBehaviorMeta = null;

  /**
   * `Use Polymer.IronValidatableBehavior` to implement an element that validates user input.
   * Use the related `Polymer.IronValidatorBehavior` to add custom validation logic to an iron-input.
   *
   * By default, an `<iron-form>` element validates its fields when the user presses the submit button.
   * To validate a form imperatively, call the form's `validate()` method, which in turn will
   * call `validate()` on all its children. By using `Polymer.IronValidatableBehavior`, your
   * custom element will get a public `validate()`, which
   * will return the validity of the element, and a corresponding `invalid` attribute,
   * which can be used for styling.
   *
   * To implement the custom validation logic of your element, you must override
   * the protected `_getValidity()` method of this behaviour, rather than `validate()`.
   * See [this](https://github.com/PolymerElements/iron-form/blob/master/demo/simple-element.html)
   * for an example.
   *
   * ### Accessibility
   *
   * Changing the `invalid` property, either manually or by calling `validate()` will update the
   * `aria-invalid` attribute.
   *
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronValidatableBehavior = {

    properties: {

      /**
       * Name of the validator to use.
       */
      validator: {
        type: String
      },

      /**
       * True if the last call to `validate` is invalid.
       */
      invalid: {
        notify: true,
        reflectToAttribute: true,
        type: Boolean,
        value: false
      },

      /**
       * This property is deprecated and should not be used. Use the global
       * validator meta singleton, `Polymer.IronValidatableBehaviorMeta` instead.
       */
      _validatorMeta: {
        type: Object
      },

      /**
       * Namespace for this validator. This property is deprecated and should
       * not be used. For all intents and purposes, please consider it a
       * read-only, config-time property.
       */
      validatorType: {
        type: String,
        value: 'validator'
      },

      _validator: {
        type: Object,
        computed: '__computeValidator(validator)'
      }
    },

    observers: [
      '_invalidChanged(invalid)'
    ],

    registered: function() {
      Polymer.IronValidatableBehaviorMeta = new Polymer.IronMeta({type: 'validator'});
    },

    _invalidChanged: function() {
      if (this.invalid) {
        this.setAttribute('aria-invalid', 'true');
      } else {
        this.removeAttribute('aria-invalid');
      }
    },

    /**
     * @return {boolean} True if the validator `validator` exists.
     */
    hasValidator: function() {
      return this._validator != null;
    },

    /**
     * Returns true if the `value` is valid, and updates `invalid`. If you want
     * your element to have custom validation logic, do not override this method;
     * override `_getValidity(value)` instead.

     * @param {Object} value The value to be validated. By default, it is passed
     * to the validator's `validate()` function, if a validator is set.
     * @return {boolean} True if `value` is valid.
     */
    validate: function(value) {
      this.invalid = !this._getValidity(value);
      return !this.invalid;
    },

    /**
     * Returns true if `value` is valid.  By default, it is passed
     * to the validator's `validate()` function, if a validator is set. You
     * should override this method if you want to implement custom validity
     * logic for your element.
     *
     * @param {Object} value The value to be validated.
     * @return {boolean} True if `value` is valid.
     */

    _getValidity: function(value) {
      if (this.hasValidator()) {
        return this._validator.validate(value);
      }
      return true;
    },

    __computeValidator: function() {
      return Polymer.IronValidatableBehaviorMeta &&
          Polymer.IronValidatableBehaviorMeta.byKey(this.validator);
    }
  };
/*
`<iron-input>` adds two-way binding and custom validators using `Polymer.IronValidatorBehavior`
to `<input>`.

### Two-way binding

By default you can only get notified of changes to an `input`'s `value` due to user input:

    <input value="{{myValue::input}}">

`iron-input` adds the `bind-value` property that mirrors the `value` property, and can be used
for two-way data binding. `bind-value` will notify if it is changed either by user input or by script.

    <input is="iron-input" bind-value="{{myValue}}">

### Custom validators

You can use custom validators that implement `Polymer.IronValidatorBehavior` with `<iron-input>`.

    <input is="iron-input" validator="my-custom-validator">

### Stopping invalid input

It may be desirable to only allow users to enter certain characters. You can use the
`prevent-invalid-input` and `allowed-pattern` attributes together to accomplish this. This feature
is separate from validation, and `allowed-pattern` does not affect how the input is validated.

    <!-- only allow characters that match [0-9] -->
    <input is="iron-input" prevent-invalid-input allowed-pattern="[0-9]">

@hero hero.svg
@demo demo/index.html
*/

  Polymer({

    is: 'iron-input',

    extends: 'input',

    behaviors: [
      Polymer.IronValidatableBehavior
    ],

    properties: {

      /**
       * Use this property instead of `value` for two-way data binding.
       */
      bindValue: {
        observer: '_bindValueChanged',
        type: String
      },

      /**
       * Set to true to prevent the user from entering invalid input. If `allowedPattern` is set,
       * any character typed by the user will be matched against that pattern, and rejected if it's not a match.
       * Pasted input will have each character checked individually; if any character
       * doesn't match `allowedPattern`, the entire pasted string will be rejected.
       * If `allowedPattern` is not set, it will use the `type` attribute (only supported for `type=number`).
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Regular expression that list the characters allowed as input.
       * This pattern represents the allowed characters for the field; as the user inputs text,
       * each individual character will be checked against the pattern (rather than checking
       * the entire value as a whole). The recommended format should be a list of allowed characters;
       * for example, `[a-zA-Z0-9.+-!;:]`
       */
      allowedPattern: {
        type: String,
        observer: "_allowedPatternChanged"
      },

      _previousValidInput: {
        type: String,
        value: ''
      },

      _patternAlreadyChecked: {
        type: Boolean,
        value: false
      }

    },

    listeners: {
      'input': '_onInput',
      'keypress': '_onKeypress'
    },

    /** @suppress {checkTypes} */
    registered: function() {
      // Feature detect whether we need to patch dispatchEvent (i.e. on FF and IE).
      if (!this._canDispatchEventOnDisabled()) {
        this._origDispatchEvent = this.dispatchEvent;
        this.dispatchEvent = this._dispatchEventFirefoxIE;
      }
    },

    created: function() {
      Polymer.IronA11yAnnouncer.requestAvailability();
    },

    _canDispatchEventOnDisabled: function() {
      var input = document.createElement('input');
      var canDispatch = false;
      input.disabled = true;

      input.addEventListener('feature-check-dispatch-event', function() {
        canDispatch = true;
      });

      try {
        input.dispatchEvent(new Event('feature-check-dispatch-event'));
      } catch(e) {}

      return canDispatch;
    },

    _dispatchEventFirefoxIE: function() {
      // Due to Firefox bug, events fired on disabled form controls can throw
      // errors; furthermore, neither IE nor Firefox will actually dispatch
      // events from disabled form controls; as such, we toggle disable around
      // the dispatch to allow notifying properties to notify
      // See issue #47 for details
      var disabled = this.disabled;
      this.disabled = false;
      this._origDispatchEvent.apply(this, arguments);
      this.disabled = disabled;
    },

    get _patternRegExp() {
      var pattern;
      if (this.allowedPattern) {
        pattern = new RegExp(this.allowedPattern);
      } else {
        switch (this.type) {
          case 'number':
            pattern = /[0-9.,e-]/;
            break;
        }
      }
      return pattern;
    },

    ready: function() {
      this.bindValue = this.value;
    },

    /**
     * @suppress {checkTypes}
     */
    _bindValueChanged: function() {
      if (this.value !== this.bindValue) {
        this.value = !(this.bindValue || this.bindValue === 0 || this.bindValue === false) ? '' : this.bindValue;
      }
      // manually notify because we don't want to notify until after setting value
      this.fire('bind-value-changed', {value: this.bindValue});
    },

    _allowedPatternChanged: function() {
      // Force to prevent invalid input when an `allowed-pattern` is set
      this.preventInvalidInput = this.allowedPattern ? true : false;
    },

    _onInput: function() {
      // Need to validate each of the characters pasted if they haven't
      // been validated inside `_onKeypress` already.
      if (this.preventInvalidInput && !this._patternAlreadyChecked) {
        var valid = this._checkPatternValidity();
        if (!valid) {
          this._announceInvalidCharacter('Invalid string of characters not entered.');
          this.value = this._previousValidInput;
        }
      }

      this.bindValue = this.value;
      this._previousValidInput = this.value;
      this._patternAlreadyChecked = false;
    },

    _isPrintable: function(event) {
      // What a control/printable character is varies wildly based on the browser.
      // - most control characters (arrows, backspace) do not send a `keypress` event
      //   in Chrome, but the *do* on Firefox
      // - in Firefox, when they do send a `keypress` event, control chars have
      //   a charCode = 0, keyCode = xx (for ex. 40 for down arrow)
      // - printable characters always send a keypress event.
      // - in Firefox, printable chars always have a keyCode = 0. In Chrome, the keyCode
      //   always matches the charCode.
      // None of this makes any sense.

      // For these keys, ASCII code == browser keycode.
      var anyNonPrintable =
        (event.keyCode == 8)   ||  // backspace
        (event.keyCode == 9)   ||  // tab
        (event.keyCode == 13)  ||  // enter
        (event.keyCode == 27);     // escape

      // For these keys, make sure it's a browser keycode and not an ASCII code.
      var mozNonPrintable =
        (event.keyCode == 19)  ||  // pause
        (event.keyCode == 20)  ||  // caps lock
        (event.keyCode == 45)  ||  // insert
        (event.keyCode == 46)  ||  // delete
        (event.keyCode == 144) ||  // num lock
        (event.keyCode == 145) ||  // scroll lock
        (event.keyCode > 32 && event.keyCode < 41)   || // page up/down, end, home, arrows
        (event.keyCode > 111 && event.keyCode < 124); // fn keys

      return !anyNonPrintable && !(event.charCode == 0 && mozNonPrintable);
    },

    _onKeypress: function(event) {
      if (!this.preventInvalidInput && this.type !== 'number') {
        return;
      }
      var regexp = this._patternRegExp;
      if (!regexp) {
        return;
      }

      // Handle special keys and backspace
      if (event.metaKey || event.ctrlKey || event.altKey)
        return;

      // Check the pattern either here or in `_onInput`, but not in both.
      this._patternAlreadyChecked = true;

      var thisChar = String.fromCharCode(event.charCode);
      if (this._isPrintable(event) && !regexp.test(thisChar)) {
        event.preventDefault();
        this._announceInvalidCharacter('Invalid character ' + thisChar + ' not entered.');
      }
    },

    _checkPatternValidity: function() {
      var regexp = this._patternRegExp;
      if (!regexp) {
        return true;
      }
      for (var i = 0; i < this.value.length; i++) {
        if (!regexp.test(this.value[i])) {
          return false;
        }
      }
      return true;
    },

    /**
     * Returns true if `value` is valid. The validator provided in `validator` will be used first,
     * then any constraints.
     * @return {boolean} True if the value is valid.
     */
    validate: function() {
      // First, check what the browser thinks. Some inputs (like type=number)
      // behave weirdly and will set the value to "" if something invalid is
      // entered, but will set the validity correctly.
      var valid =  this.checkValidity();

      // Only do extra checking if the browser thought this was valid.
      if (valid) {
        // Empty, required input is invalid
        if (this.required && this.value === '') {
          valid = false;
        } else if (this.hasValidator()) {
          valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
        }
      }

      this.invalid = !valid;
      this.fire('iron-input-validate');
      return valid;
    },

    _announceInvalidCharacter: function(message) {
      this.fire('iron-announce', { text: message });
    }
  });

  /*
  The `iron-input-validate` event is fired whenever `validate()` is called.
  @event iron-input-validate
  */
// Generate unique, monotonically increasing IDs for labels (needed by
  // aria-labelledby) and add-ons.
  Polymer.PaperInputHelper = {};
  Polymer.PaperInputHelper.NextLabelID = 1;
  Polymer.PaperInputHelper.NextAddonID = 1;

  /**
   * Use `Polymer.PaperInputBehavior` to implement inputs with `<paper-input-container>`. This
   * behavior is implemented by `<paper-input>`. It exposes a number of properties from
   * `<paper-input-container>` and `<input is="iron-input">` and they should be bound in your
   * template.
   *
   * The input element can be accessed by the `inputElement` property if you need to access
   * properties or methods that are not exposed.
   * @polymerBehavior Polymer.PaperInputBehavior
   */
  Polymer.PaperInputBehaviorImpl = {

    properties: {
      /**
       * Fired when the input changes due to user interaction.
       *
       * @event change
       */

      /**
       * The label for this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * `<label>`'s content and `hidden` property, e.g.
       * `<label hidden$="[[!label]]">[[label]]</label>` in your `template`
       */
      label: {
        type: String
      },

      /**
       * The value for this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `bindValue`
       * property, or the value property of your input that is `notify:true`.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to disable this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * both the `<paper-input-container>`'s and the input's `disabled` property.
       */
      disabled: {
        type: Boolean,
        value: false
      },

      /**
       * Returns true if the value is invalid. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to both the
       * `<paper-input-container>`'s and the input's `invalid` property.
       *
       * If `autoValidate` is true, the `invalid` attribute is managed automatically,
       * which can clobber attempts to manage it manually.
       */
      invalid: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * Set to true to prevent the user from entering invalid input. If you're
       * using PaperInputBehavior to  implement your own paper-input-like element,
       * bind this to `<input is="iron-input">`'s `preventInvalidInput` property.
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Set this to specify the pattern allowed by `preventInvalidInput`. If
       * you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `allowedPattern`
       * property.
       */
      allowedPattern: {
        type: String
      },

      /**
       * The type of the input. The supported types are `text`, `number` and `password`.
       * If you're using PaperInputBehavior to implement your own paper-input-like element,
       * bind this to the `<input is="iron-input">`'s `type` property.
       */
      type: {
        type: String
      },

      /**
       * The datalist of the input (if any). This should match the id of an existing `<datalist>`.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `list` property.
       */
      list: {
        type: String
      },

      /**
       * A pattern to validate the `input` with. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `pattern` property.
       */
      pattern: {
        type: String
      },

      /**
       * Set to true to mark the input as required. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `required` property.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The error message to display when the input is invalid. If you're using
       * PaperInputBehavior to implement your own paper-input-like element,
       * bind this to the `<paper-input-error>`'s content, if using.
       */
      errorMessage: {
        type: String
      },

      /**
       * Set to true to show a character counter.
       */
      charCounter: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable the floating label. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `noLabelFloat` property.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the label. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `alwaysFloatLabel` property.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to auto-validate the input value. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `autoValidate` property.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * Name of the validator to use. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `validator` property.
       */
      validator: {
        type: String
      },

      // HTMLInputElement attributes for binding if needed

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocomplete` property.
       */
      autocomplete: {
        type: String,
        value: 'off'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autofocus` property.
       */
      autofocus: {
        type: Boolean,
        observer: '_autofocusChanged'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `inputmode` property.
       */
      inputmode: {
        type: String
      },

      /**
       * The minimum length of the input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `minlength` property.
       */
      minlength: {
        type: Number
      },

      /**
       * The maximum length of the input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `maxlength` property.
       */
      maxlength: {
        type: Number
      },

      /**
       * The minimum (numeric or date-time) input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `min` property.
       */
      min: {
        type: String
      },

      /**
       * The maximum (numeric or date-time) input value.
       * Can be a String (e.g. `"2000-1-1"`) or a Number (e.g. `2`).
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `max` property.
       */
      max: {
        type: String
      },

      /**
       * Limits the numeric or date-time increments.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `step` property.
       */
      step: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `name` property.
       */
      name: {
        type: String
      },

      /**
       * A placeholder string in addition to the label. If this is set, the label will always float.
       */
      placeholder: {
        type: String,
        // need to set a default so _computeAlwaysFloatLabel is run
        value: ''
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `readonly` property.
       */
      readonly: {
        type: Boolean,
        value: false
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `size` property.
       */
      size: {
        type: Number
      },

      // Nonstandard attributes for binding if needed

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocapitalize` property.
       */
      autocapitalize: {
        type: String,
        value: 'none'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocorrect` property.
       */
      autocorrect: {
        type: String,
        value: 'off'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autosave` property,
       * used with type=search.
       */
      autosave: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `results` property,
       * used with type=search.
       */
      results: {
        type: Number
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `accept` property,
       * used with type=file.
       */
      accept: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the`<input is="iron-input">`'s `multiple` property,
       * used with type=file.
       */
      multiple: {
        type: Boolean
      },

      _ariaDescribedBy: {
        type: String,
        value: ''
      },

      _ariaLabelledBy: {
        type: String,
        value: ''
      }

    },

    listeners: {
      'addon-attached': '_onAddonAttached',
    },

    keyBindings: {
      'shift+tab:keydown': '_onShiftTabDown'
    },

    hostAttributes: {
      tabindex: 0
    },

    /**
     * Returns a reference to the input element.
     */
    get inputElement() {
      return this.$.input;
    },

    /**
     * Returns a reference to the focusable element.
     */
    get _focusableElement() {
      return this.inputElement;
    },

    registered: function() {
      // These types have some default placeholder text; overlapping
      // the label on top of it looks terrible. Auto-float the label in this case.
      this._typesThatHaveText = ["date", "datetime", "datetime-local", "month",
          "time", "week", "file"];
    },

    attached: function() {
      this._updateAriaLabelledBy();

      if (this.inputElement &&
          this._typesThatHaveText.indexOf(this.inputElement.type) !== -1) {
        this.alwaysFloatLabel = true;
      }
    },

    _appendStringWithSpace: function(str, more) {
      if (str) {
        str = str + ' ' + more;
      } else {
        str = more;
      }
      return str;
    },

    _onAddonAttached: function(event) {
      var target = event.path ? event.path[0] : event.target;
      if (target.id) {
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, target.id);
      } else {
        var id = 'paper-input-add-on-' + Polymer.PaperInputHelper.NextAddonID++;
        target.id = id;
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, id);
      }
    },

    /**
     * Validates the input element and sets an error style if needed.
     *
     * @return {boolean}
     */
    validate: function() {
      return this.inputElement.validate();
    },

    /**
     * Forward focus to inputElement. Overriden from IronControlState.
     */
    _focusBlurHandler: function(event) {
      Polymer.IronControlState._focusBlurHandler.call(this, event);

      // Forward the focus to the nested input.
      if (this.focused && !this._shiftTabPressed)
        this._focusableElement.focus();
    },

    /**
     * Handler that is called when a shift+tab keypress is detected by the menu.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onShiftTabDown: function(event) {
      var oldTabIndex = this.getAttribute('tabindex');
      this._shiftTabPressed = true;
      this.setAttribute('tabindex', '-1');
      this.async(function() {
        this.setAttribute('tabindex', oldTabIndex);
        this._shiftTabPressed = false;
      }, 1);
    },

    /**
     * If `autoValidate` is true, then validates the element.
     */
    _handleAutoValidate: function() {
      if (this.autoValidate)
        this.validate();
    },

    /**
     * Restores the cursor to its original position after updating the value.
     * @param {string} newValue The value that should be saved.
     */
    updateValueAndPreserveCaret: function(newValue) {
      // Not all elements might have selection, and even if they have the
      // right properties, accessing them might throw an exception (like for
      // <input type=number>)
      try {
        var start = this.inputElement.selectionStart;
        this.value = newValue;

        // The cursor automatically jumps to the end after re-setting the value,
        // so restore it to its original position.
        this.inputElement.selectionStart = start;
        this.inputElement.selectionEnd = start;
      } catch (e) {
        // Just set the value and give up on the caret.
        this.value = newValue;
      }
    },

    _computeAlwaysFloatLabel: function(alwaysFloatLabel, placeholder) {
      return placeholder || alwaysFloatLabel;
    },

    _updateAriaLabelledBy: function() {
      var label = Polymer.dom(this.root).querySelector('label');
      if (!label) {
        this._ariaLabelledBy = '';
        return;
      }
      var labelledBy;
      if (label.id) {
        labelledBy = label.id;
      } else {
        labelledBy = 'paper-input-label-' + Polymer.PaperInputHelper.NextLabelID++;
        label.id = labelledBy;
      }
      this._ariaLabelledBy = labelledBy;
    },

    _onChange:function(event) {
      // In the Shadow DOM, the `change` event is not leaked into the
      // ancestor tree, so we must do this manually.
      // See https://w3c.github.io/webcomponents/spec/shadow/#events-that-are-not-leaked-into-ancestor-trees.
      if (this.shadowRoot) {
        this.fire(event.type, {sourceEvent: event}, {
          node: this,
          bubbles: event.bubbles,
          cancelable: event.cancelable
        });
      }
    },

    _autofocusChanged: function() {
      // Firefox doesn't respect the autofocus attribute if it's applied after
      // the page is loaded (Chrome/WebKit do respect it), preventing an
      // autofocus attribute specified in markup from taking effect when the
      // element is upgraded. As a workaround, if the autofocus property is set,
      // and the focus hasn't already been moved elsewhere, we take focus.
      if (this.autofocus && this._focusableElement) {

        // In IE 11, the default document.activeElement can be the page's
        // outermost html element, but there are also cases (under the
        // polyfill?) in which the activeElement is not a real HTMLElement, but
        // just a plain object. We identify the latter case as having no valid
        // activeElement.
        var activeElement = document.activeElement;
        var isActiveElementValid = activeElement instanceof HTMLElement;

        // Has some other element has already taken the focus?
        var isSomeElementActive = isActiveElementValid &&
            activeElement !== document.body &&
            activeElement !== document.documentElement; /* IE 11 */
        if (!isSomeElementActive) {
          // No specific element has taken the focus yet, so we can take it.
          this._focusableElement.focus();
        }
      }
    }
  }

  /** @polymerBehavior */
  Polymer.PaperInputBehavior = [
    Polymer.IronControlState,
    Polymer.IronA11yKeysBehavior,
    Polymer.PaperInputBehaviorImpl
  ];
/**
   * Use `Polymer.PaperInputAddonBehavior` to implement an add-on for `<paper-input-container>`. A
   * add-on appears below the input, and may display information based on the input value and
   * validity such as a character counter or an error message.
   * @polymerBehavior
   */
  Polymer.PaperInputAddonBehavior = {

    hostAttributes: {
      'add-on': ''
    },

    attached: function() {
      this.fire('addon-attached');
    },

    /**
     * The function called by `<paper-input-container>` when the input value or validity changes.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
    }

  };
Polymer({
    is: 'paper-input-char-counter',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      _charCounterStr: {
        type: String,
        value: '0'
      }
    },

    /**
     * This overrides the update function in PaperInputAddonBehavior.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
      if (!state.inputElement) {
        return;
      }

      state.value = state.value || '';

      var counter = state.value.toString().length.toString();

      if (state.inputElement.hasAttribute('maxlength')) {
        counter += '/' + state.inputElement.getAttribute('maxlength');
      }

      this._charCounterStr = counter;
    }
  });
Polymer({
    is: 'paper-input-error',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      /**
       * True if the error is showing.
       */
      invalid: {
        readOnly: true,
        reflectToAttribute: true,
        type: Boolean
      }
    },

    /**
     * This overrides the update function in PaperInputAddonBehavior.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
      this._setInvalid(state.invalid);
    }
  });
Polymer({
    is: 'paper-input',

    behaviors: [
      Polymer.IronFormElementBehavior,
      Polymer.PaperInputBehavior
    ]
  });
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var MailchimpSubscribe = function () {
    function MailchimpSubscribe() {
      _classCallCheck(this, MailchimpSubscribe);
    }

    _createClass(MailchimpSubscribe, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          url: String,
          name: String
        };
      }
    }, {
      key: 'submitForm',
      value: function submitForm() {
        this.$$('#mc-embedded-subscribe-form').submit();
      }
    }]);

    return MailchimpSubscribe;
  }();

  Polymer(MailchimpSubscribe);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var FooterBlock = function () {
    function FooterBlock() {
      _classCallCheck(this, FooterBlock);
    }

    _createClass(FooterBlock, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          mailchimpUrl: String,
          mailchimpName: String
        };
      }
    }]);

    return FooterBlock;
  }();

  Polymer(FooterBlock);
})();
'use strict';

(function () {
  'use strict';

  Polymer({

    is: 'speakers-page',

    behaviors: [Polymer.NeonSharedElementAnimatableBehavior, Polymer.UtilsBehavior],

    properties: {
      speakers: {
        type: Object
      },
      selected: {
        type: Boolean,
        observer: 'updateHeroSettings'
      },
      heroSettings: {
        type: Object,
        notify: true
      },
      speakerId: {
        type: String,
        notify: true
      },
      _selectedSpeaker: Object,
      _heroSettings: {
        type: Object,
        /* jshint ignore:start */
        value: function value() {
          return { "backgroundColor": "#673AB7", "fontColor": "#FFFFFF", "tabBarColor": "#FFFFFF" };
        }
        /* jshint ignore:end */
      },

      animationConfig: {
        type: Object,
        value: function value() {
          return {
            'entry': [{
              name: 'fade-in-animation',
              animation: 'fade-in-animation',
              node: this,
              timing: {
                delay: 500
              }
            }],
            'exit': [{
              name: 'fade-out-animation',
              animation: 'fade-out-animation',
              node: this
            }]
          };
        }
      }
    },

    observers: ['openSpeakerDetails(selected, speakerId, speakers)'],

    updateHeroSettings: function updateHeroSettings() {
      this.heroSettings = this.selected ? this._heroSettings : this.heroSettings;
    },

    openSpeakerDetails: function openSpeakerDetails() {
      if (this.selected && this.speakerId) {
        this.async(function () {
          this._selectedSpeaker = this.speakers[this.speakerId];
          this.$.speakerDetails.open();
          this.speakerId = null;
        }, 500);
      }
    },

    _updateCascadedNodes: function _updateCascadedNodes() {
      var cascaded = Polymer.dom(this.root).querySelectorAll('[cascaded]');
      var cascadedArray = Array.prototype.slice.call(cascaded);
      this.animationConfig.entry.push({
        name: 'cascaded-animation',
        animation: 'transform-animation',
        transformFrom: 'translate3d(0, 100%, 0)',
        timing: {
          delay: 500
        },
        nodes: cascadedArray
      });
      this.animationConfig.exit.push({
        name: 'cascaded-animation',
        animation: 'transform-animation',
        transformTo: 'translate3d(0, 100%, 0)',
        nodes: cascadedArray
      });
    },

    _openSpeaker: function _openSpeaker(e) {
      this._selectedSpeaker = e.model.speaker;
      this.$.speakerDetails.open();
    }

  });
})();
Polymer({

    is: 'neon-animatable',

    behaviors: [
      Polymer.NeonAnimatableBehavior,
      Polymer.IronResizableBehavior
    ]

  });
(function() {
    'use strict';
    // Used to calculate the scroll direction during touch events.
    var LAST_TOUCH_POSITION = {
      pageX: 0,
      pageY: 0
    };
    // Used to avoid computing event.path and filter scrollable nodes (better perf).
    var ROOT_TARGET = null;
    var SCROLLABLE_NODES = [];

    /**
     * The IronDropdownScrollManager is intended to provide a central source
     * of authority and control over which elements in a document are currently
     * allowed to scroll.
     */

    Polymer.IronDropdownScrollManager = {

      /**
       * The current element that defines the DOM boundaries of the
       * scroll lock. This is always the most recently locking element.
       */
      get currentLockingElement() {
        return this._lockingElements[this._lockingElements.length - 1];
      },

      /**
       * Returns true if the provided element is "scroll locked", which is to
       * say that it cannot be scrolled via pointer or keyboard interactions.
       *
       * @param {HTMLElement} element An HTML element instance which may or may
       * not be scroll locked.
       */
      elementIsScrollLocked: function(element) {
        var currentLockingElement = this.currentLockingElement;

        if (currentLockingElement === undefined)
          return false;

        var scrollLocked;

        if (this._hasCachedLockedElement(element)) {
          return true;
        }

        if (this._hasCachedUnlockedElement(element)) {
          return false;
        }

        scrollLocked = !!currentLockingElement &&
          currentLockingElement !== element &&
          !this._composedTreeContains(currentLockingElement, element);

        if (scrollLocked) {
          this._lockedElementCache.push(element);
        } else {
          this._unlockedElementCache.push(element);
        }

        return scrollLocked;
      },

      /**
       * Push an element onto the current scroll lock stack. The most recently
       * pushed element and its children will be considered scrollable. All
       * other elements will not be scrollable.
       *
       * Scroll locking is implemented as a stack so that cases such as
       * dropdowns within dropdowns are handled well.
       *
       * @param {HTMLElement} element The element that should lock scroll.
       */
      pushScrollLock: function(element) {
        // Prevent pushing the same element twice
        if (this._lockingElements.indexOf(element) >= 0) {
          return;
        }

        if (this._lockingElements.length === 0) {
          this._lockScrollInteractions();
        }

        this._lockingElements.push(element);

        this._lockedElementCache = [];
        this._unlockedElementCache = [];
      },

      /**
       * Remove an element from the scroll lock stack. The element being
       * removed does not need to be the most recently pushed element. However,
       * the scroll lock constraints only change when the most recently pushed
       * element is removed.
       *
       * @param {HTMLElement} element The element to remove from the scroll
       * lock stack.
       */
      removeScrollLock: function(element) {
        var index = this._lockingElements.indexOf(element);

        if (index === -1) {
          return;
        }

        this._lockingElements.splice(index, 1);

        this._lockedElementCache = [];
        this._unlockedElementCache = [];

        if (this._lockingElements.length === 0) {
          this._unlockScrollInteractions();
        }
      },

      _lockingElements: [],

      _lockedElementCache: null,

      _unlockedElementCache: null,

      _isScrollingKeypress: function(event) {
        return Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(
          event, 'pageup pagedown home end up left down right');
      },

      _hasCachedLockedElement: function(element) {
        return this._lockedElementCache.indexOf(element) > -1;
      },

      _hasCachedUnlockedElement: function(element) {
        return this._unlockedElementCache.indexOf(element) > -1;
      },

      _composedTreeContains: function(element, child) {
        // NOTE(cdata): This method iterates over content elements and their
        // corresponding distributed nodes to implement a contains-like method
        // that pierces through the composed tree of the ShadowDOM. Results of
        // this operation are cached (elsewhere) on a per-scroll-lock basis, to
        // guard against potentially expensive lookups happening repeatedly as
        // a user scrolls / touchmoves.
        var contentElements;
        var distributedNodes;
        var contentIndex;
        var nodeIndex;

        if (element.contains(child)) {
          return true;
        }

        contentElements = Polymer.dom(element).querySelectorAll('content');

        for (contentIndex = 0; contentIndex < contentElements.length; ++contentIndex) {

          distributedNodes = Polymer.dom(contentElements[contentIndex]).getDistributedNodes();

          for (nodeIndex = 0; nodeIndex < distributedNodes.length; ++nodeIndex) {

            if (this._composedTreeContains(distributedNodes[nodeIndex], child)) {
              return true;
            }
          }
        }

        return false;
      },

      _scrollInteractionHandler: function(event) {
        // Avoid canceling an event with cancelable=false, e.g. scrolling is in
        // progress and cannot be interrupted.
        if (event.cancelable && this._shouldPreventScrolling(event)) {
          event.preventDefault();
        }
        // If event has targetTouches (touch event), update last touch position.
        if (event.targetTouches) {
          var touch = event.targetTouches[0];
          LAST_TOUCH_POSITION.pageX = touch.pageX;
          LAST_TOUCH_POSITION.pageY = touch.pageY;
        }
      },

      _lockScrollInteractions: function() {
        this._boundScrollHandler = this._boundScrollHandler ||
          this._scrollInteractionHandler.bind(this);
        // Modern `wheel` event for mouse wheel scrolling:
        document.addEventListener('wheel', this._boundScrollHandler, true);
        // Older, non-standard `mousewheel` event for some FF:
        document.addEventListener('mousewheel', this._boundScrollHandler, true);
        // IE:
        document.addEventListener('DOMMouseScroll', this._boundScrollHandler, true);
        // Save the SCROLLABLE_NODES on touchstart, to be used on touchmove.
        document.addEventListener('touchstart', this._boundScrollHandler, true);
        // Mobile devices can scroll on touch move:
        document.addEventListener('touchmove', this._boundScrollHandler, true);
        // Capture keydown to prevent scrolling keys (pageup, pagedown etc.)
        document.addEventListener('keydown', this._boundScrollHandler, true);
      },

      _unlockScrollInteractions: function() {
        document.removeEventListener('wheel', this._boundScrollHandler, true);
        document.removeEventListener('mousewheel', this._boundScrollHandler, true);
        document.removeEventListener('DOMMouseScroll', this._boundScrollHandler, true);
        document.removeEventListener('touchstart', this._boundScrollHandler, true);
        document.removeEventListener('touchmove', this._boundScrollHandler, true);
        document.removeEventListener('keydown', this._boundScrollHandler, true);
      },

      /**
       * Returns true if the event causes scroll outside the current locking
       * element, e.g. pointer/keyboard interactions, or scroll "leaking"
       * outside the locking element when it is already at its scroll boundaries.
       * @param {!Event} event
       * @return {boolean}
       * @private
       */
      _shouldPreventScrolling: function(event) {
        // Avoid expensive checks if the event is not one of the observed keys.
        if (event.type === 'keydown') {
          // Prevent event if it is one of the scrolling keys.
          return this._isScrollingKeypress(event);
        }

        // Update if root target changed. For touch events, ensure we don't
        // update during touchmove.
        var target = Polymer.dom(event).rootTarget;
        if (event.type !== 'touchmove' && ROOT_TARGET !== target) {
          ROOT_TARGET = target;
          SCROLLABLE_NODES = this._getScrollableNodes(Polymer.dom(event).path);
        }

        // Prevent event if no scrollable nodes.
        if (!SCROLLABLE_NODES.length) {
          return true;
        }
        // Don't prevent touchstart event inside the locking element when it has
        // scrollable nodes.
        if (event.type === 'touchstart') {
          return false;
        }
        // Get deltaX/Y.
        var info = this._getScrollInfo(event);
        // Prevent if there is no child that can scroll.
        return !this._getScrollingNode(SCROLLABLE_NODES, info.deltaX, info.deltaY);
      },

      /**
       * Returns an array of scrollable nodes up to the current locking element,
       * which is included too if scrollable.
       * @param {!Array<Node>} nodes
       * @return {Array<Node>} scrollables
       * @private
       */
      _getScrollableNodes: function(nodes) {
        var scrollables = [];
        var lockingIndex = nodes.indexOf(this.currentLockingElement);
        // Loop from root target to locking element (included).
        for (var i = 0; i <= lockingIndex; i++) {
          var node = nodes[i];
          // Skip document fragments.
          if (node.nodeType === 11) {
            continue;
          }
          // Check inline style before checking computed style.
          var style = node.style;
          if (style.overflow !== 'scroll' && style.overflow !== 'auto') {
            style = window.getComputedStyle(node);
          }
          if (style.overflow === 'scroll' || style.overflow === 'auto') {
            scrollables.push(node);
          }
        }
        return scrollables;
      },

      /**
       * Returns the node that is scrolling. If there is no scrolling,
       * returns undefined.
       * @param {!Array<Node>} nodes
       * @param {number} deltaX Scroll delta on the x-axis
       * @param {number} deltaY Scroll delta on the y-axis
       * @return {Node|undefined}
       * @private
       */
      _getScrollingNode: function(nodes, deltaX, deltaY) {
        // No scroll.
        if (!deltaX && !deltaY) {
          return;
        }
        // Check only one axis according to where there is more scroll.
        // Prefer vertical to horizontal.
        var verticalScroll = Math.abs(deltaY) >= Math.abs(deltaX);
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var canScroll = false;
          if (verticalScroll) {
            // delta < 0 is scroll up, delta > 0 is scroll down.
            canScroll = deltaY < 0 ? node.scrollTop > 0 :
              node.scrollTop < node.scrollHeight - node.clientHeight;
          } else {
            // delta < 0 is scroll left, delta > 0 is scroll right.
            canScroll = deltaX < 0 ? node.scrollLeft > 0 :
              node.scrollLeft < node.scrollWidth - node.clientWidth;
          }
          if (canScroll) {
            return node;
          }
        }
      },

      /**
       * Returns scroll `deltaX` and `deltaY`.
       * @param {!Event} event The scroll event
       * @return {{
       *  deltaX: number The x-axis scroll delta (positive: scroll right,
       *                 negative: scroll left, 0: no scroll),
       *  deltaY: number The y-axis scroll delta (positive: scroll down,
       *                 negative: scroll up, 0: no scroll)
       * }} info
       * @private
       */
      _getScrollInfo: function(event) {
        var info = {
          deltaX: event.deltaX,
          deltaY: event.deltaY
        };
        // Already available.
        if ('deltaX' in event) {
          // do nothing, values are already good.
        }
        // Safari has scroll info in `wheelDeltaX/Y`.
        else if ('wheelDeltaX' in event) {
          info.deltaX = -event.wheelDeltaX;
          info.deltaY = -event.wheelDeltaY;
        }
        // Firefox has scroll info in `detail` and `axis`.
        else if ('axis' in event) {
          info.deltaX = event.axis === 1 ? event.detail : 0;
          info.deltaY = event.axis === 2 ? event.detail : 0;
        }
        // On mobile devices, calculate scroll direction.
        else if (event.targetTouches) {
          var touch = event.targetTouches[0];
          // Touch moves from right to left => scrolling goes right.
          info.deltaX = LAST_TOUCH_POSITION.pageX - touch.pageX;
          // Touch moves from down to up => scrolling goes down.
          info.deltaY = LAST_TOUCH_POSITION.pageY - touch.pageY;
        }
        return info;
      }
    };
  })();
(function() {
      'use strict';

      Polymer({
        is: 'iron-dropdown',

        behaviors: [
          Polymer.IronControlState,
          Polymer.IronA11yKeysBehavior,
          Polymer.IronOverlayBehavior,
          Polymer.NeonAnimationRunnerBehavior
        ],

        properties: {
          /**
           * The orientation against which to align the dropdown content
           * horizontally relative to the dropdown trigger.
           * Overridden from `Polymer.IronFitBehavior`.
           */
          horizontalAlign: {
            type: String,
            value: 'left',
            reflectToAttribute: true
          },

          /**
           * The orientation against which to align the dropdown content
           * vertically relative to the dropdown trigger.
           * Overridden from `Polymer.IronFitBehavior`.
           */
          verticalAlign: {
            type: String,
            value: 'top',
            reflectToAttribute: true
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * opening of the dropdown.
           */
          openAnimationConfig: {
            type: Object
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * closing of the dropdown.
           */
          closeAnimationConfig: {
            type: Object
          },

          /**
           * If provided, this will be the element that will be focused when
           * the dropdown opens.
           */
          focusTarget: {
            type: Object
          },

          /**
           * Set to true to disable animations when opening and closing the
           * dropdown.
           */
          noAnimations: {
            type: Boolean,
            value: false
          },

          /**
           * By default, the dropdown will constrain scrolling on the page
           * to itself when opened.
           * Set to true in order to prevent scroll from being constrained
           * to the dropdown when it opens.
           */
          allowOutsideScroll: {
            type: Boolean,
            value: false
          },

          /**
           * Callback for scroll events.
           * @type {Function}
           * @private
           */
          _boundOnCaptureScroll: {
            type: Function,
            value: function() {
              return this._onCaptureScroll.bind(this);
            }
          }
        },

        listeners: {
          'neon-animation-finish': '_onNeonAnimationFinish'
        },

        observers: [
          '_updateOverlayPosition(positionTarget, verticalAlign, horizontalAlign, verticalOffset, horizontalOffset)'
        ],

        /**
         * The element that is contained by the dropdown, if any.
         */
        get containedElement() {
          return Polymer.dom(this.$.content).getDistributedNodes()[0];
        },

        /**
         * The element that should be focused when the dropdown opens.
         * @deprecated
         */
        get _focusTarget() {
          return this.focusTarget || this.containedElement;
        },

        ready: function() {
          // Memoized scrolling position, used to block scrolling outside.
          this._scrollTop = 0;
          this._scrollLeft = 0;
          // Used to perform a non-blocking refit on scroll.
          this._refitOnScrollRAF = null;
        },

        detached: function() {
          this.cancelAnimation();
          Polymer.IronDropdownScrollManager.removeScrollLock(this);
        },

        /**
         * Called when the value of `opened` changes.
         * Overridden from `IronOverlayBehavior`
         */
        _openedChanged: function() {
          if (this.opened && this.disabled) {
            this.cancel();
          } else {
            this.cancelAnimation();
            this.sizingTarget = this.containedElement || this.sizingTarget;
            this._updateAnimationConfig();
            this._saveScrollPosition();
            if (this.opened) {
              document.addEventListener('scroll', this._boundOnCaptureScroll);
              !this.allowOutsideScroll && Polymer.IronDropdownScrollManager.pushScrollLock(this);
            } else {
              document.removeEventListener('scroll', this._boundOnCaptureScroll);
              Polymer.IronDropdownScrollManager.removeScrollLock(this);
            }
            Polymer.IronOverlayBehaviorImpl._openedChanged.apply(this, arguments);
          }
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderOpened: function() {
          if (!this.noAnimations && this.animationConfig.open) {
            this.$.contentWrapper.classList.add('animating');
            this.playAnimation('open');
          } else {
            Polymer.IronOverlayBehaviorImpl._renderOpened.apply(this, arguments);
          }
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderClosed: function() {

          if (!this.noAnimations && this.animationConfig.close) {
            this.$.contentWrapper.classList.add('animating');
            this.playAnimation('close');
          } else {
            Polymer.IronOverlayBehaviorImpl._renderClosed.apply(this, arguments);
          }
        },

        /**
         * Called when animation finishes on the dropdown (when opening or
         * closing). Responsible for "completing" the process of opening or
         * closing the dropdown by positioning it or setting its display to
         * none.
         */
        _onNeonAnimationFinish: function() {
          this.$.contentWrapper.classList.remove('animating');
          if (this.opened) {
            this._finishRenderOpened();
          } else {
            this._finishRenderClosed();
          }
        },

        _onCaptureScroll: function() {
          if (!this.allowOutsideScroll) {
            this._restoreScrollPosition();
          } else {
            this._refitOnScrollRAF && window.cancelAnimationFrame(this._refitOnScrollRAF);
            this._refitOnScrollRAF = window.requestAnimationFrame(this.refit.bind(this));
          }
        },

        /**
         * Memoizes the scroll position of the outside scrolling element.
         * @private
         */
        _saveScrollPosition: function() {
          if (document.scrollingElement) {
            this._scrollTop = document.scrollingElement.scrollTop;
            this._scrollLeft = document.scrollingElement.scrollLeft;
          } else {
            // Since we don't know if is the body or html, get max.
            this._scrollTop = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
            this._scrollLeft = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
          }
        },

        /**
         * Resets the scroll position of the outside scrolling element.
         * @private
         */
        _restoreScrollPosition: function() {
          if (document.scrollingElement) {
            document.scrollingElement.scrollTop = this._scrollTop;
            document.scrollingElement.scrollLeft = this._scrollLeft;
          } else {
            // Since we don't know if is the body or html, set both.
            document.documentElement.scrollTop = this._scrollTop;
            document.documentElement.scrollLeft = this._scrollLeft;
            document.body.scrollTop = this._scrollTop;
            document.body.scrollLeft = this._scrollLeft;
          }
        },

        /**
         * Constructs the final animation config from different properties used
         * to configure specific parts of the opening and closing animations.
         */
        _updateAnimationConfig: function() {
          var animations = (this.openAnimationConfig || []).concat(this.closeAnimationConfig || []);
          for (var i = 0; i < animations.length; i++) {
            animations[i].node = this.containedElement;
          }
          this.animationConfig = {
            open: this.openAnimationConfig,
            close: this.closeAnimationConfig
          };
        },

        /**
         * Updates the overlay position based on configured horizontal
         * and vertical alignment.
         */
        _updateOverlayPosition: function() {
          if (this.isAttached) {
            // This triggers iron-resize, and iron-overlay-behavior will call refit if needed.
            this.notifyResize();
          }
        },

        /**
         * Apply focus to focusTarget or containedElement
         */
        _applyFocus: function () {
          var focusTarget = this.focusTarget || this.containedElement;
          if (focusTarget && this.opened && !this.noAutoFocus) {
            focusTarget.focus();
          } else {
            Polymer.IronOverlayBehaviorImpl._applyFocus.apply(this, arguments);
          }
        }
      });
    })();
Polymer({
    is: 'paper-menu-grow-height-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var height = rect.height;

      this._effect = new KeyframeEffect(node, [{
        height: (height / 2) + 'px'
      }, {
        height: height + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-grow-width-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var width = rect.width;

      this._effect = new KeyframeEffect(node, [{
        width: (width / 2) + 'px'
      }, {
        width: width + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-shrink-width-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var width = rect.width;

      this._effect = new KeyframeEffect(node, [{
        width: width + 'px'
      }, {
        width: width - (width / 20) + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-shrink-height-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var height = rect.height;
      var top = rect.top;

      this.setPrefixedProperty(node, 'transformOrigin', '0 0');

      this._effect = new KeyframeEffect(node, [{
        height: height + 'px',
        transform: 'translateY(0)'
      }, {
        height: height / 2 + 'px',
        transform: 'translateY(-20px)'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });
(function() {
      'use strict';

      var config = {
        ANIMATION_CUBIC_BEZIER: 'cubic-bezier(.3,.95,.5,1)',
        MAX_ANIMATION_TIME_MS: 400
      };

      var PaperMenuButton = Polymer({
        is: 'paper-menu-button',

        /**
         * Fired when the dropdown opens.
         *
         * @event paper-dropdown-open
         */

        /**
         * Fired when the dropdown closes.
         *
         * @event paper-dropdown-close
         */

        behaviors: [
          Polymer.IronA11yKeysBehavior,
          Polymer.IronControlState
        ],

        properties: {
          /**
           * True if the content is currently displayed.
           */
          opened: {
            type: Boolean,
            value: false,
            notify: true,
            observer: '_openedChanged'
          },

          /**
           * The orientation against which to align the menu dropdown
           * horizontally relative to the dropdown trigger.
           */
          horizontalAlign: {
            type: String,
            value: 'left',
            reflectToAttribute: true
          },

          /**
           * The orientation against which to align the menu dropdown
           * vertically relative to the dropdown trigger.
           */
          verticalAlign: {
            type: String,
            value: 'top',
            reflectToAttribute: true
          },

          /**
           * If true, the `horizontalAlign` and `verticalAlign` properties will
           * be considered preferences instead of strict requirements when
           * positioning the dropdown and may be changed if doing so reduces
           * the area of the dropdown falling outside of `fitInto`.
           */
          dynamicAlign: {
            type: Boolean
          },

          /**
           * A pixel value that will be added to the position calculated for the
           * given `horizontalAlign`. Use a negative value to offset to the
           * left, or a positive value to offset to the right.
           */
          horizontalOffset: {
            type: Number,
            value: 0,
            notify: true
          },

          /**
           * A pixel value that will be added to the position calculated for the
           * given `verticalAlign`. Use a negative value to offset towards the
           * top, or a positive value to offset towards the bottom.
           */
          verticalOffset: {
            type: Number,
            value: 0,
            notify: true
          },

          /**
           * If true, the dropdown will be positioned so that it doesn't overlap
           * the button.
           */
          noOverlap: {
            type: Boolean
          },

          /**
           * Set to true to disable animations when opening and closing the
           * dropdown.
           */
          noAnimations: {
            type: Boolean,
            value: false
          },

          /**
           * Set to true to disable automatically closing the dropdown after
           * a selection has been made.
           */
          ignoreSelect: {
            type: Boolean,
            value: false
          },

          /**
           * Set to true to enable automatically closing the dropdown after an
           * item has been activated, even if the selection did not change.
           */
          closeOnActivate: {
            type: Boolean,
            value: false
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * opening of the dropdown.
           */
          openAnimationConfig: {
            type: Object,
            value: function() {
              return [{
                name: 'fade-in-animation',
                timing: {
                  delay: 100,
                  duration: 200
                }
              }, {
                name: 'paper-menu-grow-width-animation',
                timing: {
                  delay: 100,
                  duration: 150,
                  easing: config.ANIMATION_CUBIC_BEZIER
                }
              }, {
                name: 'paper-menu-grow-height-animation',
                timing: {
                  delay: 100,
                  duration: 275,
                  easing: config.ANIMATION_CUBIC_BEZIER
                }
              }];
            }
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * closing of the dropdown.
           */
          closeAnimationConfig: {
            type: Object,
            value: function() {
              return [{
                name: 'fade-out-animation',
                timing: {
                  duration: 150
                }
              }, {
                name: 'paper-menu-shrink-width-animation',
                timing: {
                  delay: 100,
                  duration: 50,
                  easing: config.ANIMATION_CUBIC_BEZIER
                }
              }, {
                name: 'paper-menu-shrink-height-animation',
                timing: {
                  duration: 200,
                  easing: 'ease-in'
                }
              }];
            }
          },
          
          /**
           * By default, the dropdown will constrain scrolling on the page
           * to itself when opened.
           * Set to true in order to prevent scroll from being constrained
           * to the dropdown when it opens.
           */
          allowOutsideScroll: {
            type: Boolean,
            value: false
          },

          /**
           * Whether focus should be restored to the button when the menu closes.
           */
          restoreFocusOnClose: {
            type: Boolean,
            value: true
          },

          /**
           * This is the element intended to be bound as the focus target
           * for the `iron-dropdown` contained by `paper-menu-button`.
           */
          _dropdownContent: {
            type: Object
          }
        },

        hostAttributes: {
          role: 'group',
          'aria-haspopup': 'true'
        },

        listeners: {
          'iron-activate': '_onIronActivate',
          'iron-select': '_onIronSelect'
        },

        /**
         * The content element that is contained by the menu button, if any.
         */
        get contentElement() {
          return Polymer.dom(this.$.content).getDistributedNodes()[0];
        },

        /**
         * Toggles the drowpdown content between opened and closed.
         */
        toggle: function() {
          if (this.opened) {
            this.close();
          } else {
            this.open();
          }
        },

        /**
         * Make the dropdown content appear as an overlay positioned relative
         * to the dropdown trigger.
         */
        open: function() {
          if (this.disabled) {
            return;
          }

          this.$.dropdown.open();
        },

        /**
         * Hide the dropdown content.
         */
        close: function() {
          this.$.dropdown.close();
        },

        /**
         * When an `iron-select` event is received, the dropdown should
         * automatically close on the assumption that a value has been chosen.
         *
         * @param {CustomEvent} event A CustomEvent instance with type
         * set to `"iron-select"`.
         */
        _onIronSelect: function(event) {
          if (!this.ignoreSelect) {
            this.close();
          }
        },

        /**
         * Closes the dropdown when an `iron-activate` event is received if
         * `closeOnActivate` is true.
         *
         * @param {CustomEvent} event A CustomEvent of type 'iron-activate'.
         */
        _onIronActivate: function(event) {
          if (this.closeOnActivate) {
            this.close();
          }
        },

        /**
         * When the dropdown opens, the `paper-menu-button` fires `paper-open`.
         * When the dropdown closes, the `paper-menu-button` fires `paper-close`.
         *
         * @param {boolean} opened True if the dropdown is opened, otherwise false.
         * @param {boolean} oldOpened The previous value of `opened`.
         */
        _openedChanged: function(opened, oldOpened) {
          if (opened) {
            // TODO(cdata): Update this when we can measure changes in distributed
            // children in an idiomatic way.
            // We poke this property in case the element has changed. This will
            // cause the focus target for the `iron-dropdown` to be updated as
            // necessary:
            this._dropdownContent = this.contentElement;
            this.fire('paper-dropdown-open');
          } else if (oldOpened != null) {
            this.fire('paper-dropdown-close');
          }
        },

        /**
         * If the dropdown is open when disabled becomes true, close the
         * dropdown.
         *
         * @param {boolean} disabled True if disabled, otherwise false.
         */
        _disabledChanged: function(disabled) {
          Polymer.IronControlState._disabledChanged.apply(this, arguments);
          if (disabled && this.opened) {
            this.close();
          }
        },

        __onIronOverlayCanceled: function(event) {
          var uiEvent = event.detail;
          var target = Polymer.dom(uiEvent).rootTarget;
          var trigger = this.$.trigger;
          var path = Polymer.dom(uiEvent).path;

          if (path.indexOf(trigger) > -1) {
            event.preventDefault();
          }
        }
      });

      Object.keys(config).forEach(function (key) {
        PaperMenuButton[key] = config[key];
      });

      Polymer.PaperMenuButton = PaperMenuButton;
    })();
/** @polymerBehavior Polymer.PaperItemBehavior */
  Polymer.PaperItemBehaviorImpl = {
    hostAttributes: {
      role: 'option',
      tabindex: '0'
    }
  };

  /** @polymerBehavior */
  Polymer.PaperItemBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperItemBehaviorImpl
  ];
Polymer({
      is: 'paper-icon-item',

      behaviors: [
        Polymer.PaperItemBehavior
      ]
    });
Polymer({
      is: 'paper-fab',

      behaviors: [
        Polymer.PaperButtonBehavior
      ],

      properties: {
        /**
         * The URL of an image for the icon. If the src property is specified,
         * the icon property should not be.
         */
        src: {
          type: String,
          value: ''
        },

        /**
         * Specifies the icon name or index in the set of icons available in
         * the icon's icon set. If the icon property is specified,
         * the src property should not be.
         */
        icon: {
          type: String,
          value: ''
        },

        /**
         * Set this to true to style this is a "mini" FAB.
         */
        mini: {
          type: Boolean,
          value: false,
          reflectToAttribute: true
        },

        /**
         * The label displayed in the badge. The label is centered, and ideally
         * should have very few characters.
         */
        label: {
          type: String,
          observer: '_labelChanged'
        }
      },

      _labelChanged: function() {
        this.setAttribute('aria-label', this.label);
      },

      _computeIsIconFab: function(icon, src) {
        return (icon.length > 0) || (src.length > 0);
      }
    });
'use strict';

(function () {
  'use strict';

  Polymer.ShareBehavior = {

    properties: {
      shareMenuSelector: {
        type: String,
        value: '[share-menu]'
      }
    },

    share: function share(e) {
      var type = e.currentTarget.getAttribute('share');
      var url = null;
      var shareUrl = location.href;
      var width = 600;
      var height = 600;
      var winOptions = 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=' + height + ',width=' + width;

      var title = document.title;

      switch (type) {
        case 'facebook':
          height = 229;
          url = 'https://www.facebook.com/sharer.php?u=' + encodeURIComponent(shareUrl) + '&t=' + encodeURIComponent(title);
          window.open(url, 'share', winOptions);
          break;

        case 'gplus':
          height = 348;
          width = 512;
          url = 'https://plus.google.com/share?url=' + encodeURIComponent(shareUrl) + '&hl=' + encodeURIComponent(document.documentElement.lang);
          window.open(url, 'share', winOptions);
          break;

        case 'twitter':
          height = 253;
          var text = 'Check out ' + title + ' at dfua: ' + shareUrl;
          url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
          window.open(url, 'share', winOptions);
          break;

        case 'copy':
          var copyElement = document.createElement('input');
          copyElement.setAttribute('type', 'text');
          copyElement.setAttribute('value', shareUrl);
          copyElement = document.body.appendChild(copyElement);
          copyElement.select();
          document.execCommand('copy');
          copyElement.remove();
          break;

        default:
          return;
      }
      Polymer.dom(this.root).querySelector(this.shareMenuSelector).close();
    }

  };
})();
'use strict';

(function () {
  'use strict';

  Polymer({

    is: 'session-details',

    behaviors: [Polymer.PaperDialogBehavior, Polymer.NeonAnimationRunnerBehavior, Polymer.ShareBehavior, Polymer.UtilsBehavior],

    properties: {
      session: {
        type: Object,
        observer: '_sessionChanged'
      }
    },

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _openVideo: function _openVideo() {
      this.$.videoViewer.open();
    },

    _concatArray: function _concatArray(array) {
      return array ? array.join(', ') : '';
    },

    _sessionChanged: function _sessionChanged() {
      var generatedClass = this._generateClass(this.session.mainTag);
      this.customStyle['--paper-scroll-header-panel-color'] = 'var(--' + generatedClass + ')';
      this._previousBrowserColor = document.getElementsByName('theme-color')[0].content;
      document.getElementsByName('theme-color')[0].content = this.getComputedStyleValue('--' + generatedClass);
      this.updateStyles();
    },

    _renderOpened: function _renderOpened() {
      page.redirect('/' + app.route + '/' + this.session.id);
      if (this.withBackdrop && window.innerWidth > 960) {
        this.backdropElement.open();
      }
      this.playAnimation('entry');
      this.async(function () {
        this.$.scrollHeaderPanel.scrollToTop(true);
        this.$.scrollHeaderPanel.notifyResize();
      });
    },

    _renderClosed: function _renderClosed() {
      page.show('/' + app.route, null, false);
      document.getElementsByName('theme-color')[0].content = this._previousBrowserColor;
      this.backdropElement.close();
      this.playAnimation('exit');
    },

    _onNeonAnimationFinish: function _onNeonAnimationFinish() {
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    }

  });
})();
'use strict';

(function () {
  'use strict';

  Polymer({

    is: 'schedule-page',

    behaviors: [Polymer.NeonSharedElementAnimatableBehavior, Polymer.UtilsBehavior],

    properties: {
      schedule: {
        type: Array,
        observer: '_updateLegend'
      },
      sessions: Object,
      selected: {
        type: Boolean,
        observer: 'updateHeroSettings'
      },
      heroSettings: {
        type: Object,
        notify: true
      },
      sessionId: {
        type: String,
        notify: true
      },
      _entryAnimation: String,
      _exitAnimation: String,
      _selectedDay: {
        type: Number,
        value: 0,
        observer: '_changeDay'
      },
      _heroSettings: {
        type: Object,
        /* jshint ignore:start */
        value: function value() {
          return { "backgroundColor": "#0f9954", "fontColor": "#FFFFFF", "tabBarColor": "#FFFFFF" };
        }
        /* jshint ignore:end */
      },
      _selectedTags: {
        type: Array,
        value: []
      },

      animationConfig: {
        type: Object,
        value: function value() {
          return {
            'entry': [{
              name: 'fade-in-animation',
              animation: 'fade-in-animation',
              node: this,
              timing: {
                delay: 500
              }
            }],
            'exit': [{
              name: 'fade-out-animation',
              animation: 'fade-out-animation',
              node: this
            }]
          };
        }
      }
    },

    observers: ['openSessionDetails(selected, sessionId, sessions)'],

    ready: function ready() {
      this.customStyle['--hero-color'] = this._heroSettings.backgroundColor;
      this.updateStyles();
    },

    updateHeroSettings: function updateHeroSettings() {
      this.heroSettings = this.selected ? this._heroSettings : this.heroSettings;
    },

    openSessionDetails: function openSessionDetails() {
      if (this.selected && this.sessionId) {
        this.async(function () {
          this._selectedSession = this.sessions[this.sessionId];
          this.$.sessionDetails.open();
          this.sessionId = null;
        }, 500);
      }
    },

    _updateLegend: function _updateLegend() {
      this._selectedTags = this.schedule[0].tags;
    },

    _changeDay: function _changeDay(newValue, oldValue) {
      if (window.innerWidth < 961) {
        this._entryAnimation = newValue < oldValue ? 'slide-from-right-animation' : 'slide-from-left-animation';
        this._exitAnimation = newValue < oldValue ? 'slide-left-animation' : 'slide-right-animation';
      } else {
        this._entryAnimation = 'fade-in-animation';
        this._exitAnimation = 'fade-out-animation';
      }
      if (this.schedule) {
        this._selectedTags = this.schedule[newValue].tags;
      }
    },

    _getCustomStyleValue: function _getCustomStyleValue(value) {
      return this.getComputedStyleValue('--' + this._generateClass(value));
    },

    _openSession: function _openSession(e) {
      this._selectedSession = e.model.subSession;
      this.$.sessionDetails.open();
    },

    _getFirstCharacters: function _getFirstCharacters(text) {
      return text ? text.substring(0, 2) : '';
    },

    _filterSession: function _filterSession() {
      var tags = this._selectedTags || [];
      return function (session) {
        return tags.indexOf(session.mainTag) > -1;
      };
    }

  });
})();
Polymer({

    is: 'cascaded-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    properties: {

      /** @type {!Polymer.IronMeta} */
      _animationMeta: {
        type: Object,
        value: function() {
          return new Polymer.IronMeta({type: 'animation'});
        }
      }

    },

    /**
     * @param {{
     *   animation: string,
     *   nodes: !Array<!Element>,
     *   nodeDelay: (number|undefined),
     *   timing: (Object|undefined)
     *  }} config
     */
    configure: function(config) {
      var animationConstructor = /** @type {Function} */ (
          this._animationMeta.byKey(config.animation));
      if (!animationConstructor) {
        console.warn(this.is + ':', 'constructor for', config.animation, 'not found!');
        return;
      }

      this._animations = [];
      var nodes = config.nodes;
      var effects = [];
      var nodeDelay = config.nodeDelay || 50;

      config.timing = config.timing || {};
      config.timing.delay = config.timing.delay || 0;

      var oldDelay = config.timing.delay;
      for (var node, index = 0; node = nodes[index]; index++) {
        config.timing.delay += nodeDelay;
        config.node = node;

        var animation = new animationConstructor();
        var effect = animation.configure(config);

        this._animations.push(animation);
        effects.push(effect);
      }
      config.timing.delay = oldDelay;

      this._effect = new GroupEffect(effects);
      return this._effect;
    },

    complete: function() {
      for (var animation, index = 0; animation = this._animations[index]; index++) {
        animation.complete(animation.config);
      }
    }

  });
/**
   * Use `Polymer.NeonSharedElementAnimationBehavior` to implement shared element animations.
   * @polymerBehavior Polymer.NeonSharedElementAnimationBehavior
   */
  Polymer.NeonSharedElementAnimationBehaviorImpl = {

    properties: {

      /**
       * Cached copy of shared elements.
       */
      sharedElements: {
        type: Object
      }

    },

    /**
     * Finds shared elements based on `config`.
     */
    findSharedElements: function(config) {
      var fromPage = config.fromPage;
      var toPage = config.toPage;
      if (!fromPage || !toPage) {
        console.warn(this.is + ':', !fromPage ? 'fromPage' : 'toPage', 'is undefined!');
        return null;
      };

      if (!fromPage.sharedElements || !toPage.sharedElements) {
        console.warn(this.is + ':', 'sharedElements are undefined for', !fromPage.sharedElements ? fromPage : toPage);
        return null;
      };

      var from = fromPage.sharedElements[config.id]
      var to = toPage.sharedElements[config.id];

      if (!from || !to) {
        console.warn(this.is + ':', 'sharedElement with id', config.id, 'not found in', !from ? fromPage : toPage);
        return null;
      }

      this.sharedElements = {
        from: from,
        to: to
      };
      return this.sharedElements;
    }

  };

  /** @polymerBehavior Polymer.NeonSharedElementAnimationBehavior */
  Polymer.NeonSharedElementAnimationBehavior = [
    Polymer.NeonAnimationBehavior,
    Polymer.NeonSharedElementAnimationBehaviorImpl
  ];
Polymer({

    is: 'hero-animation',

    behaviors: [
      Polymer.NeonSharedElementAnimationBehavior
    ],

    configure: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return;
      }

      var fromRect = shared.from.getBoundingClientRect();
      var toRect = shared.to.getBoundingClientRect();

      var deltaLeft = fromRect.left - toRect.left;
      var deltaTop = fromRect.top - toRect.top;
      var deltaWidth = fromRect.width / toRect.width;
      var deltaHeight = fromRect.height / toRect.height;

      this.setPrefixedProperty(shared.to, 'transformOrigin', '0 0');
      shared.to.style.zIndex = 10000;
      shared.from.style.visibility = 'hidden';

      this._effect = new KeyframeEffect(shared.to, [
        {'transform': 'translate(' + deltaLeft + 'px,' + deltaTop + 'px) scale(' + deltaWidth + ',' + deltaHeight + ')'},
        {'transform': 'none'}
      ], this.timingFromConfig(config));

      return this._effect;
    },

    complete: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return null;
      }
      shared.to.style.zIndex = '';
      shared.from.style.visibility = '';
    }

  });
Polymer({

    is: 'ripple-animation',

    behaviors: [
      Polymer.NeonSharedElementAnimationBehavior
    ],

    configure: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return null;
      }

      var translateX, translateY;
      var toRect = shared.to.getBoundingClientRect();
      if (config.gesture) {
        translateX = config.gesture.x - (toRect.left + (toRect.width / 2));
        translateY = config.gesture.y - (toRect.top + (toRect.height / 2));
      } else {
        var fromRect = shared.from.getBoundingClientRect();
        translateX = (fromRect.left + (fromRect.width / 2)) - (toRect.left + (toRect.width / 2));
        translateY = (fromRect.top + (fromRect.height / 2)) - (toRect.top + (toRect.height / 2));
      }
      var translate = 'translate(' + translateX + 'px,' + translateY + 'px)';

      var size = Math.max(toRect.width + Math.abs(translateX) * 2, toRect.height + Math.abs(translateY) * 2);
      var diameter = Math.sqrt(2 * size * size);
      var scaleX = diameter / toRect.width;
      var scaleY = diameter / toRect.height;
      var scale = 'scale(' + scaleX + ',' + scaleY + ')';

      this.setPrefixedProperty(shared.to, 'transformOrigin', '50% 50%');
      shared.to.style.borderRadius = '50%';

      this._effect = new KeyframeEffect(shared.to, [
        {'transform': translate + ' scale(0)'},
        {'transform': translate + ' ' + scale}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function() {
      if (this.sharedElements) {
        this.setPrefixedProperty(this.sharedElements.to, 'transformOrigin', '');
        this.sharedElements.to.style.borderRadius = '';
      }
    }

  });
Polymer({
    is: 'reverse-ripple-animation',

    behaviors: [
      Polymer.NeonSharedElementAnimationBehavior
    ],

    configure: function(config) {
      var shared = this.findSharedElements(config);
      if (!shared) {
        return null;
      }

      var translateX, translateY;
      var fromRect = shared.from.getBoundingClientRect();
      if (config.gesture) {
        translateX = config.gesture.x - (fromRect.left + (fromRect.width / 2));
        translateY = config.gesture.y - (fromRect.top + (fromRect.height / 2));
      } else {
        var toRect = shared.to.getBoundingClientRect();
        translateX = (toRect.left + (toRect.width / 2)) - (fromRect.left + (fromRect.width / 2));
        translateY = (toRect.top + (toRect.height / 2)) - (fromRect.top + (fromRect.height / 2));
      }
      var translate = 'translate(' + translateX + 'px,' + translateY + 'px)';

      var size = Math.max(fromRect.width + Math.abs(translateX) * 2, fromRect.height + Math.abs(translateY) * 2);
      var diameter = Math.sqrt(2 * size * size);
      var scaleX = diameter / fromRect.width;
      var scaleY = diameter / fromRect.height;
      var scale = 'scale(' + scaleX + ',' + scaleY + ')';

      this.setPrefixedProperty(shared.from, 'transformOrigin', '50% 50%');
      shared.from.style.borderRadius = '50%';

      this._effect = new KeyframeEffect(shared.from, [
        {'transform': translate + ' ' + scale},
        {'transform': translate + ' scale(0)'}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function() {
      if (this.sharedElements) {
        this.setPrefixedProperty(this.sharedElements.from, 'transformOrigin', '');
        this.sharedElements.from.style.borderRadius = '';
      }
    }
  });
Polymer({

    is: 'scale-down-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      }

      var scaleProperty = 'scale(0, 0)';
      if (config.axis === 'x') {
        scaleProperty = 'scale(0, 1)';
      } else if (config.axis === 'y') {
        scaleProperty = 'scale(1, 0)';
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'scale(1,1)'},
        {'transform': scaleProperty}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'scale-up-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      }

      var scaleProperty = 'scale(0)';
      if (config.axis === 'x') {
        scaleProperty = 'scale(0, 1)';
      } else if (config.axis === 'y') {
        scaleProperty = 'scale(1, 0)';
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': scaleProperty},
        {'transform': 'scale(1, 1)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-from-left-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateX(-100%)'},
        {'transform': 'none'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-from-right-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateX(100%)'},
        {'transform': 'none'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-from-top-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '50% 0');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateY(-100%)'},
        {'transform': 'translateY(0%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-from-bottom-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '50% 0');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateY(100%)'},
        {'transform': 'translateY(0)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-left-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'none'},
        {'transform': 'translateX(-100%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-right-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '0 50%');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'none'},
        {'transform': 'translateX(100%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-up-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '50% 0');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translate(0)'},
        {'transform': 'translateY(-100%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'slide-down-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      } else {
        this.setPrefixedProperty(node, 'transformOrigin', '50% 0');
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': 'translateY(0%)'},
        {'transform': 'translateY(100%)'}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
Polymer({

    is: 'transform-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    /**
     * @param {{
     *   node: !Element,
     *   transformOrigin: (string|undefined),
     *   transformFrom: (string|undefined),
     *   transformTo: (string|undefined),
     *   timing: (Object|undefined)
     * }} config
     */
    configure: function(config) {
      var node = config.node;
      var transformFrom = config.transformFrom || 'none';
      var transformTo = config.transformTo || 'none';

      if (config.transformOrigin) {
        this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
      }

      this._effect = new KeyframeEffect(node, [
        {'transform': transformFrom},
        {'transform': transformTo}
      ], this.timingFromConfig(config));

      return this._effect;
    }

  });
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var StatisticsBlock = function () {
    function StatisticsBlock() {
      _classCallCheck(this, StatisticsBlock);
    }

    _createClass(StatisticsBlock, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
      }
    }]);

    return StatisticsBlock;
  }();

  Polymer(StatisticsBlock);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var FeaturedPeople = function () {
    function FeaturedPeople() {
      _classCallCheck(this, FeaturedPeople);
    }

    _createClass(FeaturedPeople, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          people: {
            type: Array,
            observer: '_peopleChanged'
          }
        };
      }
    }, {
      key: '_peopleChanged',
      value: function _peopleChanged() {
        var people = this._toArray(this.people),
            filteredPeople = [];
        for (var i = 0; i < people.length; i++) {
          if (people[i].featured) {
            filteredPeople.push(people[i]);
          }
        }
        this.featuredPeople = this._randomOrder(filteredPeople).slice(0, 4);
      }
    }, {
      key: 'behaviors',
      get: function get() {
        return [Polymer.UtilsBehavior];
      }
    }]);

    return FeaturedPeople;
  }();

  Polymer(FeaturedPeople);
})();
Polymer({
      is: 'paper-card',

      properties: {
        /**
         * The title of the card.
         */
        heading: {
          type: String,
          value: '',
          observer: '_headingChanged'
        },

        /**
         * The url of the title image of the card.
         */
        image: {
          type: String,
          value: ''
        },

        /**
         * The text alternative of the card's title image.
         */
        alt: {
          type: String
        },

        /**
         * When `true`, any change to the image url property will cause the
         * `placeholder` image to be shown until the image is fully rendered.
         */
        preloadImage: {
          type: Boolean,
          value: false
        },

        /**
         * When `preloadImage` is true, setting `fadeImage` to true will cause the
         * image to fade into place.
         */
        fadeImage: {
          type: Boolean,
          value: false
        },

        /**
         * This image will be used as a background/placeholder until the src image has
         * loaded. Use of a data-URI for placeholder is encouraged for instant rendering.
         */
        placeholderImage: {
          type: String,
          value: null
        },

        /**
         * The z-depth of the card, from 0-5.
         */
        elevation: {
          type: Number,
          value: 1,
          reflectToAttribute: true
        },

        /**
         * Set this to true to animate the card shadow when setting a new
         * `z` value.
         */
        animatedShadow: {
          type: Boolean,
          value: false
        },

        /**
         * Read-only property used to pass down the `animatedShadow` value to
         * the underlying paper-material style (since they have different names).
         */
        animated: {
          type: Boolean,
          reflectToAttribute: true,
          readOnly: true,
          computed: '_computeAnimated(animatedShadow)'
        }
      },

      _headingChanged: function(heading) {
        var label = this.getAttribute('aria-label');
        this.setAttribute('aria-label', heading);
      },

      _computeHeadingClass: function(image) {
        var cls = 'title-text';
        if (image)
          cls += ' over-image';
        return cls;
      },

      _computeAnimated: function(animatedShadow) {
        return animatedShadow;
      }
    });
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var FeaturedVideos = function () {
    function FeaturedVideos() {
      _classCallCheck(this, FeaturedVideos);
    }

    _createClass(FeaturedVideos, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          videos: {
            type: Array,
            observer: '_videosChanged'
          },
          _videos: Array,
          _selectedVideo: Object
        };
      }
    }, {
      key: '_videosChanged',
      value: function _videosChanged() {
        this._videos = this._randomOrder(this.videos).slice(0, 6);
      }
    }, {
      key: '_playVideo',
      value: function _playVideo(e) {
        this._selectedVideo = {
          title: e.model.video.title + ' by ' + e.model.video.speakers,
          youtubeId: e.model.video.youtubeId
        };
        this.$.videoViewer.open();
      }
    }, {
      key: 'shiftContentLeft',
      value: function shiftContentLeft() {
        var transform = this.$.videos.style.transform;
        var videos = Polymer.dom(this.root).querySelectorAll('.video-item');

        var lastX = transform ? parseInt(transform.split('(')[1].split(',')[0]) : 0;

        var cardRect = videos[videos.length - 1].getBoundingClientRect();
        var cardWidth = cardRect.width;

        var newX = lastX + cardWidth;
        if (newX < cardWidth) {
          this.$.videos.style.transform = 'translate3d(' + newX + 'px, 0, 0)';
        }
      }
    }, {
      key: 'shiftContentRight',
      value: function shiftContentRight() {
        var transform = this.$.videos.style.transform;
        var videos = Polymer.dom(this.root).querySelectorAll('.video-item');

        var lastX = transform ? parseInt(transform.split('(')[1].split(',')[0]) : 0;

        var containerWidth = this.$.videos.getBoundingClientRect().width;
        var cardRect = videos[videos.length - 1].getBoundingClientRect();
        var lastCardLeft = cardRect.left;
        var cardWidth = cardRect.width;

        var newX = lastX - cardWidth;
        if (lastCardLeft > containerWidth) {
          this.$.videos.style.transform = 'translate3d(' + newX + 'px, 0, 0)';
        }
      }
    }, {
      key: 'behaviors',
      get: function get() {
        return [Polymer.UtilsBehavior];
      }
    }]);

    return FeaturedVideos;
  }();

  Polymer(FeaturedVideos);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var CallToAction = function () {
    function CallToAction() {
      _classCallCheck(this, CallToAction);
    }

    _createClass(CallToAction, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
      }
    }, {
      key: 'playVideo',
      value: function playVideo() {
        this.fire('iron-signal', {
          name: 'track-event',
          data: {
            category: 'button',
            action: 'click',
            label: 'play-2014-video',
            value: 1
          }
        });
        this.$.videoDialog.open();
      }
    }]);

    return CallToAction;
  }();

  Polymer(CallToAction);
})();
(function() {

  Polymer({

    is: 'paper-dialog',

    behaviors: [
      Polymer.PaperDialogBehavior,
      Polymer.NeonAnimationRunnerBehavior
    ],

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _renderOpened: function() {
      this.cancelAnimation();
      this.playAnimation('entry');
    },

    _renderClosed: function() {
      this.cancelAnimation();
      this.playAnimation('exit');
    },

    _onNeonAnimationFinish: function() {
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    }

  });

})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
    'use strict';

    var TicketsBlock = function () {
        function TicketsBlock() {
            _classCallCheck(this, TicketsBlock);
        }

        _createClass(TicketsBlock, [{
            key: 'beforeRegister',
            value: function beforeRegister() {
                this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
            }
        }, {
            key: 'openTicketsDialog',
            value: function openTicketsDialog() {
                this.fire('iron-signal', {
                    name: 'track-event',
                    data: {
                        category: 'button',
                        action: 'click',
                        label: 'group',
                        value: 'buy-a-ticket'
                    }
                });
                this.$.ticketsDialog.open();
            }
        }]);

        return TicketsBlock;
    }();

    Polymer(TicketsBlock);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var LatestPosts = function () {
    function LatestPosts() {
      _classCallCheck(this, LatestPosts);
    }

    _createClass(LatestPosts, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          posts: {
            type: Array,
            observer: '_postsChanged'
          },
          _posts: Array
        };
      }
    }, {
      key: '_postsChanged',
      value: function _postsChanged() {
        var temp = this.posts.slice(0, 2);
        for (var i = 0, len = temp.length; i < len; i++) {
          temp[i].url = '/blog/' + temp[i].id;
          temp[i].dataRoute = 'blog/' + temp[i].id;
        }
        this._posts = temp;
      }
    }]);

    return LatestPosts;
  }();

  Polymer(LatestPosts);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var PhotoBlock = function () {
    function PhotoBlock() {
      _classCallCheck(this, PhotoBlock);
    }

    _createClass(PhotoBlock, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          photos: Object
        };
      }
    }]);

    return PhotoBlock;
  }();

  Polymer(PhotoBlock);
})();
(function() {
  'use strict';

  // Shout out to https://github.com/basecamp/local_time/blob/master/app/assets/javascripts/local_time.js.coffee
  var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function pad(num) {
    return ('0' + num).slice(-2);
  }

  function strftime(time, formatString) {
    var day = time.getDay();
    var date = time.getDate();
    var month = time.getMonth();
    var year = time.getFullYear();
    var hour = time.getHours();
    var minute = time.getMinutes();
    var second = time.getSeconds();
    return formatString.replace(/%([%aAbBcdeHIlmMpPSwyYZz])/g, function(_arg) {
      var match;
      var modifier = _arg[1];
      switch (modifier) {
        case '%':
          return '%';
        case 'a':
          return weekdays[day].slice(0, 3);
        case 'A':
          return weekdays[day];
        case 'b':
          return months[month].slice(0, 3);
        case 'B':
          return months[month];
        case 'c':
          return time.toString();
        case 'd':
          return pad(date);
        case 'e':
          return date;
        case 'H':
          return pad(hour);
        case 'I':
          return pad(strftime(time, '%l'));
        case 'l':
          if (hour === 0 || hour === 12) {
            return 12;
          } else {
            return (hour + 12) % 12;
          }
          break;
        case 'm':
          return pad(month + 1);
        case 'M':
          return pad(minute);
        case 'p':
          if (hour > 11) {
            return 'PM';
          } else {
            return 'AM';
          }
          break;
        case 'P':
          if (hour > 11) {
            return 'pm';
          } else {
            return 'am';
          }
          break;
        case 'S':
          return pad(second);
        case 'w':
          return day;
        case 'y':
          return pad(year % 100);
        case 'Y':
          return year;
        case 'Z':
          match = time.toString().match(/\((\w+)\)$/);
          return match ? match[1] : '';
        case 'z':
          match = time.toString().match(/\w([+-]\d\d\d\d) /);
          return match ? match[1] : '';
      }
    });
  }

  function RelativeTime(date) {
    this.date = date;
  }

  RelativeTime.prototype.toString = function() {
    var ago = this.timeElapsed();
    if (ago) {
      return ago;
    } else {
      return 'on ' + this.formatDate();
    }
  };

  RelativeTime.prototype.timeElapsed = function() {
    var ms = new Date().getTime() - this.date.getTime();
    var sec = Math.round(ms / 1000);
    var min = Math.round(sec / 60);
    var hr = Math.round(min / 60);
    var day = Math.round(hr / 24);
    if (ms < 0) {
      return 'just now';
    } else if (sec < 10) {
      return 'just now';
    } else if (sec < 45) {
      return sec + ' seconds ago';
    } else if (sec < 90) {
      return 'a minute ago';
    } else if (min < 45) {
      return min + ' minutes ago';
    } else if (min < 90) {
      return 'an hour ago';
    } else if (hr < 24) {
      return hr + ' hours ago';
    } else if (hr < 36) {
      return 'a day ago';
    } else if (day < 30) {
      return day + ' days ago';
    } else {
      return null;
    }
  };

  RelativeTime.prototype.timeAgo = function() {
    var ms = new Date().getTime() - this.date.getTime();
    var sec = Math.round(ms / 1000);
    var min = Math.round(sec / 60);
    var hr = Math.round(min / 60);
    var day = Math.round(hr / 24);
    var month = Math.round(day / 30);
    var year = Math.round(month / 12);
    if (ms < 0) {
      return 'just now';
    } else if (sec < 10) {
      return 'just now';
    } else if (sec < 45) {
      return sec + ' seconds ago';
    } else if (sec < 90) {
      return 'a minute ago';
    } else if (min < 45) {
      return min + ' minutes ago';
    } else if (min < 90) {
      return 'an hour ago';
    } else if (hr < 24) {
      return hr + ' hours ago';
    } else if (hr < 36) {
      return 'a day ago';
    } else if (day < 30) {
      return day + ' days ago';
    } else if (day < 45) {
      return 'a month ago';
    } else if (month < 12) {
      return month + ' months ago';
    } else if (month < 18) {
        return 'a year ago';
    } else {
      return year + ' years ago';
    }
  };

  RelativeTime.prototype.microTimeAgo = function() {
    var ms = new Date().getTime() - this.date.getTime();
    var sec = ms / 1000;
    var min = sec / 60;
    var hr = min / 60;
    var day = hr / 24;
    var month = day / 30;
    var year = month / 12;
    if (min < 1) {
      return '1m';
    } else if (min < 60) {
      return Math.round(min) + 'm';
    } else if (hr < 24) {
      return Math.round(hr) + 'h';
    } else if (day < 365) {
      return Math.round(day) + 'd';
    } else {
      return Math.round(year) + 'y';
    }
  };

  // Private: Determine if the day should be formatted before the month name in
  // the user's current locale. For example, `9 Jun` for en-GB and `Jun 9`
  // for en-US.
  //
  // Returns true if the day appears before the month.
  function isDayFirst() {
    if (dayFirst !== null) {
      return dayFirst;
    }

    if (!('Intl' in window)) {
      return false;
    }

    var options = {day: 'numeric', month: 'short'};
    var formatter = new window.Intl.DateTimeFormat(undefined, options);
    var output = formatter.format(new Date(0));

    dayFirst = !!output.match(/^\d/);
    return dayFirst;
  }
  var dayFirst = null;

  // Private: Determine if the year should be separated from the month and day
  // with a comma. For example, `9 Jun 2014` in en-GB and `Jun 9, 2014` in en-US.
  //
  // Returns true if the date needs a separator.
  function isYearSeparator() {
    if (yearSeparator !== null) {
      return yearSeparator;
    }

    if (!('Intl' in window)) {
      return true;
    }

    var options = {day: 'numeric', month: 'short', year: 'numeric'};
    var formatter = new window.Intl.DateTimeFormat(undefined, options);
    var output = formatter.format(new Date(0));

    yearSeparator = !!output.match(/\d,/);
    return yearSeparator;
  }
  var yearSeparator = null;

  // Private: Determine if the date occurs in the same year as today's date.
  //
  // date - The Date to test.
  //
  // Returns true if it's this year.
  function isThisYear(date) {
    var now = new Date();
    return now.getUTCFullYear() === date.getUTCFullYear();
  }

  RelativeTime.prototype.formatDate = function() {
    var format = isDayFirst() ? '%e %b' : '%b %e';
    if (!isThisYear(this.date)) {
      format += isYearSeparator() ? ', %Y': ' %Y';
    }
    return strftime(this.date, format);
  };

  RelativeTime.prototype.formatTime = function() {
    if ('Intl' in window) {
      var formatter = new window.Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});
      return formatter.format(this.date);
    } else {
      return strftime(this.date, '%l:%M%P');
    }
  };


  // Internal: Array tracking all elements attached to the document that need
  // to be updated every minute.
  var nowElements = [];

  // Internal: Timer ID for `updateNowElements` interval.
  var updateNowElementsId;

  // Internal: Install a timer to refresh all attached relative-time elements every
  // minute.
  function updateNowElements() {
    var time, i, len;
    for (i = 0, len = nowElements.length; i < len; i++) {
      time = nowElements[i];
      time.textContent = time.getFormattedDate();
    }
  }


  var ExtendedTimePrototype;
  if ('HTMLTimeElement' in window) {
    ExtendedTimePrototype = Object.create(window.HTMLTimeElement.prototype);
  } else {
    ExtendedTimePrototype = Object.create(window.HTMLElement.prototype);
  }

  // Internal: Refresh the time element's formatted date when an attribute changes.
  //
  // Returns nothing.
  ExtendedTimePrototype.attributeChangedCallback = function(attrName, oldValue, newValue) {
    if (attrName === 'datetime') {
      var millis = Date.parse(newValue);
      this._date = isNaN(millis) ? null : new Date(millis);
    }

    var title = this.getFormattedTitle();
    if (title) {
      this.setAttribute('title', title);
    }

    var text = this.getFormattedDate();
    if (text) {
      this.textContent = text;
    }
  };

  // Internal: Format the ISO 8601 timestamp according to the user agent's
  // locale-aware formatting rules. The element's existing `title` attribute
  // value takes precedence over this custom format.
  //
  // Returns a formatted time String.
  ExtendedTimePrototype.getFormattedTitle = function() {
    if (!this._date) {
      return;
    }

    if (this.hasAttribute('title')) {
      return this.getAttribute('title');
    }

    if ('Intl' in window) {
      var options = {day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'};
      var formatter = new window.Intl.DateTimeFormat(undefined, options);
      return formatter.format(this._date);
    }

    return this._date.toLocaleString();
  };


  var RelativeTimePrototype = Object.create(ExtendedTimePrototype);

  RelativeTimePrototype.createdCallback = function() {
    var value = this.getAttribute('datetime');
    if (value) {
      this.attributeChangedCallback('datetime', null, value);
    }
  };

  RelativeTimePrototype.getFormattedDate = function() {
    if (this._date) {
      return new RelativeTime(this._date).toString();
    }
  };

  RelativeTimePrototype.attachedCallback = function() {
    nowElements.push(this);

    if (!updateNowElementsId) {
      updateNowElements();
      updateNowElementsId = setInterval(updateNowElements, 60 * 1000);
    }
  };

  RelativeTimePrototype.detachedCallback = function() {
    var ix = nowElements.indexOf(this);
    if (ix !== -1) {
      nowElements.splice(ix, 1);
    }

    if (!nowElements.length) {
      if (updateNowElementsId) {
        clearInterval(updateNowElementsId);
        updateNowElementsId = null;
      }
    }
  };

  var TimeAgoPrototype = Object.create(RelativeTimePrototype);
  TimeAgoPrototype.getFormattedDate = function() {
    if (this._date) {
      var format = this.getAttribute('format');
      if (format === 'micro') {
        return new RelativeTime(this._date).microTimeAgo();
      } else {
        return new RelativeTime(this._date).timeAgo();
      }
    }
  };


  var LocalTimePrototype = Object.create(ExtendedTimePrototype);

  LocalTimePrototype.createdCallback = function() {
    var value;
    if (value = this.getAttribute('datetime')) {
      this.attributeChangedCallback('datetime', null, value);
    }
    if (value = this.getAttribute('format')) {
      this.attributeChangedCallback('format', null, value);
    }
  };

  // Formats the element's date, in the user's current locale, according to
  // the formatting attribute values. Values are not passed straight through to
  // an Intl.DateTimeFormat instance so that weekday and month names are always
  // displayed in English, for now.
  //
  // Supported attributes are:
  //
  //   weekday - "short", "long"
  //   year    - "numeric", "2-digit"
  //   month   - "short", "long"
  //   day     - "numeric", "2-digit"
  //   hour    - "numeric", "2-digit"
  //   minute  - "numeric", "2-digit"
  //   second  - "numeric", "2-digit"
  //
  // Returns a formatted time String.
  LocalTimePrototype.getFormattedDate = function() {
    if (!this._date) {
      return;
    }

    var date = formatDate(this) || '';
    var time = formatTime(this) || '';
    return (date + ' ' + time).trim();
  };

  // Private: Format a date according to the `weekday`, `day`, `month`,
  // and `year` attribute values.
  //
  // This doesn't use Intl.DateTimeFormat to avoid creating text in the user's
  // language when the majority of the surrounding text is in English. There's
  // currently no way to separate the language from the format in Intl.
  //
  // el - The local-time element to format.
  //
  // Returns a date String or null if no date formats are provided.
  function formatDate(el) {
    // map attribute values to strftime
    var props = {
      weekday: {
        'short': '%a',
        'long': '%A'
      },
      day: {
        'numeric': '%e',
        '2-digit': '%d'
      },
      month: {
        'short': '%b',
        'long': '%B'
      },
      year: {
        'numeric': '%Y',
        '2-digit': '%y'
      }
    };

    // build a strftime format string
    var format = isDayFirst() ? 'weekday day month year' : 'weekday month day, year';
    for (var prop in props) {
      var value = props[prop][el.getAttribute(prop)];
      format = format.replace(prop, value || '');
    }

    // clean up year separator comma
    format = format.replace(/(\s,)|(,\s$)/, '');

    // squeeze spaces from final string
    return strftime(el._date, format).replace(/\s+/, ' ').trim();
  }

  // Private: Format a time according to the `hour`, `minute`, and `second`
  // attribute values.
  //
  // el - The local-time element to format.
  //
  // Returns a time String or null if no time formats are provided.
  function formatTime(el) {
    // retrieve format settings from attributes
    var options = {
      hour: el.getAttribute('hour'),
      minute: el.getAttribute('minute'),
      second: el.getAttribute('second')
    };

    // remove unset format attributes
    for (var opt in options) {
      if (!options[opt]) {
        delete options[opt];
      }
    }

    // no time format attributes provided
    if (Object.keys(options).length === 0) {
      return;
    }

    // locale-aware formatting of 24 or 12 hour times
    if ('Intl' in window) {
      var formatter = new window.Intl.DateTimeFormat(undefined, options);
      return formatter.format(el._date);
    }

    // fall back to strftime for non-Intl browsers
    var timef = options.second ? '%H:%M:%S' : '%H:%M';
    return strftime(el._date, timef);
  }

  // Public: RelativeTimeElement constructor.
  //
  //   var time = new RelativeTimeElement()
  //   # => <time is='relative-time'></time>
  //
  window.RelativeTimeElement = document.registerElement('relative-time', {
    prototype: RelativeTimePrototype,
    'extends': 'time'
  });

  window.TimeAgoElement = document.registerElement('time-ago', {
    prototype: TimeAgoPrototype,
    'extends': 'time'
  });

  // Public: LocalTimeElement constructor.
  //
  //   var time = new LocalTimeElement()
  //   # => <time is='local-time'></time>
  //
  window.LocalTimeElement = document.registerElement('local-time', {
    prototype: LocalTimePrototype,
    'extends': 'time'
  });

})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var SocialPost = function () {
    function SocialPost() {
      _classCallCheck(this, SocialPost);
    }

    _createClass(SocialPost, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          author: {
            type: String,
            value: 'GDG Foz/Curitiba/Pato Branco/Franscisco Beltrão/Dois Vizinhos/Maringá'
          },
          url: String,
          text: {
            type: String,
            observer: '_textChanged',
            value: 'Post about your experience at GDG DevFest Paraná 2016'
          },
          when: Date,
          canonicalUrl: String,
          sign: String
        };
      }
    }, {
      key: '_textChanged',
      value: function _textChanged() {
        this.$.postContent.innerHTML = this.text;
        this.updateStyles();
      }
    }]);

    return SocialPost;
  }();

  Polymer(SocialPost);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var SocialFeed = function () {
    function SocialFeed() {
      _classCallCheck(this, SocialFeed);
    }

    _createClass(SocialFeed, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          source: String,
          interval: {
            type: Number,
            value: 10000
          },
          _posts: {
            type: Array,
            observer: '_postsChanged'
          },
          _selected: {
            type: Number,
            value: -1
          }
        };
      }
    }, {
      key: '_postsChanged',
      value: function _postsChanged() {
        var index = this._selected;
        if (this._posts) {
          this._selected = ++index % this._posts.length;

          /* jshint ignore:start */
          this.author = this._posts[this._selected].user.screen_name;
          this.when = this._posts[this._selected].created_at;
          /* jshint ignore:end */
          this.text = this._linkifyPost(this._posts[this._selected].text);

          this.async(this._postsChanged, this.interval);
        }
      }
    }, {
      key: '_linkifyPost',
      value: function _linkifyPost(value) {
        var replacedText = void 0,
            links1 = void 0,
            links2 = void 0,
            hashtags = void 0,
            profileLinks = void 0;
        links1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        replacedText = value.replace(links1, '<a class="post-link" href="$1" target="_blank">$1</a>');
        links2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        replacedText = replacedText.replace(links2, '$1<a class="post-link" href="http://$2" target="_blank">$2</a>');
        hashtags = /#(\S*)/g;
        replacedText = replacedText.replace(hashtags, '<a class="post-link" href="https://twitter.com/search?q=%23$1" target="_blank">#$1</a>');
        profileLinks = /\B@([\w-]+)/gm;
        replacedText = replacedText.replace(profileLinks, '<a class="post-link" href="https://twitter.com/$1" target="_blank">@$1</a>');
        return replacedText;
      }
    }]);

    return SocialFeed;
  }();

  Polymer(SocialFeed);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var LogosBlock = function () {
    function LogosBlock() {
      _classCallCheck(this, LogosBlock);
    }

    _createClass(LogosBlock, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        var is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.is = is;
        this.properties = {
          logos: Array
        };
      }
    }]);

    return LogosBlock;
  }();

  Polymer(LogosBlock);
})();
Polymer({
      is: 'paper-item-body'
    });
Polymer({

    is: 'google-maps-api',

    behaviors: [
      Polymer.IronJsonpLibraryBehavior
    ],

    properties: {

      /** @private */
      mapsUrl: {
        type: String,
        value: 'https://maps.googleapis.com/maps/api/js?callback=%%callback%%'
      },

      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: {
        type: String,
        value: ''
      },

      /**
       * A Maps API for Business Client ID. To obtain a Maps API for Business Client ID, see developers.google.com/maps/documentation/business/.
       * If set, a Client ID will take precedence over an API Key.
       */
      clientId: {
        type: String,
        value: ''
      },

      /**
       * Version of the Maps API to use.
       */
      version: {
        type: String,
        value: '3.exp'
      },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String,
        value: ''
      },
      /**
       * If true, sign-in is enabled.
       * See https://developers.google.com/maps/documentation/javascript/signedin#enable_sign_in
       */
      signedIn: {
        type: Boolean,
        value: false
      },

      /**
       * Fired when the Maps API library is loaded and ready.
       * @event api-load
       */
      /**
       * Name of event fired when library is loaded and available.
       */
      notifyEvent: {
        type: String,
        value: 'api-load'
      },

      /** @private */
      libraryUrl: {
        type: String,
        computed: '_computeUrl(mapsUrl, version, apiKey, clientId, language, signedIn)'
      }
    },

    _computeUrl: function(mapsUrl, version, apiKey, clientId, language, signedIn) {
      var url = mapsUrl + '&v=' + version;

      // Always load all Maps API libraries.
      url += '&libraries=drawing,geometry,places,visualization';

      if (apiKey && !clientId) {
        url += '&key=' + apiKey;
      }

      if (clientId) {
        url += '&client=' + clientId;
      }

      // Log a warning if the user is not using an API Key or Client ID.
      if (!apiKey && !clientId) {
        var warning = 'No Google Maps API Key or Client ID specified. ' +
            'See https://developers.google.com/maps/documentation/javascript/get-api-key ' +
            'for instructions to get started with a key or client id.';
        console.warn(warning);
      }

      if (language) {
        url += '&language=' + language;
      }

      if (signedIn) {
        url += '&signed_in=' + signedIn;
      }
      return url;
    },

    /**
     * Provides the google.maps JS API namespace.
     */
    get api() {
      return google.maps;
    }
  });
(function() {

  function setupDragHandler_() {
    if (this.draggable) {
      this.dragHandler_ = google.maps.event.addListener(
          this.marker, 'dragend', onDragEnd_.bind(this));
    } else {
      google.maps.event.removeListener(this.dragHandler_);
      this.dragHandler_ = null;
    }
  }

  function onDragEnd_(e, details, sender) {
    this.latitude = e.latLng.lat();
    this.longitude = e.latLng.lng();
  }

  Polymer({

    is: 'google-map-marker',

    /**
     * Fired when the marker icon was clicked. Requires the clickEvents attribute to be true.
     * @param {google.maps.MouseEvent} event The mouse event.
     * @event google-map-marker-click
     */

    /**
     * Fired when the marker icon was double clicked. Requires the clickEvents attribute to be true.
     * @param {google.maps.MouseEvent} event The mouse event.
     * @event google-map-marker-dblclick
     */

    /**
     * Fired repeatedly while the user drags the marker. Requires the dragEvents attribute to be true.
     * @event google-map-marker-drag
     */

    /**
     * Fired when the user stops dragging the marker. Requires the dragEvents attribute to be true.
     * @event google-map-marker-dragend
     */

    /**
     * Fired when the user starts dragging the marker. Requires the dragEvents attribute to be true.
     * @event google-map-marker-dragstart
     */

    /**
     * Fired for a mousedown on the marker. Requires the mouseEvents attribute to be true.
     * @event google-map-marker-mousedown
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the DOM `mousemove` event is fired on the marker. Requires the mouseEvents
     * attribute to be true.
     * @event google-map-marker-mousemove
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the mouse leaves the area of the marker icon. Requires the mouseEvents attribute to be
     * true.
     * @event google-map-marker-mouseout
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when the mouse enters the area of the marker icon. Requires the mouseEvents attribute to be
     * true.
     * @event google-map-marker-mouseover
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired for a mouseup on the marker. Requires the mouseEvents attribute to be true.
     *
     * @event google-map-marker-mouseup
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired for a rightclick on the marker. Requires the clickEvents attribute to be true.
     * @event google-map-marker-rightclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Fired when an infowindow is opened.
     * @event google-map-marker-open
     */

    /**
     * Fired when the close button of the infowindow is pressed.
     * @event google-map-marker-close
     */

    properties: {
      /**
       * A Google Maps marker object.
       * @type google.maps.Marker
       */
      marker: {
        type: Object,
        notify: true
      },

      /**
       * The Google map object.
       * @type google.maps.Map
       */
      map: {
        type: Object,
        observer: '_mapChanged'
      },

      /**
       * A Google Map Infowindow object.
       * @type {?Object}
       */
      info: {
        type: Object,
        value: null
      },

      /**
       * When true, marker *click events are automatically registered.
       */
      clickEvents: {
        type: Boolean,
        value: false,
        observer: '_clickEventsChanged'
      },

      /**
       * When true, marker drag* events are automatically registered.
       */
      dragEvents: {
        type: Boolean,
        value: false,
        observer: '_dragEventsChanged'
      },

      /**
       * Image URL for the marker icon.
       * @type string|google.maps.Icon|google.maps.Symbol
       */
      icon: {
        type: Object,
        value: null,
        observer: '_iconChanged'
      },

      /**
       * When true, marker mouse* events are automatically registered.
       */
      mouseEvents: {
        type: Boolean,
        value: false,
        observer: '_mouseEventsChanged'
      },

      /**
       * Z-index for the marker icon.
       */
      zIndex: {
        type: Number,
        value: 0,
        observer: '_zIndexChanged'
      },

      /**
       * The marker's longitude coordinate.
       */
      longitude: {
        type: Number,
        value: null,
        notify: true
      },

      /**
       * The marker's latitude coordinate.
       */
      latitude: {
        type: Number,
        value: null,
        notify: true
      },

      /**
       * A animation for the marker. "DROP" or "BOUNCE". See
       * https://developers.google.com/maps/documentation/javascript/examples/marker-animations.
       */
      animation: {
        type: String,
        value: null,
        observer: '_animationChanged'
      },

      /**
       * Specifies whether the InfoWindow is open or not
       */
      open: {
        type: Boolean,
        value: false,
        observer: '_openChanged'
      }
    },

    observers: [
      '_updatePosition(latitude, longitude)'
    ],

    detached: function() {
      if (this.marker) {
        google.maps.event.clearInstanceListeners(this.marker);
        this._listeners = {};
        this.marker.setMap(null);
      }
      if (this._contentObserver)
        this._contentObserver.disconnect();
    },

    attached: function() {
      // If element is added back to DOM, put it back on the map.
      if (this.marker) {
        this.marker.setMap(this.map);
      }
    },

    _updatePosition: function() {
      if (this.marker && this.latitude != null && this.longitude != null) {
        this.marker.setPosition(new google.maps.LatLng(
          parseFloat(this.latitude), parseFloat(this.longitude)));
      }
    },

    _clickEventsChanged: function() {
      if (this.map) {
        if (this.clickEvents) {
          this._forwardEvent('click');
          this._forwardEvent('dblclick');
          this._forwardEvent('rightclick');
        } else {
          this._clearListener('click');
          this._clearListener('dblclick');
          this._clearListener('rightclick');
        }
      }
    },

    _dragEventsChanged: function() {
      if (this.map) {
        if (this.dragEvents) {
          this._forwardEvent('drag');
          this._forwardEvent('dragend');
          this._forwardEvent('dragstart');
        } else {
          this._clearListener('drag');
          this._clearListener('dragend');
          this._clearListener('dragstart');
        }
      }
    },

    _mouseEventsChanged: function() {
      if (this.map) {
        if (this.mouseEvents) {
          this._forwardEvent('mousedown');
          this._forwardEvent('mousemove');
          this._forwardEvent('mouseout');
          this._forwardEvent('mouseover');
          this._forwardEvent('mouseup');
        } else {
          this._clearListener('mousedown');
          this._clearListener('mousemove');
          this._clearListener('mouseout');
          this._clearListener('mouseover');
          this._clearListener('mouseup');
        }
      }
    },

    _animationChanged: function() {
      if (this.marker) {
        this.marker.setAnimation(google.maps.Animation[this.animation]);
      }
    },

    _iconChanged: function() {
      if (this.marker) {
        this.marker.setIcon(this.icon);
      }
    },

    _zIndexChanged: function() {
      if (this.marker) {
        this.marker.setZIndex(this.zIndex);
      }
    },

    _mapChanged: function() {
      // Marker will be rebuilt, so disconnect existing one from old map and listeners.
      if (this.marker) {
        this.marker.setMap(null);
        google.maps.event.clearInstanceListeners(this.marker);
      }

      if (this.map && this.map instanceof google.maps.Map) {
        this._mapReady();
      }
    },

    _contentChanged: function() {
      if (this._contentObserver)
        this._contentObserver.disconnect();
      // Watch for future updates.
      this._contentObserver = new MutationObserver( this._contentChanged.bind(this));
      this._contentObserver.observe( this, {
        childList: true,
        subtree: true
      });

      var content = this.innerHTML.trim();
      if (content) {
        if (!this.info) {
          // Create a new infowindow
          this.info = new google.maps.InfoWindow();
          this.openInfoHandler_ = google.maps.event.addListener(this.marker, 'click', function() {
            this.open = true;
          }.bind(this));

          this.closeInfoHandler_ = google.maps.event.addListener(this.info, 'closeclick', function() {
            this.open = false;
          }.bind(this));
        }
        this.info.setContent(content);
      } else {
        if (this.info) {
          // Destroy the existing infowindow.  It doesn't make sense to have an empty one.
          google.maps.event.removeListener(this.openInfoHandler_);
          google.maps.event.removeListener(this.closeInfoHandler_);
          this.info = null;
        }
      }
    },

    _openChanged: function() {
      if (this.info) {
        if (this.open) {
          this.info.open(this.map, this.marker);
          this.fire('google-map-marker-open');
        } else {
          this.info.close();
          this.fire('google-map-marker-close');
        }
      }
    },

    _mapReady: function() {
      this._listeners = {};
      this.marker = new google.maps.Marker({
        map: this.map,
        position: {
          lat: parseFloat(this.latitude),
          lng: parseFloat(this.longitude)
        },
        title: this.title,
        animation: google.maps.Animation[this.animation],
        draggable: this.draggable,
        visible: !this.hidden,
        icon: this.icon,
        zIndex: this.zIndex
      });
      this._contentChanged();
      this._clickEventsChanged();
      this._dragEventsChanged();
      this._mouseEventsChanged();
      this._openChanged();
      setupDragHandler_.bind(this)();
    },

    _clearListener: function(name) {
      if (this._listeners[name]) {
        google.maps.event.removeListener(this._listeners[name]);
        this._listeners[name] = null;
      }
    },

    _forwardEvent: function(name) {
      this._listeners[name] = google.maps.event.addListener(this.marker, name, function(event) {
        this.fire('google-map-marker-' + name, event);
      }.bind(this));
    },

    attributeChanged: function(attrName) {
      if (!this.marker) {
        return;
      }

      // Cannot use *Changed watchers for native properties.
      switch (attrName) {
        case 'hidden':
          this.marker.setVisible(!this.hidden);
          break;
        case 'draggable':
          this.marker.setDraggable(this.draggable);
          setupDragHandler_.bind(this)();
          break;
        case 'title':
          this.marker.setTitle(this.title);
          break;
      }
    }
  });

})();
Polymer({

    is: 'google-map',


    /**
     * Fired when the Maps API has fully loaded.
     * @event google-map-ready
     */
    /**
     * Fired when the user clicks on the map (but not when they click on a marker, infowindow, or
     * other object). Requires the clickEvents attribute to be true.
     * @event google-map-click
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user double-clicks on the map. Note that the google-map-click event will also fire,
     * right before this one. Requires the clickEvents attribute to be true.
     * @event google-map-dblclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired repeatedly while the user drags the map. Requires the dragEvents attribute to be true.
     * @event google-map-drag
     */
    /**
     * Fired when the user stops dragging the map. Requires the dragEvents attribute to be true.
     * @event google-map-dragend
     */
    /**
     * Fired when the user starts dragging the map. Requires the dragEvents attribute to be true.
     * @event google-map-dragstart
     */
    /**
     * Fired whenever the user's mouse moves over the map container. Requires the mouseEvents attribute to
     * be true.
     * @event google-map-mousemove
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user's mouse exits the map container. Requires the mouseEvents attribute to be true.
     * @event google-map-mouseout
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the user's mouse enters the map container. Requires the mouseEvents attribute to be true.
     * @event google-map-mouseover
     * @param {google.maps.MouseEvent} event The mouse event.
     */
    /**
     * Fired when the DOM `contextmenu` event is fired on the map container. Requires the clickEvents
     * attribute to be true.
     * @event google-map-rightclick
     * @param {google.maps.MouseEvent} event The mouse event.
     */

    /**
     * Polymer properties for the google-map custom element.
     */
    properties: {
      /**
       * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
       */
      apiKey: String,

      /**
       * A Maps API for Business Client ID. To obtain a Maps API for Business Client ID, see developers.google.com/maps/documentation/business/.
       * If set, a Client ID will take precedence over an API Key.
       */
      clientId: String,

      /**
       * A latitude to center the map on.
       */
      latitude: {
        type: Number,
        value: 37.77493,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * A Maps API object.
       */
      map: {
        type: Object,
        notify: true,
        value: null
      },

      /**
       * A longitude to center the map on.
       */
      longitude: {
        type: Number,
        value: -122.41942,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * A kml file to load.
       */
      kml: {
        type: String,
        value: null,
        observer: '_loadKml'
      },

      /**
       * A zoom level to set the map to.
       */
      zoom: {
        type: Number,
        value: 10,
        observer: '_zoomChanged',
        notify: true
      },

      /**
       * When set, prevents the map from tilting (when the zoom level and viewport supports it).
       */
      noAutoTilt: {
        type: Boolean,
        value: false
      },

      /**
       * Map type to display. One of 'roadmap', 'satellite', 'hybrid', 'terrain'.
       */
      mapType: {
        type: String,
        value: 'roadmap', // roadmap, satellite, hybrid, terrain,
        observer: '_mapTypeChanged',
        notify: true
      },

      /**
       * Version of the Google Maps API to use.
       */
      version: {
        type: String,
        value: '3.exp'
      },

      /**
       * If set, removes the map's default UI controls.
       */
      disableDefaultUi: {
        type: Boolean,
        value: false,
        observer: '_disableDefaultUiChanged'
      },

      /**
       * If set, the zoom level is set such that all markers (google-map-marker children) are brought into view.
       */
      fitToMarkers: {
        type: Boolean,
        value: false,
        observer: '_fitToMarkersChanged'
      },

      /**
       * If true, prevent the user from zooming the map interactively.
       */
      disableZoom: {
        type: Boolean,
        value: false,
        observer: '_disableZoomChanged'
      },

      /**
       * If set, custom styles can be applied to the map.
       * For style documentation see developers.google.com/maps/documentation/javascript/reference#MapTypeStyle
       */
      styles: {
        type: Object,
        value: function() { return {}; }
      },

      /**
       * A maximum zoom level which will be displayed on the map.
       */
      maxZoom: {
        type: Number,
        observer: '_maxZoomChanged'
      },

      /**
       * A minimum zoom level which will be displayed on the map.
       */
      minZoom: {
        type: Number,
        observer: '_minZoomChanged'
      },

      /**
       * If true, sign-in is enabled.
       * See https://developers.google.com/maps/documentation/javascript/signedin#enable_sign_in
       */
      signedIn: {
        type: Boolean,
        value: false
      },

      /**
       * The localized language to load the Maps API with. For more information
       * see https://developers.google.com/maps/documentation/javascript/basics#Language
       *
       * Note: the Maps API defaults to the preffered language setting of the browser.
       * Use this parameter to override that behavior.
       */
      language: {
        type: String
      },

      /**
       * When true, map *click events are automatically registered.
       */
      clickEvents: {
        type: Boolean,
        value: false,
        observer: '_clickEventsChanged'
      },

      /**
       * When true, map drag* events are automatically registered.
       */
      dragEvents: {
        type: Boolean,
        value: false,
        observer: '_dragEventsChanged'
      },

      /**
       * When true, map mouse* events are automatically registered.
       */
      mouseEvents: {
        type: Boolean,
        value: false,
        observer: '_mouseEventsChanged'
      },

      /**
       * Additional map options for google.maps.Map constructor.
       * Use to specify additional options we do not expose as
       * properties.
       * Ex: `<google-map additional-map-options='{"mapTypeId":"satellite"}'>`
       *
       * Note, you can't use API enums like `google.maps.ControlPosition.TOP_RIGHT`
       * when using this property as an HTML attribute. Instead, use the actual
       * value (e.g. `3`) or set `.additionalMapOptions` in JS rather than using
       * the attribute.
       */
      additionalMapOptions: {
        type: Object,
        value: function() { return {}; }
      },

      /**
       * The markers on the map.
       */
      markers: {
        type: Array,
        value: function() { return []; },
        readOnly: true
      },

      /**
       * The non-marker objects on the map.
       */
      objects: {
        type: Array,
        value: function() { return []; },
        readOnly: true
      },

      /**
       * If set, all other info windows on markers are closed when opening a new one.
       */
      singleInfoWindow: {
        type: Boolean,
        value: false
      }
    },

    behaviors: [
      Polymer.IronResizableBehavior
    ],

    listeners: {
      'iron-resize': 'resize'
    },

    observers: [
      '_debounceUpdateCenter(latitude, longitude)'
    ],

    attached: function() {
      this._initGMap();
    },

    detached: function() {
      if (this._mutationObserver) {
        this._mutationObserver.disconnect();
        this._mutationObserver = null;
      }
      if (this._objectsMutationObserver) {
        this._objectsMutationObserver.disconnect();
        this._objectsMutationObserver = null;
      }
    },

    _initGMap: function() {
      if (this.map) {
        return; // already initialized
      }
      if (this.$.api.libraryLoaded !== true) {
        return; // api not loaded
      }
      if (!this.isAttached) {
        return; // not attached
      }

      this.map = new google.maps.Map(this.$.map, this._getMapOptions());
      this._listeners = {};
      this._updateCenter();
      this._loadKml();
      this._updateMarkers();
      this._updateObjects();
      this._addMapListeners();
      this.fire('google-map-ready');
    },

    _mapApiLoaded: function() {
      this._initGMap();
    },

    _getMapOptions: function() {
      var mapOptions = {
        zoom: this.zoom,
        tilt: this.noAutoTilt ? 0 : 45,
        mapTypeId: this.mapType,
        disableDefaultUI: this.disableDefaultUi,
        disableDoubleClickZoom: this.disableZoom,
        scrollwheel: !this.disableZoom,
        styles: this.styles,
        maxZoom: Number(this.maxZoom),
        minZoom: Number(this.minZoom)
      };

      // Only override the default if set.
      // We use getAttribute here because the default value of this.draggable = false even when not set.
      if (this.getAttribute('draggable') != null) {
        mapOptions.draggable = this.draggable
      }
      for (var p in this.additionalMapOptions)
        mapOptions[p] = this.additionalMapOptions[p];

      return mapOptions;
    },

    _attachChildrenToMap: function(children) {
      if (this.map) {
        for (var i = 0, child; child = children[i]; ++i) {
          child.map = this.map;
        }
      }
    },

    // watch for future updates to marker objects
    _observeMarkers: function() {
      // Watch for future updates.
      if (this._mutationObserver) {
        return;
      }
      this._mutationObserver = new MutationObserver(this._updateMarkers.bind(this));
      this._mutationObserver.observe(this.$.selector, {
        childList: true
      });
    },

    _updateMarkers: function() {
      var newMarkers = Array.prototype.slice.call(
          Polymer.dom(this.$.markers).getDistributedNodes());

      // do not recompute if markers have not been added or removed
      if (newMarkers.length === this.markers.length) {
        var added = newMarkers.filter(function(m) {
          return this.markers && this.markers.indexOf(m) === -1;
        }.bind(this));
        if (added.length === 0) {
          // set up observer first time around
          if (!this._mutationObserver) {
            this._observeMarkers();
          }
          return;
        }
      }

      this._observeMarkers();

      this.markers = this._setMarkers(newMarkers);

      // Set the map on each marker and zoom viewport to ensure they're in view.
      this._attachChildrenToMap(this.markers);
      if (this.fitToMarkers) {
        this._fitToMarkersChanged();
      }
    },

    // watch for future updates to non-marker objects
    _observeObjects: function() {
      if (this._objectsMutationObserver) {
        return;
      }
      this._objectsMutationObserver = new MutationObserver(this._updateObjects.bind(this));
      this._objectsMutationObserver.observe(this, {
        childList: true
      });
    },

    _updateObjects: function() {
      var newObjects = Array.prototype.slice.call(
          Polymer.dom(this.$.objects).getDistributedNodes());

      // Do not recompute if objects have not been added or removed.
      if (newObjects.length === this.objects.length) {
        var added = newObjects.filter(function(o) {
          return this.objects.indexOf(o) === -1;
        }.bind(this));
        if (added.length === 0) {
          // Set up observer first time around.
          this._observeObjects();
          return;
        }
      }

      this._observeObjects();
      this._setObjects(newObjects);
      this._attachChildrenToMap(this.objects);
    },

    /**
     * Clears all markers from the map.
     *
     * @method clear
     */
    clear: function() {
      for (var i = 0, m; m = this.markers[i]; ++i) {
        m.marker.setMap(null);
      }
    },

    /**
     * Explicitly resizes the map, updating its center. This is useful if the
     * map does not show after you have unhidden it.
     *
     * @method resize
     */
    resize: function() {
      if (this.map) {

        // saves and restores latitude/longitude because resize can move the center
        var oldLatitude = this.latitude;
        var oldLongitude = this.longitude;
        google.maps.event.trigger(this.map, 'resize');
        this.latitude = oldLatitude;  // restore because resize can move our center
        this.longitude = oldLongitude;

        if (this.fitToMarkers) { // we might not have a center if we are doing fit-to-markers
          this._fitToMarkersChanged();
        }
      }
    },

    _loadKml: function() {
      if (this.map && this.kml) {
        var kmlfile = new google.maps.KmlLayer({
          url: this.kml,
          map: this.map
        });
      }
    },

    _debounceUpdateCenter: function() {
      this.debounce('updateCenter', this._updateCenter);
    },

    _updateCenter: function() {
      this.cancelDebouncer('updateCenter');

      if (this.map && this.latitude !== undefined && this.longitude !== undefined) {
        // allow for latitude and longitude to be String-typed, but still Number valued
        var lati = Number(this.latitude);
        if (isNaN(lati)) {
          throw new TypeError('latitude must be a number');
        }
        var longi = Number(this.longitude);
        if (isNaN(longi)) {
          throw new TypeError('longitude must be a number');
        }

        var newCenter = new google.maps.LatLng(lati, longi);
        var oldCenter = this.map.getCenter();

        if (!oldCenter) {
          // If the map does not have a center, set it right away.
          this.map.setCenter(newCenter);
        } else {
          // Using google.maps.LatLng returns corrected lat/lngs.
          oldCenter = new google.maps.LatLng(oldCenter.lat(), oldCenter.lng());

          // If the map currently has a center, slowly pan to the new one.
          if (!oldCenter.equals(newCenter)) {
            this.map.panTo(newCenter);
          }
        }
      }
    },

    _zoomChanged: function() {
      if (this.map) {
        this.map.setZoom(Number(this.zoom));
      }
    },

    _clickEventsChanged: function() {
      if (this.map) {
        if (this.clickEvents) {
          this._forwardEvent('click');
          this._forwardEvent('dblclick');
          this._forwardEvent('rightclick');
        } else {
          this._clearListener('click');
          this._clearListener('dblclick');
          this._clearListener('rightclick');
        }
      }
    },

    _dragEventsChanged: function() {
      if (this.map) {
        if (this.dragEvents) {
          this._forwardEvent('drag');
          this._forwardEvent('dragend');
          this._forwardEvent('dragstart');
        } else {
          this._clearListener('drag');
          this._clearListener('dragend');
          this._clearListener('dragstart');
        }
      }
    },

    _mouseEventsChanged: function() {
      if (this.map) {
        if (this.mouseEvents) {
          this._forwardEvent('mousemove');
          this._forwardEvent('mouseout');
          this._forwardEvent('mouseover');
        } else {
          this._clearListener('mousemove');
          this._clearListener('mouseout');
          this._clearListener('mouseover');
        }
      }
    },

    _maxZoomChanged: function() {
      if (this.map) {
        this.map.setOptions({maxZoom: Number(this.maxZoom)});
      }
    },

    _minZoomChanged: function() {
      if (this.map) {
        this.map.setOptions({minZoom: Number(this.minZoom)});
      }
    },

    _mapTypeChanged: function() {
      if (this.map) {
        this.map.setMapTypeId(this.mapType);
      }
    },

    _disableDefaultUiChanged: function() {
      if (!this.map) {
        return;
      }
      this.map.setOptions({disableDefaultUI: this.disableDefaultUi});
    },

    _disableZoomChanged: function() {
      if (!this.map) {
        return;
      }
      this.map.setOptions({
        disableDoubleClickZoom: this.disableZoom,
        scrollwheel: !this.disableZoom
      });
    },

    attributeChanged: function(attrName) {
      if (!this.map) {
        return;
      }
      // Cannot use *Changed watchers for native properties.
      switch (attrName) {
        case 'draggable':
          this.map.setOptions({draggable: this.draggable});
          break;
      }
    },

    _fitToMarkersChanged: function() {
      // TODO(ericbidelman): respect user's zoom level.

      if (this.map && this.fitToMarkers && this.markers.length > 0) {
        var latLngBounds = new google.maps.LatLngBounds();
        for (var i = 0, m; m = this.markers[i]; ++i) {
          latLngBounds.extend(
              new google.maps.LatLng(m.latitude, m.longitude));
        }

        // For one marker, don't alter zoom, just center it.
        if (this.markers.length > 1) {
          this.map.fitBounds(latLngBounds);
        }

        this.map.setCenter(latLngBounds.getCenter());
      }
    },

    _addMapListeners: function() {
      google.maps.event.addListener(this.map, 'center_changed', function() {
        var center = this.map.getCenter();
        this.latitude = center.lat();
        this.longitude = center.lng();
      }.bind(this));

      google.maps.event.addListener(this.map, 'zoom_changed', function() {
        this.zoom = this.map.getZoom();
      }.bind(this));

      google.maps.event.addListener(this.map, 'maptypeid_changed', function() {
        this.mapType = this.map.getMapTypeId();
      }.bind(this));

      this._clickEventsChanged();
      this._dragEventsChanged();
      this._mouseEventsChanged();
    },

    _clearListener: function(name) {
      if (this._listeners[name]) {
        google.maps.event.removeListener(this._listeners[name]);
        this._listeners[name] = null;
      }
    },

    _forwardEvent: function(name) {
      this._listeners[name] = google.maps.event.addListener(this.map, name, function(event) {
        this.fire('google-map-' + name, event);
      }.bind(this));
    },

   _deselectMarker: function(e, detail) {
     // If singleInfoWindow is set, update iron-selector's selected attribute to be null.
     // Else remove the marker from iron-selector's selected array.
     var markerIndex = this.$.selector.indexOf(e.target);

     if (this.singleInfoWindow) {
      this.$.selector.selected = null;
     } else if (this.$.selector.selectedValues) {
      this.$.selector.selectedValues = this.$.selector.selectedValues.filter(function(i) {return i !== markerIndex});
     }
   }

  });
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var MapBlock = function () {
    function MapBlock() {
      _classCallCheck(this, MapBlock);
    }

    _createClass(MapBlock, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          images: {
            type: Array,
            /* jshint ignore:start */
            value: ["/images/backgrounds/location_1.jpg", "/images/backgrounds/location_2.jpg", "/images/backgrounds/location_3.jpg"]
            /* jshint ignore:end */
          },
          options: {
            type: String,
            value: function value() {
              return [{
                stylers: [{
                  'lightness': 40
                }, {
                  'visibility': 'on'
                }, {
                  'gamma': 0.9
                }, {
                  'weight': 0.4
                }]
              }, {
                'elementType': 'labels',
                'stylers': [{
                  'visibility': 'on'
                }]
              }, {
                'featureType': 'water',
                'stylers': [{
                  'color': '#5dc7ff'
                }]
              }];
            }
          },
          _currentSourceIndex: {
            type: Number,
            value: 0
          },
          _currentTargetIndex: {
            type: Number,
            value: 0
          },
          _currentImage: {
            type: String
          }
        };
      }
    }, {
      key: 'ready',
      value: function ready() {
        this._currentImage = this.images[this._currentSourceIndex];
        if (this.images.length > 1) {
          var that = this;
          setInterval(function () {
            that.nextImage();
          }, 4000);
        }
      }
    }, {
      key: 'previousImage',
      value: function previousImage() {
        this._currentSourceIndex = this._currentSourceIndex > 0 ? this._currentSourceIndex - 1 : this.images.length - 1;
        this._currentImage = this.images[this._currentSourceIndex];
      }
    }, {
      key: 'nextImage',
      value: function nextImage() {
        this._currentSourceIndex = this._currentSourceIndex < this.images.length - 1 ? this._currentSourceIndex + 1 : 0;
        this._currentImage = this.images[this._currentSourceIndex];
      }
    }]);

    return MapBlock;
  }();

  Polymer(MapBlock);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var HomePage = function () {
    function HomePage() {
      _classCallCheck(this, HomePage);
    }

    _createClass(HomePage, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          people: Array,
          posts: Array,
          logos: Array,
          videos: Array,
          selected: {
            type: Boolean,
            observer: 'updateHeroSettings'
          },
          heroSettings: {
            type: Object,
            notify: true
          },
          _heroSettings: {
            type: Object,
            /* jshint ignore:start */
            value: function value() {
              return { "backgroundColor": "#00BCD4", "backgroundImage": "/images/backgrounds/home.jpg", "fontColor": "#FFFFFF", "tabBarColor": "#FFFFFF", "video": { "title": "GDG DevFest Sul 2015", "youtubeId": "RDQdNXp3uKU", "text": "Veja como foi em 2015" } };
            }
            /* jshint ignore:end */
          },

          animationConfig: {
            type: Object,
            value: function value() {
              var cascaded = Polymer.dom(this.root).querySelectorAll('[cascaded]');
              var cascadedArray = Array.prototype.slice.call(cascaded);
              return {
                'entry': [{
                  name: 'cascaded-animation',
                  animation: 'transform-animation',
                  transformFrom: 'translate3d(0, 100%, 0)',
                  nodes: cascadedArray,
                  timing: {
                    delay: 500
                  }
                }, {
                  name: 'fade-in-animation',
                  animation: 'fade-in-animation',
                  node: this,
                  timing: {
                    delay: 500
                  }
                }],
                'exit': [{
                  name: 'cascaded-animation',
                  animation: 'transform-animation',
                  transformTo: 'translate3d(0, 100%, 0)',
                  nodes: cascadedArray
                }, {
                  name: 'fade-out-animation',
                  animation: 'fade-out-animation',
                  node: this
                }]
              };
            }
          }
        };
        this.observers = ['updateHeroSettings(selected)'];
      }
    }, {
      key: 'updateHeroSettings',
      value: function updateHeroSettings() {
        this.heroSettings = this.selected ? this._heroSettings : this.heroSettings;
      }
    }, {
      key: 'behaviors',
      get: function get() {
        return [Polymer.NeonSharedElementAnimatableBehavior];
      }
    }]);

    return HomePage;
  }();

  Polymer(HomePage);
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var BlogPage = function () {
    function BlogPage() {
      _classCallCheck(this, BlogPage);
    }

    _createClass(BlogPage, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          posts: Array,
          selected: {
            type: Boolean,
            observer: 'updateHeroSettings'
          },
          heroSettings: {
            type: Object,
            notify: true
          },
          _heroSettings: {
            type: Object,
            /* jshint ignore:start */
            value: function value() {
              return;
            }
            /* jshint ignore:end */
          },

          animationConfig: {
            type: Object,
            value: function value() {
              return {
                'entry': [{
                  name: 'cascaded-animation',
                  animation: 'transform-animation',
                  transformFrom: 'translate3d(0, 100%, 0)',
                  timing: {
                    delay: 500
                  }
                }, {
                  name: 'fade-in-animation',
                  animation: 'fade-in-animation',
                  node: this,
                  timing: {
                    delay: 500
                  }
                }],
                'exit': [{
                  name: 'cascaded-animation',
                  animation: 'transform-animation',
                  transformTo: 'translate3d(0, 100%, 0)'
                }, {
                  name: 'fade-out-animation',
                  animation: 'fade-out-animation',
                  node: this
                }]
              };
            }
          }
        };
        this.observers = ['updateHeroSettings(selected)'];
      }
    }, {
      key: 'updateHeroSettings',
      value: function updateHeroSettings() {
        this.heroSettings = this.selected ? this._heroSettings : this.heroSettings;
      }
    }, {
      key: '_updateCascadedNodes',
      value: function _updateCascadedNodes() {
        var cascaded = Polymer.dom(this.root).querySelectorAll('[cascaded]');
        var cascadedArray = Array.prototype.slice.call(cascaded);
        this.animationConfig.entry[0].nodes = cascadedArray;
        this.animationConfig.exit[0].nodes = cascadedArray;
      }
    }, {
      key: 'behaviors',
      get: function get() {
        return [Polymer.NeonSharedElementAnimatableBehavior];
      }
    }]);

    return BlogPage;
  }();

  Polymer(BlogPage);
})();
/** @polymerBehavior */
  Polymer.PaperSpinnerBehavior = {

    listeners: {
      'animationend': '__reset',
      'webkitAnimationEnd': '__reset'
    },

    properties: {
      /**
       * Displays the spinner.
       */
      active: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        observer: '__activeChanged'
      },

      /**
       * Alternative text content for accessibility support.
       * If alt is present, it will add an aria-label whose content matches alt when active.
       * If alt is not present, it will default to 'loading' as the alt value.
       */
      alt: {
        type: String,
        value: 'loading',
        observer: '__altChanged'
      },

      __coolingDown: {
        type: Boolean,
        value: false
      }
    },

    __computeContainerClasses: function(active, coolingDown) {
      return [
        active || coolingDown ? 'active' : '',
        coolingDown ? 'cooldown' : ''
      ].join(' ');
    },

    __activeChanged: function(active, old) {
      this.__setAriaHidden(!active);
      this.__coolingDown = !active && old;
    },

    __altChanged: function(alt) {
      // user-provided `aria-label` takes precedence over prototype default
      if (alt === this.getPropertyInfo('alt').value) {
        this.alt = this.getAttribute('aria-label') || alt;
      } else {
        this.__setAriaHidden(alt==='');
        this.setAttribute('aria-label', alt);
      }
    },

    __setAriaHidden: function(hidden) {
      var attr = 'aria-hidden';
      if (hidden) {
        this.setAttribute(attr, 'true');
      } else {
        this.removeAttribute(attr);
      }
    },

    __reset: function() {
      this.active = false;
      this.__coolingDown = false;
    }
  };
Polymer({
      is: 'paper-spinner',

      behaviors: [
        Polymer.PaperSpinnerBehavior
      ]
    });
(function () {
		'use strict';
		Polymer({
			is: 'disqus-comments',
			properties: {
				/**
				 * A shortname is the unique identifier assigned to a Disqus site.
				 * All the comments posted to a site are referenced with the shortname.
				 *
				 * @attribute shortname
				 * @type string
				 * @default 'text'
				 */
				shortname: {
					type: String,
					value: '',
					notify: true
				},

				/**
				 * A Disqus identifier is a unique string which is used to look up a page's
				 * thread in the Disqus system.
				 *
				 * @attribute identifier
				 * @type string
				 * @default 'text'
				 */
				identifier:  {
					type: String,
					value: '',
					notify: true
				},

				/**
				 * Tells the Disqus service the title of the current page.
				 * This is used when creating the thread on Disqus for the first time.
				 *
				 * @attribute title
				 * @type string
				 * @default 'text'
				 */
				title:  {
					type: String,
					value: '',
					notify: true
				},

				/**
				 * Tells the Disqus service the URL of the current page.
				 * If undefined, Disqus will take the window.location.href.
				 *
				 * @attribute url
				 * @type string
				 * @default 'text'
				 */
				url:  {
					type: String,
					value: '',
					notify: true
				},

				/**
				 * Tells the Disqus service the category to be used for the current page.
				 * This is used when creating the thread on Disqus for the first time.
				 *
				 * @attribute categoryId
				 * @type string
				 * @default 'text'
				 */
				categoryId:  {
					type: String,
					value: '',
					notify: true
				},

				/**
				 * Force HTTPS when loading Disqus embed script.
				 *
				 * @attribute https
				 * @type boolean
				 * @default false
				 */
				https:  {
					type: Boolean,
					value: false,
					notify: true
				}
			},
			attached: function() {
				if (window.DISQUS) {
					this.reset();
					return;
				}

				if (this.shortname) {
					var disqus_shortname = this.shortname;
				} else {
					return console.error('Required: Please provide a Disqus shortname.');
				}

				var el = this;
				var disq = this.root.querySelector('#disqus');
				var clone = document.createTextNode("");

				if(disq)
					clone = disq.cloneNode(true);

				window.disqus_config = function() {
					if (el.identifier) this.page.identifier = el.identifier;
					if (el.title) this.page.title = el.title;
					if (el.url) this.page.url = el.url;
					if (el.categoryId) this.page.category_id = el.categoryId;
					this.callbacks.onReady = [function() {
						el.root.appendChild(clone);
					}];
				};

				var dsq = document.createElement('script');
				var http = (this.https) ? 'https' : 'http';
				dsq.type = 'text/javascript';
				dsq.async = true;
				dsq.src = http + '://' + disqus_shortname + '.disqus.com/embed.js';
				(document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
			},
			reset: function() {
				if (window.DISQUS) {
					var el = this;
					var disq = this.root.querySelector('#disqus');
					var clone = document.createTextNode("");

					if(disq)
						clone = disq.cloneNode(true);

					DISQUS.reset({
						reload: true,
						config: function() {
							if (el.identifier) this.page.identifier = el.identifier;
							if (el.title) this.page.title = el.title;
							if (el.url) this.page.url = el.url;
							if (el.categoryId) this.page.category_id = el.categoryId;
							this.callbacks.onReady = [function() {
								el.root.appendChild(clone);
							}];
						}
					});
				}
			}
		});
	})();
'use strict';

(function () {
  'use strict';

  Polymer({

    is: 'post-page',

    behaviors: [Polymer.NeonAnimationRunnerBehavior, Polymer.NeonSharedElementAnimatableBehavior, Polymer.UtilsBehavior],

    properties: {
      postId: {
        type: String,
        notify: true
      },
      posts: Array,
      heroSettings: {
        type: Object,
        notify: true
      },
      selected: {
        type: Boolean,
        observer: 'updateHeroSettings'
      },
      _loaded: {
        type: Boolean,
        value: false
      },
      _post: Object,
      _latestPosts: {
        type: Array,
        value: []
      },

      animationConfig: {
        type: Object,
        value: function value() {
          var cascaded = Polymer.dom(this.root).querySelectorAll('[cascaded]');
          var cascadedArray = Array.prototype.slice.call(cascaded);
          return {
            'entry': [{
              name: 'fade-in-animation',
              animation: 'fade-in-animation',
              node: this,
              timing: {
                delay: 500
              }
            }],
            'exit': [{
              name: 'cascaded-animation',
              animation: 'transform-animation',
              transformTo: 'translate3d(0, 100%, 0)',
              nodes: cascadedArray
            }, {
              name: 'fade-out-animation',
              animation: 'fade-out-animation',
              node: this
            }],
            'postLoaded': [{
              name: 'cascaded-animation',
              animation: 'transform-animation',
              transformFrom: 'translate3d(0, 100%, 0)',
              nodes: cascadedArray,
              timing: {
                delay: 500
              }
            }, {
              name: 'fade-in-animation',
              animation: 'fade-in-animation',
              nodes: cascadedArray,
              timing: {
                delay: 500
              }
            }, {
              name: 'scale-down-animation',
              animation: 'scale-down-animation',
              node: this.$.spinner
            }]
          };
        }
      }
    },

    observers: ['_postChanged(posts, postId, selected)'],

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    updateHeroSettings: function updateHeroSettings() {
      if (this._post) {
        this.heroSettings = {
          backgroundColor: this._post.primaryColor,
          backgroundImage: this._post.image,
          fontColor: '#FFFFFF',
          tabBarColor: '#FFFFFF'
        };
      }
    },

    _postChanged: function _postChanged() {
      if (this.selected && this.postId) {
        this.$.animationWrapper.style.opacity = 0;
        this.$.animationWrapper.style.display = 'none';
        this.$.spinner.style.opacity = 1;

        var postIndex = this._getIndexByProperty(this.posts, 'id', this.postId);

        this._latestPosts[0] = postIndex > 0 ? this.posts[postIndex - 1] : null;
        this._latestPosts[1] = postIndex < this.posts.length - 1 ? this.posts[postIndex + 1] : null;
        this.notifyPath('_latestPosts', this._latestPosts.slice());

        this._post = this.posts[postIndex];
        this.notifyPath('_post.date', new Date(this._post.posted).toDateString().slice(4));
        this.updateHeroSettings();

        this._postUrl = '/posts/' + this._post.posted + '-' + this.postId + '.markdown';
        this.$.ajax.generateRequest();
      }
    },

    _postLoaded: function _postLoaded() {
      this._loaded = true;
      this.async(function () {
        this.$.animationWrapper.style.opacity = 1;
        this.$.animationWrapper.style.display = 'block';
      }, 100);
      this.playAnimation('postLoaded');
      this.$.disqus.reset();
      this.postId = null;
    },

    _onNeonAnimationFinish: function _onNeonAnimationFinish() {
      if (this._loaded) {
        this.$.spinner.style.opacity = 0;
      }
    }

  });
})();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  var HoverboardApp = function () {
    function HoverboardApp() {
      _classCallCheck(this, HoverboardApp);
    }

    _createClass(HoverboardApp, [{
      key: 'beforeRegister',
      value: function beforeRegister() {
        this.is = this.constructor.name.replace(/\W+/g, '-').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
        this.properties = {
          route: {
            type: String,
            value: 'home'
          },
          params: Object,
          upgraded: Boolean
        };
      }
    }, {
      key: 'ready',
      value: function ready() {
        this.fire('upgraded');
        this.upgraded = true;
      }
    }, {
      key: 'scrollPageToTop',
      value: function scrollPageToTop() {
        this.$.headerPanelMain.scrollToTop(true);
      }
    }, {
      key: 'closeDrawer',
      value: function closeDrawer() {
        this.$.paperDrawerPanel.closeDrawer();
      }
    }, {
      key: 'toggleDrawer',
      value: function toggleDrawer() {
        this.$.paperDrawerPanel.togglePanel();
      }
    }]);

    return HoverboardApp;
  }();

  Polymer(HoverboardApp);
})();
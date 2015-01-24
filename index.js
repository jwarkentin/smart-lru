var os = require('os'),
    _ = require('lodash');

function SmartLRU(options) {
  this.options = _.extend({
    inactiveTTL: 0,
    maxSize: '50m',
    maxKeys: 0
  }, options);
  this.options.inactiveTTL *= 1000;

  this.cache = {};
  this.cacheSize = 0;

  // If we can't match the regex then default to 80% of total memory
  var maxSize = this.options.maxSize.match(/(\d+)([bkm%])/i) || ['', '80', '%'],
      size = +maxSize[1];
      unit = maxSize[2].toLowerCase();

  if(unit == 'k') {
    this.maxSize = size * 1024;
  } else if(unit == 'm') {
    this.maxSize = size * 1048576;
  } else if(unit == 'g') {
    this.maxSize = size * 1073741824;
  } else if(unit == '%') {
    if(size > 100) size = 100;
    else if(size <= 0) size = 1;
    this.maxSize = (size / 100) * os.totalmem();
  }
}

_.extend(SmartLRU.prototype, {
  /**
   * Evict Least Recently Used keys to bring the cache back within its given limits
   */
  _evictKeys: function() {
    var maxKeys = this.options.maxKeys,
        cacheSize = _.size(this.cache);
    while(this.cacheSize > this.maxSize || (maxKeys && cacheSize > maxKeys)) {
      // Remove the first enumerated key. In practice, this will always be the oldest existing key.
      // Oldest data goes first.
      for(var key in this.cache) {
        this.del(key);
        cacheSize--;
        break;
      }
    }
  },

  hasKey: function(key) {
    return this.cache.hasOwnProperty(key);
  },

  set: function(key, value, ttl) {
    var that = this,
        value = Buffer.isBuffer(value) ? value : JSON.stringify(value),
        storeSize = key.length + Buffer.byteLength(value);
    ttl = (ttl !== 0 ? (ttl || this.options.inactiveTTL) : 0) * 1000;

    // The key may have a timeout and it's also in the wrong place in the object if we just replace it. It must be deleted first.
    if(this.cache[key]) {
      this.del(key);
    }

    if(ttl) {
      this.cache[key] = {
        data: value,
        size: storeSize,
        ttl: ttl,
        expire: setTimeout(function() {
          that.del(key);
        }, ttl)
      };
    } else {
      this.cache[key] = {
        data: value,
        size: storeSize
      };
    }

    this.cacheSize += storeSize;
    this._evictKeys();
  },

  get: function(key, touch) {
    if(this.cache[key]) {
      if(!_.isBoolean(touch) || touch) {
        this.touch(key);
      }

      var data = this.cache[key].data;
      return Buffer.isBuffer(data) ? data : JSON.parse(data);
    }
  },

  touch: function(key) {
    var that = this,
        cacheObj = this.cache[key];

    if(cacheObj) {
      // Bump the timeout
      if(cacheObj.ttl) {
        clearTimeout(cacheObj.expire);
        cacheObj.expire = setTimeout(function() {
          that.del(key);
        }, cacheObj.ttl);
      }

      // Push to end of "queue" (object fur realz) - we don't want recently used data getting deleted when cache size exceeds limit
      delete this.cache[key];
      this.cache[key] = cacheObj;

      return true;
    }

    return false;
  },

  /**
   * Update a key's value without changing its TTL
   */
  update: function(key, value) {
    var cachedObj = this.cache[key],
        value = Buffer.isBuffer(value) ? value : JSON.stringify(value);
    if(!cachedObj) {
      throw new Error("Failed to update value: Key '" + key + "' was not found in the cache");
    }

    var newSize = key.length + Buffer.byteLength(value),
        sizeDiff = newSize - cachedObj.size;
    cachedObj.size = newSize;
    cachedObj.data = value;

    this.cacheSize += sizeDiff;
  },

  del: function(key) {
    if(this.cache[key]) {
      clearTimeout(this.cache[key].expire);
      this.cacheSize -= this.cache[key].size;
      delete this.cache[key];
    }
  },

  reset: function() {
    for(var key in this.cache) {
      clearTimeout(this.cache[key].expire);
    }

    this.cache = {};
    this.cacheSize = 0;
  }
});


module.exports = SmartLRU;
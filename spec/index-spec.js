var path = require('path'),
    SmartLRU = require('../index.js');

describe('test set()', function() {
  it('should store the value and update all internal tracking mechanisms', function() {
    var _cache = new SmartLRU();
    _cache.set('test', 'val1');

    expect(Object.keys(_cache.cache).length).toEqual(1);
    expect(_cache.cacheLength).toEqual(1);
    expect(_cache.cacheSize).toEqual(10);

    _cache.set('test2', 'val2');

    expect(Object.keys(_cache.cache).length).toEqual(2);
    expect(_cache.cacheLength).toEqual(2);
    expect(_cache.cacheSize).toEqual(21);

    _cache.set('test', 'newval');

    expect(Object.keys(_cache.cache).length).toEqual(2);
    expect(_cache.cacheLength).toEqual(2);
    expect(_cache.cacheSize).toEqual(23);

    _cache.reset();
  });

  it('should expire keys', function() {
    jasmine.clock().install();

    var _cache = new SmartLRU({ inactiveTTL: 4000 });
    _cache.set('key1', 'val1');
    _cache.set('key2', 'val2', 4500);
    _cache.set('key3', 'val3', 0);

    expect(_cache.cache.key1.ttl).toEqual(4000);
    expect(_cache.cache.key2.ttl).toEqual(4500);
    expect(_cache.cache.key3.ttl).not.toBeDefined();

    jasmine.clock().tick(3999);
    expect(_cache.cache.key1).toBeDefined();
    expect(_cache.cache.key2).toBeDefined();
    expect(_cache.cache.key3).toBeDefined();

    jasmine.clock().tick(1);
    expect(_cache.cache.key1).not.toBeDefined();
    expect(_cache.cache.key2).toBeDefined();
    expect(_cache.cache.key3).toBeDefined();

    // Make sure the ttl gets reset after accessing the key (tests `touch()` internally), except when second arg is false
    _cache.get('key2');
    jasmine.clock().tick(4499);
    expect(_cache.cache.key2).toBeDefined();
    expect(_cache.cache.key3).toBeDefined();

    jasmine.clock().tick(1);
    expect(_cache.cache.key2).not.toBeDefined();
    expect(_cache.cache.key3).toBeDefined();
    expect(_cache.cacheLength).toEqual(1);

    _cache.set('key2', 'val2', 300);

    jasmine.clock().tick(299);
    expect(_cache.get('key2', false)).toEqual('val2');

    jasmine.clock().tick(1);
    expect(_cache.cache.key2).not.toBeDefined();

    _cache.reset();
    jasmine.clock().uninstall();
  });

  it('should enforce `maxKeys`', function() {
    var _cache = new SmartLRU({
      maxKeys: 3
    });

    _cache.set('key1', 'val1');
    _cache.set('key2', 'val2');
    _cache.set('key3', 'val3');

    expect(_cache.cache.key1).toBeDefined();
    expect(_cache.cache.key2).toBeDefined();
    expect(_cache.cache.key3).toBeDefined();

    _cache.set('key4', 'val4');

    expect(_cache.cache.key1).not.toBeDefined();
    expect(_cache.cache.key2).toBeDefined();
    expect(_cache.cache.key3).toBeDefined();
    expect(_cache.cache.key4).toBeDefined();

    _cache.reset();
  });

  it('should enforce `maxSize`', function() {
    var _cache = new SmartLRU({
      maxSize: 50
    });

    expect(_cache.maxSize).toEqual(50);

    _cache.set('key1', 'abcdefghijklmnopqrstuvwxyz'); // 32 bytes internally
    _cache.set('key2', '01234567890');  // 17 bytes internally

    expect(_cache.cacheSize).toEqual(49);
    expect(_cache.cache.key1).toBeDefined();
    expect(_cache.cache.key2).toBeDefined();

    _cache.set('k', 1);
    expect(_cache.cache.key1).not.toBeDefined();
    expect(_cache.cache.key2).toBeDefined();
    expect(_cache.cache.k).toBeDefined();
    expect(_cache.cacheSize).toEqual(19);

    _cache.set('key', 'abcdefghijklmnopqrstuvwxyz'); // 31 bytes internally
    expect(_cache.cacheSize).toEqual(50);

    _cache.reset();
  });
});

describe('test update()', function() {
  it('should update value without changing ttl', function() {
    jasmine.clock().install();
    var _cache = new SmartLRU();

    _cache.set('key1', 'val1', 5);
    jasmine.clock().tick(3);

    // Make sure the size gets updated when it gets larger
    _cache.update('key1', 'value1');
    expect(_cache.cacheSize).toEqual(12);
    expect(_cache.cache.key1.data).toEqual('"value1"');

    // Make sure the size is still correct when it gets smaller
    jasmine.clock().tick(1);
    _cache.update('key1', 'val1');
    expect(_cache.cacheSize).toEqual(10);

    jasmine.clock().tick(1);
    expect(_cache.cache.key1).not.toBeDefined();

    _cache.reset();
    jasmine.clock().install();
  });
});

describe('test get()', function() {
  it('should get keys the way they were set', function() {
    var _cache = new SmartLRU();
    _cache.set('key1', 'string');
    _cache.set('key2', 5);
    _cache.set('key3', {an: 'object'});

    expect(_cache.get('key1')).toEqual('string');
    expect(_cache.get('key2')).toEqual(5);
    expect(_cache.get('key3')).toEqual({an: 'object'});

    _cache.reset();
  });
});

describe('test hasKey()', function() {
  it('should return whether key exists in cache', function() {
    var _cache = new SmartLRU();
    _cache.set('key1', 'val1');

    expect(_cache.hasKey('key1')).toEqual(true);
    expect(_cache.hasKey('key2')).toEqual(false);

    _cache.reset();
  });
});
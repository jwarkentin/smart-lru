# smart-lru

This project aims to be fast and smart. It currently sets itself apart from existing LRU caches in its ability to evict data from the cache once it fills a given amount of memory, rather than requiring a specific number of allowed cache entries. Cached data can vary in size and it is generally desirable to cache as much data as memory will allow.

## Installation

```
npm install smart-lru
```

## Example Usage

```js
var SmartLRU = require('smart-lru');

var cache = new SmartLRU({
    inactiveTTL: 86400, // Keep unused objects in the cache for 1 day
    maxSize: '80%',     // Don't use more than 80% of the system memory
    maxKeys: 5000       // Don't allow more than 5000 keys in the cache
});

cache.set('test', {someKey: 5});

cache.get('test'); // Returns {someKey: 5}
```

## API

### SmartLRU#constructor(options)

**Options and defaults**

* `inactiveTTL`: integer, default 0 (no TTL). The default number of seconds unused cached objects should remain in the cache.
* `maxSize`: string, default `50m`. The maximum amount of memory the cache should use. Size can be specified as a percentage with as suffix of '%', as a number in bytes, or as a string with a suffix of 'k', 'm' or 'g'. The suffix is not case sensitive.
* `maxKeys`: integer, default 0 (unlimited). The maximum number of keys allows in the cache, regardless of whether it has reached `maxSize`.


### SmartLRU#get(key[, touch])

Get the value of the given cache key. Returns `undefined` if the key is not set. This is important since `null` is a valid cacheable value.

If `touch` is passed and set to `false` it will return the value without resetting its TTL or its place in line for eviction from the cache.


### SmartLRU#set(key, value[, ttl])

Set a value in the cache. The `value` can be anything, but if it is not a `Buffer` then it will be JSON encoded before being stored. It will be decoded on `get` so that part is transparent, but it will affect how much memory the value uses. In the future this may be able to measure object sizes properly and store them in their native form. Although, in some cases the JSON encoded value can be smaller.

The `ttl` is optional and will be defaulted to the `inactiveTTL` specified in the constructor options if not given. When you use this method it will completely replace any existing entry under the given key and reset its TTL. Passing a value of `0` to the optional `ttl` parameter will cause the given value to have no TTL even if there is a default `inactiveTTL` set.


### SmartLRU#touch(key)

Reset the `ttl` and eviction queue position for the given key.


### SmartLRU#hasKey(key)

Returns `true` if the given key exists in the cache, `false` otherwise. This should be used before a call to `update()` if you are not completely sure the key exists.


### SmartLRU#update(key, value)

Update the value of a key without resetting its TTL or changing its place in line for eviction from the cache. Note that this will throw an exception of the given key does not exist in the cache.


### SmartLRU#del(key)

Delete the given cache key.


### SmartLRU#reset()

Clear the entire LRU cache.
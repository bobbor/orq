# orq - Observable Request Queue

[![Build Status](https://travis-ci.org/Kriegslustig/observable-request-queue.svg?branch=master)](https://travis-ci.org/Kriegslustig/observable-request-queue)

HTTP Request Queue Optimized for Web Workers.

## Features

* TTL cache
* RESTful cache policy
* Cancelable requests
* Duplicate request elimination
* Works with Web Workers
* Platform independent

## Usage

`worker.js`

```js
import { mkMemCache, mkCachePolicy, mkReceiver } from 'orq'
import request from '@orq/superagent'

const fiveMinutes = 300000
const applyCachePolicy = mkCachePolicy({ ttl: fiveMinutes })
const cache = applyCachePolicy(mkMemCache())
mkReceiver(self, request, cache)
```

`main.js`

```js
import mkInterface from 'orq/interface'

const orqWorker = new Worker('worker.js')

const orq = mkInterface(orqWorker)
````

## Featrues in detail

### TTL cache

```js
mkCachePolicy({
  ttl: 3600000, // 1 hour in milliseconds
  ressources: {
    'https://example.com/api': {
      '/fish': {
        // override default ttl, since fish get stale quickly
        ttl: 180000, // 3 minutes in milliseconds
      },
    },
  },
})
```

## RESTful cache policy

> ⚠️ Pseudo code ahead

```js
orq.addRequest('https://example.com/api/fish')
  .subscribe() // network call made, will now be served from cache
orq.addRequest('https://example.com/api/fish/42', { method: 'PUT' })
  .subscribe() // invalidates /fish/* and /fish caches
orq.addRequest('https://example.com/api/fish/42')
  .subscribe() // another network call is made, since cache was invalidated before
```

## Cancelable requests

```js
const requestSub = orq.addRequest('https://example.com/api/fish', { cancelable: true })
  .subscribe()
setTimeout(() => {
  requestSub.unsubscribe() // Signals the worker to cancel the request
}, 1000)
```

By default all requests are cancelable except `GET` requests. The reasoning is, that the user might request the same resource again, at which point the response can be served from cache. So that's why we have to pass the option explicitly in the above `GET` request.

## Duplicate request elimination

```js
orq.addRequest('https://example.com/api/fish')
  .subscribe() // Starts network call from worker
orq.addRequest('https://example.com/api/fish')
  .subscribe() // Doesn't start another network call, since the first hasn't been completed. Instead the result of the first will be served to this request too.
```

## Platform independent

The `request` implementation isn't implemented by `orq` itself. So you may write your own. For example by wrapping the node internal `http`/`https` modules. `orq` only uses a subset of the worker API. You could easily wrap the node cluster module to provide a worker like API. Those wrapped node master/worker can then be passed to `orq` `mkInterface` and `mkReceiver`. See [test helpers](https://github.com/Kriegslustig/observable-request-queue/blob/master/src/__tests__/helpers/index.js#L7-L21) to see how this could be done.

## TODO

* write @orq/superagent
* optimize rxjs imports
* cannot add type constraints on request and response bodies
* cache policy should limit cache item size

-----

_Developed at [Vimcar](https://vimcar.com/)._

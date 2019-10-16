// @flow

import { of } from 'rxjs'
import {
  delay, concatMap, tap
} from 'rxjs/operators'
import test from 'ava'
import sinon from 'sinon'

import mkMemCache from '../mem-cache'

import mkCachePolicy from '../cache-policy'

test('should invalidate a cache entry after its ttl is passed', t => {
  const cache = mkCachePolicy({ ttl: 100 })(mkMemCache())
  const key = ['GET', 'https://example.com']
  const response = 'response'
  return cache.set(key, response).pipe(
    concatMap(() => cache.get(key)),
    tap(cachedValue => t.is(cachedValue, response)),
    concatMap(() =>
      of(true).pipe(
        delay(102),
        concatMap(() => cache.get(key)),
        tap(value => t.is(value, undefined))
      )
    ))
})

test('should invalidate a cache entry for a resource when a specific resource is changed through PUT/PATCH', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const url = 'https://example.com/fish/42'
  return cache.set(['GET', url], 'response').pipe(
    concatMap(() => cache.get(['PUT', url])),
    concatMap(() => cache.get(['GET', url])),
    tap(value => t.is(value, undefined))
  )
})

test('should invalidate a cache entry for the list call of a resource when a resource is changed through PUT/PATCH', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const url = 'https://example.com/fish'
  return cache.set(['GET', url], 'response').pipe(
    concatMap(() => cache.get(['PATCH', `${url}/42`])),
    concatMap(() => cache.get(['GET', url])),
    tap(value => t.is(value, undefined))
  )
})

test('should invalidate a cache entry for the list call of a resource when another resource is added through POST', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const url = 'https://example.com/fish'
  return cache.set(['GET', url], 'response').pipe(
    concatMap(() => cache.get(['POST', url])),
    concatMap(() => cache.get(['GET', url])),
    tap(value => t.is(value, undefined))
  )
})

test('should invalidate a cache entry if a resource contained in it is modified', t => {
  const baseUrl = 'https://example.com'
  const path = `/list-fish`
  const cache = mkCachePolicy({
    resources: {
      [baseUrl]: {
        '/list-fish': {
          contains: ['/fish', '/fish/.*'],
        },
      },
    },
  })(mkMemCache())
  return cache.set(['GET', `${baseUrl}${path}`], 'response').pipe(
    concatMap(() => cache.get(['POST', `${baseUrl}/fish`])),
    concatMap(() => cache.get(['GET',  `${baseUrl}${path}`])),
    tap(value => t.is(value, undefined))
  )
})

test('should only cache GET requests', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const key = ['POST', 'https://example.com']
  return cache.set(key, 'response').pipe(
    concatMap(() => cache.get(key)),
    tap(cachedValue => t.is(cachedValue, undefined))
  )
})

test('the default ttl should overridable in the endpoint specification', t => {
  const baseUrl = 'https://example.com'
  const key = ['GET', `${baseUrl}/fish`]
  const response = 'response'
  const cache = mkCachePolicy({
    ttl: 1,
    resources: {
      [baseUrl]: {
        '/fish': {
          ttl: 100
        },
      },
    },
  })(mkMemCache())
  return cache.set(key, response).pipe(
    concatMap(() => of(true).pipe(delay(2))),
    concatMap(() => cache.get(key)),
    tap(value => t.is(value, response)),
    concatMap(() => of(true).pipe(delay(100))),
    concatMap(() => cache.get(key)),
    tap(value => t.is(value, undefined))
  )
})

test('cache-policy.set should return an observable of the passed value', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const key = ['GET', 'https://example.com']
  return cache.set(key, 'response').pipe(
    tap((value) => t.is(value, 'response'))
  )
})

test('cache-policy.set should not do anything if the TTL is zero', t => {
  const memCache = mkMemCache()
  const cache = mkCachePolicy({ ttl: 0 })(memCache)
  memCache.set = sinon.spy(() => of(true))
  const next = sinon.spy()
  const value = '42'

  cache.set([ 'GET', 'b' ], value).subscribe(next)

  t.is(next.getCall(0).args[0], value)
  t.is(memCache.set.called, false)
})

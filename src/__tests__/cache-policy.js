// @flow

import { Observable as O } from 'rxjs'
import test from 'ava'

import mkMemCache from '../mem-cache'

import mkCachePolicy from '../cache-policy'

test('should invalidate a cache entry after its ttl is passed', t => {
  const cache = mkCachePolicy({ ttl: 10 })(mkMemCache())
  const key = ['GET', 'https://example.com']
  const response = 'response'
  return cache.set(key, response)
    .concatMap(() => cache.get(key))
    .do(cachedValue => t.is(cachedValue, response))
    .concatMap(() =>
      O.of(true)
        .delay(12)
        .concatMap(() => cache.get(key))
        .do(value => t.is(value, undefined))
    )
})

test('should invalidate a cache entry for a resource when a specific resource is changed through PUT/PATCH', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const url = 'https://example.com/fish/42'
  return cache.set(['GET', url], 'response')
    .concatMap(() => cache.get(['PUT', url]))
    .concatMap(() => cache.get(['GET', url]))
    .do(value => t.is(value, undefined))
})

test('should invalidate a cache entry for the list call of a resource when a resource is changed through PUT/PATCH', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const url = 'https://example.com/fish'
  return cache.set(['GET', url], 'response')
    .concatMap(() => cache.get(['PATCH', `${url}/42`]))
    .concatMap(() => cache.get(['GET', url]))
    .do(value => t.is(value, undefined))
})

test('should invalidate a cache entry for the list call of a resource when another resource is added through POST', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const url = 'https://example.com/fish'
  return cache.set(['GET', url], 'response')
    .concatMap(() => cache.get(['POST', url]))
    .concatMap(() => cache.get(['GET', url]))
    .do(value => t.is(value, undefined))
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
  return cache.set(['GET', `${baseUrl}${path}`], 'response')
    .concatMap(() => cache.get(['POST', `${baseUrl}/fish`]))
    .concatMap(() => cache.get(['GET',  `${baseUrl}${path}`]))
    .do(value => t.is(value, undefined))
})

test('should only cache GET requests', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const key = ['POST', 'https://example.com']
  return cache.set(key, 'response')
    .concatMap(() => cache.get(key))
    .do(cachedValue => t.is(cachedValue, undefined))
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
  return cache.set(key, response)
    .concatMap(() => O.of(true).delay(2))
    .concatMap(() => cache.get(key))
    .do(value => t.is(value, response))
    .concatMap(() => O.of(true).delay(100))
    .concatMap(() => cache.get(key))
    .do(value => t.is(value, undefined))
})

test('cache-policy.set should return an observable of the passed value', t => {
  const cache = mkCachePolicy({})(mkMemCache())
  const key = ['GET', 'https://example.com']
  return cache.set(key, 'response')
    .do((value) => t.is(value, 'response'))
})

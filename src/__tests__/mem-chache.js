// @flow

import test from 'ava'
import { Observable as O } from 'rxjs'

import type { Cache } from '../cache'
import mkMemCache from '../mem-cache'

test('`set` should set a value in the cache and `get` should return that value', t => {
  const cache: Cache<string> = mkMemCache()
  return cache.set('a', 'value')
    .concatMap(() => cache.get('a'))
    .do(cachedValue => t.is(cachedValue, 'value'))
})
test('`has` should return true if a value has previously been set', t => {
  const cache: Cache<string> = mkMemCache()
  return cache.set('a', 'value')
    .concatMap(() => cache.has('a'))
    .do(hasValue => t.true(hasValue))
    .concatMap(() => cache.has('b'))
    .do(hasValue => t.false(hasValue))
})
test('`delete` should remove a specific item from the cache', t => {
  const cache: Cache<string> = mkMemCache()
  return cache.set('a', 'value')
    .concatMap(() => cache.delete('a'))
    .concatMap(() => cache.has('a'))
    .do(hasValue => t.false(hasValue))
})

test('`clear` should remove all items in the cache', t => {
  const cache: Cache<string> = mkMemCache()
  return O.forkJoin([
    cache.set('a', 'value'),
    cache.set('aa', 'value2'),
    cache.set('b', 'value3'),
  ])
    .concatMap(() => cache.clear())
    .concatMap(() => O.forkJoin([
      cache.has('a'),
      cache.has('aa'),
      cache.has('b'),
    ]))
    .do(([a, aa, b]) => {
      t.false(a)
      t.false(aa)
      t.false(b)
    })
})

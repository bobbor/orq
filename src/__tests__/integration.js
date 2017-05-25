// @flow

import test from 'ava'
import { Observable as O } from 'rxjs'

import { mockWorker } from './helpers'

import {
  mkInterface,
  mkReceiver,
  mkMemCache,
  mkCachePolicy,
  mkRequestQueue,
} from '../'

test('should call request function', t => {
  const [main, worker] = mockWorker()
  const requestMock = (url, options) => {
    t.is(url, 'https://example.com')
    return O.of('YOLOTROLO')
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({})(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com')
    .do((res) => { t.is(res, 'YOLOTROLO') })
})

test('should have a ttl cache', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = (url, options) => {
    ++i
    return O.of(true)
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({ ttl: 100 })(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com')
    .delay(1)
    .concatMap(() => orq.addRequest('https://example.com'))
    .do(() => { t.is(i, 1) })
})

test('should eliminate duplicate GET requests in queue', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = (url, options) => {
    ++i
    return O.of(true).delay(50)
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({})(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com')
    .concatMap(() => orq.addRequest('https://example.com'))
    .do(() => { t.is(i, 1) })
})

test('should not eliminate duplicate non-GET requests in queue', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = (url, options) => {
    ++i
    return O.of(true).delay(50)
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({})(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com', { method: 'POST' })
    .concatMap(() => orq.addRequest('https://example.com', { method: 'POST' }))
    .do(() => { t.is(i, 2) })
})

test('should not cache non-GET requests', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = (url, options) => {
    ++i
    return O.of(true)
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({ ttl: 100 })(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com', { method: 'POST' })
    .delay(1)
    .concatMap(() => orq.addRequest('https://example.com', { method: 'POST' }))
    .do(() => { t.is(i, 2) })
})

test.cb('should cancel unsubscribed requests', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = (url, options) => O.create(() => () => {
    t.pass()
    t.end()
  })

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({ ttl: 100 })(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  const sub = orq.addRequest('https://example.com', { method: 'POST' })
    .subscribe()
  setTimeout(() => {
    sub.unsubscribe()
  }, 10)
})

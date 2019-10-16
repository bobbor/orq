// @flow

import test from 'ava'
import { Observable as O, of } from 'rxjs'
import {
  delay, tap, concatMap
} from 'rxjs/operators'

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
  const requestMock = (url) => {
    t.is(url, 'https://example.com')
    return of('YOLOTROLO')
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({})(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com').pipe(
    tap((res) => { t.is(res, 'YOLOTROLO') })
  )
})

test('should have a ttl cache', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = () => {
    ++i
    return of(true)
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({ ttl: 100 })(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com').pipe(
    delay(1),
    concatMap(() => orq.addRequest('https://example.com')),
    tap(() => { t.is(i, 1) })
  )
})

test('should eliminate duplicate GET requests in queue', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = () => {
    ++i
    return of(true).pipe(delay(50))
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({})(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com').pipe(
    concatMap(() => orq.addRequest('https://example.com')),
    tap(() => { t.is(i, 1) })
  )
})

test('should not eliminate duplicate non-GET requests in queue', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = () => {
    ++i
    return of(true).pipe(delay(50))
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({})(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com', { method: 'POST' }).pipe(
    concatMap(() => orq.addRequest('https://example.com', { method: 'POST' })),
    tap(() => { t.is(i, 2) })
  )
})

test('should not cache non-GET requests', t => {
  const [main, worker] = mockWorker()
  let i = 0
  const requestMock = () => {
    ++i
    return of(true)
  }

  const addRequest = mkRequestQueue(requestMock)
  const cache = mkCachePolicy({ ttl: 100 })(mkMemCache())
  mkReceiver(worker, addRequest, cache)
  const orq = mkInterface(main)
  return orq.addRequest('https://example.com', { method: 'POST' }).pipe(
    delay(1),
    concatMap(() => orq.addRequest('https://example.com', { method: 'POST' })),
    tap(() => { t.is(i, 2) })
  )
})

test.cb('should cancel unsubscribed requests', t => {
  const [main, worker] = mockWorker()
  const requestMock = () => O.create(() => () => {
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

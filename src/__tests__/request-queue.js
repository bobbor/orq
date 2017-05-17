import test from 'ava'
import { Observable as O } from 'rxjs'

import type { Request, RequestOptions } from '../request'
import mkRequestQueue from '../request-queue'

test('request-queue should call the input request function', t => {
  t.plan(1)
  const request = (url: string, options?: RequestOptions) => {
    t.pass()
    return O.of(true)
  }
  return mkRequestQueue(request)('https://example.com')
})

test('request-queue should only make N requests in parallel and queue further requests until others are completed', t => {
  t.plan(1)
  let runningRequests = 0
  const request = (url: string, options?: RequestOptions) => {
    runningRequests++
    if (runningRequests > 4) t.fail()
    return O.of(true).delay(10)
  }
  const queue = mkRequestQueue(request)
  return O.forkJoin([
    queue('https://example.com'),
    queue('https://example.com'),
    queue('https://example.com'),
    queue('https://example.com'),
    queue('https://example.com'),
  ])
    .do(() => { t.pass() })
})

test('request-queue should propagate errors', t => {
  t.plan(2)
  const error = 'YOLO'
  let i = 0
  const request = (url: string, options?: RequestOptions) => {
    return i++ === 0
      ? O.throw(error)
      : O.of(true)
  }
  const queue = mkRequestQueue(request)
  return queue('https://example.com')
    .catch((err) => {
      t.is(err, error)
      return O.of(true)
    })
    .concatMap(() => queue('https://example.com'))
    .do(res => t.true(res))
})

test('request-queue should eliminate duplicate requests in the queue', t => {
  let n = 0
  const request = (url: string, options?: RequestOptions) => {
    return O.of(++n).delay(10)
  }
  const queue = mkRequestQueue(request)
  return O.forkJoin([
    queue('https://example.com'),
    queue('https://example.com'),
  ]).do(([ first, second ]) => {
    t.is(first, 1)
    t.is(second, 1)
  })
})

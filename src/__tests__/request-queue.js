import test from 'ava'
import {delay, concatMap, tap, catchError} from 'rxjs/operators'
import {of} from 'rxjs/observable/of'
import {forkJoin} from 'rxjs/observable/forkJoin'
import {_throw as throwError} from 'rxjs/observable/throw'

import mkRequestQueue from '../request-queue'

test('request-queue should call the input request function', t => {
  t.plan(1)
  const request = () => {
    t.pass()
    return of(true)
  }
  return mkRequestQueue(request)('https://example.com')
})

test('request-queue should only make N requests in parallel and queue further requests until others are completed', t => {
  t.plan(1)
  let runningRequests = 0
  const request = () => {
    runningRequests++
    if (runningRequests > 4) t.fail()
    return of(true).pipe(delay(10))
  }
  const queue = mkRequestQueue(request)
  return forkJoin([
    queue('https://example.com'),
    queue('https://example.com'),
    queue('https://example.com'),
    queue('https://example.com'),
    queue('https://example.com'),
  ]).pipe(
      tap(() => {
        t.pass()
      }),
  )
})

test('request-queue should propagate errors', t => {
  t.plan(2)
  const error = 'YOLO'
  let i = 0
  const request = () => {
    return i++ === 0
        ? throwError(error)
        : of(true)
  }
  const queue = mkRequestQueue(request)
  return queue('https://example.com').pipe(
      catchError((err) => {
        t.is(err, error)
        return of(true)
      }),
      concatMap(() => queue('https://example.com')),
      tap(res => t.true(res)),
  )
})

test('request-queue should eliminate duplicate requests in the queue', t => {
  let n = 0
  const request = () => {
    return of(++n).pipe(delay(10))
  }
  const queue = mkRequestQueue(request)
  return forkJoin([
    queue('https://example.com'),
    queue('https://example.com'),
  ]).pipe(tap(([first, second]) => {
    t.is(first, 1)
    t.is(second, 1)
  }))
})

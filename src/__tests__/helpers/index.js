// @flow

import Rx, { Observable as O } from 'rxjs'
import EventTarget from 'dom-event-target'
import type { Cache } from '../../cache'

export const mockWorker = (
  maybePostMessage?: (
    message: any,
    postMessage: (message: any) => void
  ) => void
) => {
  const workerMock = new EventTarget()
  const postMessageFromWorker = (message) =>
    workerMock.send('message', { data: message })
  const postMessage =
    typeof maybePostMessage === 'function'
      ? maybePostMessage
      : () => {}
  workerMock.postMessage = (message, ignoreIntercept) => setTimeout(() =>
    ignoreIntercept
      ? postMessageFromWorker(message)
      : postMessage(message, postMessageFromWorker)
  )
  return workerMock
}

type CacheKey = [ string, string ]
type CacheMockOverrides = {
  get?: (key: CacheKey) => Rx.Observable<any>,
  set?: (key: CacheKey, value: any) => Rx.Observable<any>,
  has?: (key: CacheKey) => Rx.Observable<boolean>,
  delete?: (key: CacheKey) => Rx.Observable<true>,
  deletePattern?: (pattern: RegExp) => Rx.Observable<Array<true>>,
  clear?: () => Rx.Observable<true>,
}

export const mockCache = (
  overrides: CacheMockOverrides
): Cache<CacheKey> =>
  Object.assign({
    get: (key: CacheKey) => O.of(undefined),
    set: (key: CacheKey, value: string) => O.of(value),
    has: (key: CacheKey) => O.of(true),
    delete: (key: CacheKey) => O.of(true),
    deletePattern: (pattern: RegExp) => O.of([true]),
    clear: () => O.of(true),
  }, overrides)

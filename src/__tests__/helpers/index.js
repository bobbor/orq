// @flow

import Rx, { Observable as O } from 'rxjs'
import EventTarget from 'dom-event-target'
import type { Cache } from '../../cache'

const serializable = (x) => JSON.parse(
  JSON.stringify(x)
)
export const mockWorker = () => {
  const worker = new EventTarget()
  const main = new EventTarget()
  main.postMessage = (message) => {
    setTimeout(() =>
      worker.send('message', { data: serializable(message) })
    )
  }
  worker.postMessage = (message) => {
    setTimeout(() =>
      main.send('message', { data: serializable(message) })
    )
  }
  return [main, worker]
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

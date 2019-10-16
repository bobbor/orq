// @flow

import { Observable as O} from 'rxjs/Observable'
import {of} from 'rxjs/observable/of'
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
  get?: (key: CacheKey) => O<any>,
  set?: (key: CacheKey, value: any) => O<any>,
  has?: (key: CacheKey) => O<boolean>,
  delete?: (key: CacheKey) => O<true>,
  deletePattern?: (pattern: RegExp) => O<Array<true>>,
  clear?: () => O<true>,
}

export const mockCache = (
  overrides: CacheMockOverrides
): Cache<CacheKey> =>
  Object.assign({
    get: (key: CacheKey) => of(undefined),
    set: (key: CacheKey, value: string) => of(value),
    has: (key: CacheKey) => of(true),
    delete: (key: CacheKey) => of(true),
    deletePattern: (pattern: RegExp) => of([true]),
    clear: () => of(true),
  }, overrides)

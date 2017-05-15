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

type CacheMockOverrides = {
  get?: (key: string) => Rx.Observable<any>,
  set?: (key: string, value: any) => Rx.Observable<any>,
  has?: (key: string) => Rx.Observable<boolean>,
  delete?: (key: string) => Rx.Observable<true>,
  clear?: () => Rx.Observable<true>,
}

export const mockCache = (
  overrides: CacheMockOverrides
): Cache =>
  Object.assign({
    get: (key: string) => O.of(undefined),
    set: (key: string, value: string) => O.of(value),
    has: (key: string) => O.of(true),
    delete: (key: string) => O.of(true),
    clear: () => O.of(true),
  }, overrides)

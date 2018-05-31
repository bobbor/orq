// @flow

import { Observable as O } from 'rxjs/Observable'
import { Notification } from 'rxjs/Notification'
// $FlowFixMe
import 'rxjs/add/observable/fromEvent'
// $FlowFixMe
import 'rxjs/add/operator/filter'
// $FlowFixMe
import 'rxjs/add/operator/pluck'
// $FlowFixMe
import 'rxjs/add/operator/dematerialize'
// $FlowFixMe
import 'rxjs/add/operator/do'
// $FlowFixMe
import 'rxjs/add/operator/map'

import {
  isResponseMsg,
  isMsgType,
  msg,
  unsubscribe,
  REQUEST,
  RESPONSE_NOTIFICATION,
  CLEAR_CACHE,
  INVALIDATE,
} from './lib/message'
import type { Message } from './lib/message'
import type { HttpMethods } from './request'

export type RequestOptions <RequestPayload> = {
  body?: RequestPayload,
  method?: HttpMethods,
  headers?: { [string]: string },
  fromRemote?: boolean,
  cacheResponse?: boolean,
  cancelable?: boolean,
  redirects?: number,
}

const mkInterface = <UrlMap, Responses> (
  worker: Worker
) => {
  const postMessageToWorker = postMessageTo(worker)

  return {
    addRequest: <RequestPayload, Response>(
      url: string,
      options?: RequestOptions<RequestPayload>
    ): rxjs$Observable<Response> =>
      O.create((observer) => {
        postMessageToWorker(
          msg(REQUEST, { url, options }),
          isCancelable(options)
        )
          .subscribe(observer)
      }),
    clear: (): rxjs$Observable<void> =>
      postMessageToWorker(
        msg(CLEAR_CACHE)
      ),
    invalidate: (url: string, method?: string): rxjs$Observable<void> =>
      postMessageToWorker(
        msg(INVALIDATE, { url, method })
      ),
  }
}

const postMessageTo = (worker: Worker) => {
  const responseNotifications$ = O.fromEvent(worker, 'message')
    .pluck('data')

  return (message: Message<any>, cancelable?: boolean) =>
    O.create((o) => {
      let done = false
      worker.postMessage(message)
      responseNotifications$
        .filter(isResponseMsg(message))
        .pluck('payload')
        .map(({ kind, value, error }) =>
          new Notification(kind, value, error)
        )
        .dematerialize()
        .do(undefined, undefined, () => { done = true })
        .subscribe(o)
      const teardown = () => {
        if (done) return
        worker.postMessage(unsubscribe(message))
      }
      if (cancelable) {
        return teardown
      }
    })
}

const isCancelable = (options) => {
  if (!options) return false
  return options.cancelable === undefined
    ? options.method && options.method !== 'GET'
    : options.cancelable
}

export default mkInterface

// @flow

import Rx, { Observable as O } from 'rxjs/Observable'

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

type RequestOptions <RequestPayload> = {
  body?: RequestPayload,
  method?: HttpMethods,
  headers?: { [string]: string },
  fromRemote?: boolean,
  cacheResponse?: boolean,
  cancelable?: boolean,
}

const mkRequestQueueInterface = <UrlMap, Responses> (
  worker: Worker
) => {
  const postMessageToWorker = postMessageTo(worker)

  return {
    addRequest: <RequestPayload, Response>(
      url: string,
      options?: RequestOptions<RequestPayload>
    ): Rx.Observable<Response> =>
      postMessageToWorker(
        msg(REQUEST, { url, options }),
        options ? options.cancelable : false
      ),
    clear: (): Rx.Observable<void> =>
      postMessageToWorker(
        msg(CLEAR_CACHE)
      ),
    invalidate: (url: string, method?: string): Rx.Observable<void> =>
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

export default mkRequestQueueInterface

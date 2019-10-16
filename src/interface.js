// @flow

import { Observable as O} from 'rxjs/Observable'
import {Notification} from 'rxjs/Notification'
import {fromEvent} from 'rxjs/observable/fromEvent'

import {
  filter, pluck, dematerialize, tap, map
} from 'rxjs/operators'

import {
  isResponseMsg,
  msg,
  unsubscribe,
  REQUEST,
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
  const responseNotifications$ = fromEvent(worker, 'message').pipe(
    pluck('data')
  )

  return (message: Message<any>, cancelable?: boolean) =>
    O.create((o) => {
      let done = false
      worker.postMessage(message)
      responseNotifications$.pipe(
        filter(isResponseMsg(message)),
        pluck('payload'),
        map(({ kind, value, error }) =>
          new Notification(kind, value, error)
        ),
        dematerialize(),
        tap(undefined, undefined, () => { done = true })
      ).subscribe(o)
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

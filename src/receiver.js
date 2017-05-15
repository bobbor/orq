// @flow

import Rx, { Observable as O, Notification } from 'rxjs'

import {
  msg,
  isMsg,
  REQUEST,
  UNSUBSCRIBE,
  RESPONSE_NOTIFICATION,
  CLEAR_CACHE,
  INVALIDATE,
} from './lib/message'

import type { Cache } from './cache'
import type { RequestOptions } from './request'

type AddRequest = (
  url: string,
  options?: RequestOptions
) => Rx.Observable<any>

const mkRequestQueueReceiver = <Res>(
  worker: Worker,
  addRequest: AddRequest,
  cache: Cache,
): void => {
  O.fromEvent(worker, 'message')
    .pluck('data')
    .filter(isMsg)
    .groupBy(({ id }) => id)
    .subscribe(
      message$ => {
        // FIXME: this is fucked. find a better way!
        let message
        let testSub

        const sub = message$
          .do(tmpMessage => {
            message = tmpMessage
          })
          .do(() => {
            if (message.type === UNSUBSCRIBE) {
              sub.unsubscribe()
            }
          })
          .concatMap(() => {
            const { type, id, payload } = message
            const options = Object.assign(
              (payload && payload.options) || {},
              { method: 'GET' }
            )
            if (type === REQUEST) {
              const { url } = payload
              const key = genCacheKey(url, options)
              return cache.get(key)
                .concatMap(cachedValue =>
                  cachedValue
                    ? O.of(cachedValue)
                    : addRequest(url, options)
                      .concatMap(newValue =>
                        cache.set(key, newValue)
                      )
                )
            } else if (type === INVALIDATE) {
              const { url } = payload
              const key = genCacheKey(url, options)
              return cache.delete(key)
            } else if (type === CLEAR_CACHE) {
              return cache.clear()
            } else {
              return O.empty()
            }
          })
          .materialize()
          .subscribe(
            notification => {
              const { type, id } = message
              worker.postMessage(msg(
                type,
                notification,
                id
              ))
            },
            error => { console.error(error) }
          )
      },
      error => { console.error(error) }
    )
}

const genCacheKey = (url: string, options: RequestOptions) =>
  `${options.method || 'GET'}:${url}`

export default mkRequestQueueReceiver

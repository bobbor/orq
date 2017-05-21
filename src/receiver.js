// @flow

import { Observable as O } from 'rxjs/Observable'
import { Notification } from 'rxjs/Notification'
import { Subject } from 'rxjs/Subject'
// $FlowFixMe
import 'rxjs/add/observable/of'
// $FlowFixMe
import 'rxjs/add/observable/empty'
// $FlowFixMe
import 'rxjs/add/operator/pluck'
// $FlowFixMe
import 'rxjs/add/operator/filter'
// $FlowFixMe
import 'rxjs/add/operator/takeUntil'
// $FlowFixMe
import 'rxjs/add/operator/groupBy'
// $FlowFixMe
import 'rxjs/add/operator/do'
// $FlowFixMe
import 'rxjs/add/operator/concatMap'
// $FlowFixMe
import 'rxjs/add/operator/materialize'

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
) => rxjs$Observable<any>

const mkRequestQueueReceiver = <Res>(
  worker: Worker,
  addRequest: AddRequest,
  cache: Cache<[ string, string ]>,
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
        const done$ = new Subject()

        const sub = message$
          .takeUntil(done$)
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
              { method: 'GET' },
              (payload && payload.options) || {}
            )
            if (type === REQUEST) {
              const { url } = payload
              const { method } = options
              return cache.get([ method, url ])
                .concatMap(cachedValue =>
                  cachedValue
                    ? O.of(cachedValue)
                    : addRequest(url, options)
                      .concatMap(newValue =>
                        cache.set([ method, url ], newValue)
                      )
                )
            } else if (type === INVALIDATE) {
              const { url } = payload
              const { method } = options
              return cache.delete([ method, url ])
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
              done$.next(true)
            },
            error => { console.error(error) }
          )
      },
      error => { console.error(error) }
    )
}

export default mkRequestQueueReceiver

// @flow

import {
  Subject,
  fromEvent,
  of, empty,
} from 'rxjs'

import {
  pluck,
  filter,
  groupBy,
  concatMap,
  takeUntil,
  tap,
  materialize,
} from 'rxjs/operators'

import {
  msg,
  isMsg,
  REQUEST,
  UNSUBSCRIBE,
  CLEAR_CACHE,
  INVALIDATE,
} from './lib/message'

import type {Cache} from './cache'
import type {RequestOptions} from './request'

type AddRequest = (
    url: string,
    options?: RequestOptions,
) => rxjs$Observable<any>

const mkRequestQueueReceiver = <Res>(
    worker: Worker,
    addRequest: AddRequest,
    cache: Cache<[string, string]>,
): void => {
  fromEvent(worker, 'message').pipe(
      pluck('data'),
      filter(isMsg),
      groupBy(({id}) => id),
  ).subscribe(message$ => {
        let message
        const done$ = new Subject()

        const sub = message$.pipe(
            takeUntil(done$),
            tap(tmpMessage => {
              message = tmpMessage
            }),
            tap(() => {
              if (message.type === UNSUBSCRIBE) {
                sub.unsubscribe()
              }
            }),
            concatMap(() => {
              const {type, payload} = message
              const options = Object.assign(
                  {method: 'GET'},
                  (payload && payload.options) || {},
              )
              if (type === REQUEST) {
                const {url} = payload
                const {method} = options
                return cache.get([method, url]).pipe(
                    concatMap(cachedValue =>
                        cachedValue
                            ? of(cachedValue)
                            : addRequest(url, options)
                            .pipe(concatMap(newValue =>
                                cache.set([method, url], newValue),
                            )),
                    ),
                )
              } else if (type === INVALIDATE) {
                const {url} = payload
                const {method} = options
                return cache.delete([method, url])
              } else if (type === CLEAR_CACHE) {
                return cache.clear()
              } else {
                return empty()
              }
            }),
            materialize(),
        ).subscribe(notification => {
              const {type, id} = message
              worker.postMessage(msg(
                  type,
                  notification,
                  id,
              ))
              done$.next(true)
            },
            error => {
              console.error(error)
            },
        )
      },
      error => {
        console.error(error)
      },
  )
}

export default mkRequestQueueReceiver

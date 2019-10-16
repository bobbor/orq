/**
 * request-queue manages request concurrency and eliminates duplicate requests.
 */

import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import {
  map,
  tap,
  share,
  materialize,
  dematerialize,
  filter,
  mergeAll
} from 'rxjs/operators'
import type { Request, RequestOptions } from './request'

const defaultOptions = {
  maxConcurrent: 4,
}

export const mkRequestQueue = (
  request: Request,
  options?: {
    maxConcurrent?: number,
  } = {}
): Request => {
  const { maxConcurrent } = Object.assign(
    {},
    defaultOptions,
    options
  )

  const duplicateTracker = ((openRequests: Array<[ Symbol, string ]>) => ({
    has: (needleUrl) => openRequests.find(([ , url ]) => needleUrl === url),
    get: (needleUrl) => {
      const found = duplicateTracker.has(needleUrl)
      return found
        ? found[0]
        : undefined
    },
    add: (key, url) => {
      openRequests.push([ key, url ])
    },
    drop: (dropKey) => {
      openRequests = openRequests.filter(([ key ]) => key !== dropKey)
    },
  }))([])
  const requests$ = new BehaviorSubject()
  const responses$ = requests$.pipe(mergeAll(maxConcurrent))

  return (
    url: string,
    reqOptions?: RequestOptions = {}
  ) => {
    const { method = 'GET' } = reqOptions
    let key = Symbol(`${method} ${url}`)
    if (method === 'GET' && duplicateTracker.has(url)) {
      key = duplicateTracker.get(url)
    } else {
      if (method === 'GET') {
        duplicateTracker.add(key, url)
      }
      requests$.next(
        request(url, reqOptions).pipe(
            share(),
            materialize(),
            map(notification => [key, notification]),
            tap(() => duplicateTracker.drop(key))
        )
      )
    }
    return responses$.pipe(
      filter(([ resKey ]) => resKey === key),
      map(([, notification]) => notification),
      dematerialize()
    )
  }
}

export default mkRequestQueue

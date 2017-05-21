/**
 * request-queue manages request concurrency and eliminates duplicate requests.
 */

import { BehaviorSubject } from 'rxjs/BehaviorSubject'
// $FlowFixMe
import 'rxjs/add/operator/map'
// $FlowFixMe
import 'rxjs/add/operator/do'
// $FlowFixMe
import 'rxjs/add/operator/share'
// $FlowFixMe
import 'rxjs/add/operator/materialize'
// $FlowFixMe
import 'rxjs/add/operator/dematerialize'
// $FlowFixMe
import 'rxjs/add/operator/filter'
// $FlowFixMe
import 'rxjs/add/operator/mergeAll'

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
  const test = Symbol()

  const requests$ = new BehaviorSubject()
  const responses$ = requests$
    .mergeAll(maxConcurrent)

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
        request(url, reqOptions)
          .share()
          .materialize()
          .map(notification => [key, notification])
          .do((n) => duplicateTracker.drop(key))
      )
    }
    return responses$
      .filter(([ resKey ]) => resKey === key)
      .map(([, notification]) => notification)
      .dematerialize()
  }
}

export default mkRequestQueue

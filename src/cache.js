// @flow

import Rx from 'rxjs'

export type Cache<K> = {
  get: (key: K) => Rx.Observable<any>,
  set: (key: K, value: any) => Rx.Observable<any>,
  has: (key: K) => Rx.Observable<boolean>,
  delete: (key: K) => Rx.Observable<true>,
  deletePattern: (keyPattern: RegExp) => Rx.Observable<Array<true>>,
  clear: () => Rx.Observable<true>,
}

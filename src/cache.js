// @flow
import { Observable as O } from 'rxjs/Observable'

export type Cache<K> = {
  get: (key: K) => O<any>,
  set: (key: K, value: any) => O<any>,
  has: (key: K) => O<boolean>,
  delete: (key: K) => O<true>,
  clear: () => O<true>,
}

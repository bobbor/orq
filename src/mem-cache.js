/**
 * @flow
 *
 * TODO: evaluate saving items to LocalStorage to preserve memory. All
 * response objects are in memory twice. That's kinda fucked. Writting to
 * LocalStorage will allow me to delete the item in memory. It might even be
 * feasible to store everything only in LocalStorage. Especially since most
 * browsers don't handle interactions with LocalStorage as simple disk write/
 * reads. Instead they keep objects in memory and keep disk writes to a
 * minimum. That could have the effect, that all objects would be kept in
 * memory. This has to be tested.
 * TODO: Kap cache object size.
 */

import { throwError, of} from 'rxjs'

const undefinedValueError = 'undefined may not be passed as a value to setItem.'

const mkMemCache = <Value>() => {
  let store = {}

  const cache = {
    delete: (key: string) => {
      delete store[key]
      return of(true)
    },
    set: (key: string, value: Value) => {
      if (value === undefined) {
        return throwError(new Error(undefinedValueError))
      }
      store[key] = value
      return of(value)
    },
    has: (key: string) => {
      return of(store.hasOwnProperty(key))
    },
    get: (key: string): rxjs$Observable<Value|void> => {
      return cache.has(key)
        ? of(store[key])
        : of(undefined)
    },
    clear: () => {
      store = {}
      return of(true)
    }
  }
  return cache
}

export default mkMemCache

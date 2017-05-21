// @flow

export type Cache<K> = {
  get: (key: K) => rxjs$Observable<any>,
  set: (key: K, value: any) => rxjs$Observable<any>,
  has: (key: K) => rxjs$Observable<boolean>,
  delete: (key: K) => rxjs$Observable<true>,
  clear: () => rxjs$Observable<true>,
}

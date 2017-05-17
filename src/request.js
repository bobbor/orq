// @flow

import { Observable } from 'rxjs'

export type HttpMethods =
  'GET' |
  'HEAD' |
  'POST' |
  'PUT' |
  'PATCH' |
  'OPTIONS' |
  'CONNECT' |
  'TRACE'

export type RequestOptions = {
  body?: any,
  method?: HttpMethods,
  headers?: { [string]: string },
  fromRemote?: boolean,
  cacheResponse?: boolean,
  cancelable?: boolean,
}

export type Request = (
  url: string,
  options?: RequestOptions
) => Observable<any>

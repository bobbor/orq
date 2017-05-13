// @flow

import { v4 as uuid } from 'uuid'

export type Message<P> = {|
  id: string,
  type: string,
  payload?: P,
|}

export const isMsg = <P>(message: Message<P>) =>
  typeof message === 'object'

export const isMsgType = (type: string) => <P>(message: Message<P>) =>
  isMsg(message) && message.type === type

export const msg = <P>(type: string, payload?: P, id?: string): Message<P> => ({
  type,
  payload,
  id: id || uuid(),
})

export const unsubscribe = <P>({ id }: Message<P>) => ({
  type: UNSUBSCRIBE,
  id
})

export const isResponseMsg = <P>({ type, id }: Message<P>) => (message: Message<P>) =>
  isMsg(message) &&
  message.id === id

export const REQUEST = 'REQUEST'
export const RESPONSE_NOTIFICATION = 'RESPONSE_NOTIFICATION'
export const UNSUBSCRIBE = 'UNSUBSCRIBE'
export const CLEAR_CACHE = 'CLEAR_CACHE'
export const INVALIDATE = 'INVALIDATE'

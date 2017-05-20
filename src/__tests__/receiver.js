// @flow

import test from 'ava'
import { Observable as O } from 'rxjs'

import { mockWorker, mockCache } from './helpers'
import {
  msg,
  isResponseMsg,
  REQUEST,
  UNSUBSCRIBE,
  RESPONSE_NOTIFICATION,
  CLEAR_CACHE,
  INVALIDATE,
} from '../lib/message'
import mkReceiver from '../receiver'

import type { Cache } from '../cache'

test.cb('should listen for REQUEST messages from worker and query the cache.', t => {
  const response = 'Cached Response'
  const url = `https://example.com`
  const addRequestMock = () => O.of(response)
  const cacheMock = mockCache({
    get: (key: [ string, string ]) => {
      t.deepEqual(key, ['GET', url])
      t.end()
      return O.of('Cached Response')
    }
  })
  const [main, worker] = mockWorker()

  mkReceiver(worker, addRequestMock, cacheMock)
  main.postMessage(msg(REQUEST, { url }))
})

test.cb('should cancel the request when an UNSUBSCRIBE message is received', t => {
  const response = 'Cached Response'
  const url = `https://example.com`
  const addRequestMock = () => O.create((o) => () => {
    t.pass()
    t.end()
  })
  const cacheMock = mockCache({})
  const [main, worker] = mockWorker()

  mkReceiver(worker, addRequestMock, cacheMock)
  const requestMessage = msg(REQUEST, { url })
  main.postMessage(requestMessage)
  setTimeout(() => {
    main.postMessage(msg(UNSUBSCRIBE, undefined, requestMessage.id))
  })
})

test.cb('should call `addRequest` if there is a cache miss.', t => {
  const response = 'Requested Response'
  const url = `https://example.com`
  const addRequestMock = () => {
    t.pass()
    t.end()
    return O.of(response)
  }
  const cacheMock = mockCache({})
  const [main, worker] = mockWorker()

  mkReceiver(worker, addRequestMock, cacheMock)
  const requestMessage = msg(REQUEST, { url })
  main.postMessage(requestMessage)
})

test.cb('should send the response back to the worker with the request id and the type RESPONSE_NOTIFICATION', t => {
  const response = 'Requested Response'
  const url = `https://example.com`
  const addRequestMock = () => O.of(response)
  const cacheMock = mockCache({})
  const requestMessage = msg(REQUEST, { url })
  const [main, worker] = mockWorker()
  main.addEventListener('message', ({ data: message }) => {
    t.is(message.id, requestMessage.id)
    t.is(message.payload.value, response)
    t.end()
  })

  mkReceiver(worker, addRequestMock, cacheMock)
  main.postMessage(requestMessage)
})

test.cb('should insert the response from `addRequest` into the cache.', t => {
  const response = 'Requested Response'
  const url = `https://example.com`
  const addRequestMock = () => O.of(response)
  const cacheMock = mockCache({
    set: (key: [ string, string ], value: string) => {
      t.is(value, response)
      t.end()
      return O.of(value)
    }
  })
  const [main, worker] = mockWorker()

  mkReceiver(worker, addRequestMock, cacheMock)
  const requestMessage = msg(REQUEST, { url })
  main.postMessage(requestMessage, true)
})

test.cb('should call `clear` on the cache if it receives a CLEAR_CACHE message.', t => {
  const addRequestMock = () => O.of(true)
  const cacheMock = mockCache({
    clear: () => {
      t.pass()
      t.end()
      return O.empty()
    }
  })
  const [main, worker] = mockWorker()

  mkReceiver(worker, addRequestMock, cacheMock)
  main.postMessage(msg(CLEAR_CACHE), true)
})

test.cb('should `delete` a given item if it receives a INVALIDATE message.', t => {
  const url = `https://example.com`
  const addRequestMock = () => O.of(true)
  const cacheMock = mockCache({
    delete: (key: [ string, string ]) => {
      t.deepEqual(key, ['GET', url])
      t.end()
      return O.empty()
    }
  })
  const [main, worker] = mockWorker()

  mkReceiver(worker, addRequestMock, cacheMock)
  main.postMessage(msg(INVALIDATE, { url }), true)
})

test.cb('should propagate errors', t => {
  const url = `https://example.com`
  const error = 'Fancy Error'
  const addRequestMock = () => O.throw(error)
  const cacheMock = mockCache({})
  const [main, worker] = mockWorker()
  main.addEventListener('message', ({ data: message }) => {
    t.is(message.payload.error, error)
    t.end()
  })

  mkReceiver(worker, addRequestMock, cacheMock)
  main.postMessage(msg(REQUEST, { url }), true)
})

test.cb('should send back a complete message', t => {
  const url = `https://example.com`
  const addRequestMock = () => O.of(true)
  const cacheMock = mockCache({})
  const [main, worker] = mockWorker()
  main.addEventListener('message', ({ data: message }) => {
    if (message.payload.kind === 'N') return
    t.is(message.payload.kind, 'C')
    t.end()
  })

  mkReceiver(worker, addRequestMock, cacheMock)
  main.postMessage(msg(REQUEST, { url }), true)
})

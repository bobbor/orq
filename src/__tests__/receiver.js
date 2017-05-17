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
  const workerMock = mockWorker()

  mkReceiver(workerMock, addRequestMock, cacheMock)
  workerMock.postMessage(msg(REQUEST, { url }), true)
})

test.cb('should cancel the request when an UNSUBSCRIBE message is received', t => {
  const response = 'Cached Response'
  const url = `https://example.com`
  const addRequestMock = () => O.create((o) => () => {
    t.pass()
    t.end()
  })
  const cacheMock = mockCache({})
  const workerMock = mockWorker()

  mkReceiver(workerMock, addRequestMock, cacheMock)
  const requestMessage = msg(REQUEST, { url })
  workerMock.postMessage(requestMessage, true)
  setTimeout(() => {
    workerMock.postMessage(msg(UNSUBSCRIBE, undefined, requestMessage.id), true)
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
  const workerMock = mockWorker()

  mkReceiver(workerMock, addRequestMock, cacheMock)
  const requestMessage = msg(REQUEST, { url })
  workerMock.postMessage(requestMessage, true)
})

test.cb('should send the response back to the worker with the request id and the type RESPONSE_NOTIFICATION', t => {
  const response = 'Requested Response'
  const url = `https://example.com`
  const addRequestMock = () => O.of(response)
  const cacheMock = mockCache({})
  const requestMessage = msg(REQUEST, { url })
  const workerMock = mockWorker((message, postMessage) => {
    if (!isResponseMsg(requestMessage)(message)) {
      return postMessage(message)
    }
    t.is(message.id, requestMessage.id)
    t.is(message.payload.value, response)
    t.end()
  })

  mkReceiver(workerMock, addRequestMock, cacheMock)
  workerMock.postMessage(requestMessage, true)
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
  const workerMock = mockWorker()

  mkReceiver(workerMock, addRequestMock, cacheMock)
  const requestMessage = msg(REQUEST, { url })
  workerMock.postMessage(requestMessage, true)
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
  const workerMock = mockWorker()

  mkReceiver(workerMock, addRequestMock, cacheMock)
  workerMock.postMessage(msg(CLEAR_CACHE), true)
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
  const workerMock = mockWorker()

  mkReceiver(workerMock, addRequestMock, cacheMock)
  workerMock.postMessage(msg(INVALIDATE, { url }), true)
})

test('should propagate errors', t => {
  const url = `https://example.com`
  const addRequestMock = () => O.throw(new Error)
  const cacheMock = mockCache({})
  const workerMock = mockWorker((msg) => { console.log(msg) })

  mkReceiver(workerMock, addRequestMock, cacheMock)
  workerMock.postMessage(msg(REQUEST, { url }), true)
})

// @flow

import test from 'ava'
import { Notification } from 'rxjs'
import EventTarget from 'dom-event-target'

import { Observable as O } from 'rxjs/Observable'

import {
  UNSUBSCRIBE,
  RESPONSE_NOTIFICATION,
  REQUEST,
  CLEAR_CACHE,
  INVALIDATE,
} from '../lib/message'
import mkRequestQueueInterface from '../interface'

const mockWorker = postMessage => {
  const workerMock = new EventTarget()
  const postMessageFromWorker = (message) =>
    workerMock.send('message', { data: message })
  workerMock.postMessage = (message) =>
    setTimeout(() => postMessage(message, postMessageFromWorker))
  return workerMock
}

test('addRequest should send the worker an object with an id, a type and a payload containing request options', (t) => {
  t.plan(3)
  const workerMock = mockWorker((message, postMessage) => {
    t.true(typeof message.id === 'string')
    t.is(message.type, REQUEST)
    t.is(message.payload.url, 'https://example.com')
    postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
  })
  return mkRequestQueueInterface(workerMock)
    .addRequest('https://example.com')
})

test.cb('addRequest should not propagate `unsubscribe` if not specified in the options', (t) => {
  t.plan(1)
  const workerMock = mockWorker((message, postMessage) => {
    t.is(message.type, REQUEST)
  })

  mkRequestQueueInterface(workerMock)
    .addRequest('https://example.com')
    .subscribe()
    .unsubscribe()
  setTimeout(() => t.end())
})

test.cb('addRequest should propagate `unsubscribe` if specified in the options', (t) => {
  t.plan(1)
  const workerMock = mockWorker((message, postMessage) => {
    if (message.type === REQUEST) return
    t.is(message.type, UNSUBSCRIBE)
    setTimeout(() => {
      postMessage({
        id: message.id,
        type: RESPONSE_NOTIFICATION,
        payload: Notification.createComplete(),
      })
    })
    t.end()
  })

  mkRequestQueueInterface(workerMock)
    .addRequest('https://example.com', { cancelable: true })
    .subscribe()
    .unsubscribe()
})

test('`clear` should send a clear message to the worker.', t => {
  t.plan(1)
  const workerMock = mockWorker((message, postMessage) => {
    t.is(message.type, CLEAR_CACHE)

    postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
  })

  return mkRequestQueueInterface(workerMock).clear()
})

test('`invalidate` should send an invalidate message message to the worker.', t => {
  t.plan(3)
  const workerMock = mockWorker((message, postMessage) => {
    t.is(message.payload.url, 'url')
    t.is(message.payload.method, 'method')
    t.is(message.type, INVALIDATE)

    postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
  })

  return mkRequestQueueInterface(workerMock).invalidate('url', 'method')
})

// @flow

import test from 'ava'
import { Notification, Observable as O } from 'rxjs'

import { mockWorker } from './helpers'
import {
  UNSUBSCRIBE,
  RESPONSE_NOTIFICATION,
  REQUEST,
  CLEAR_CACHE,
  INVALIDATE,
} from '../lib/message'
import mkInterface from '../interface'

test('addRequest should send the worker an object with an id, a type and a payload containing request options', (t) => {
  t.plan(3)
  const [main, worker] = mockWorker()
  worker.addEventListener('message', ({ data: message }) => {
    t.true(typeof message.id === 'string')
    t.is(message.type, REQUEST)
    t.is(message.payload.url, 'https://example.com')
    worker.postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
  })
  return mkInterface(main)
    .addRequest('https://example.com')
})

test.cb('addRequest should not propagate `unsubscribe` if not specified in the options', (t) => {
  t.plan(1)
  const [main, worker] = mockWorker()
  worker.addEventListener('message', ({ data: message }) => {
    t.is(message.type, REQUEST)
  })

  mkInterface(main)
    .addRequest('https://example.com')
    .subscribe()
    .unsubscribe()
  setTimeout(() => t.end())
})

test.cb('addRequest should propagate `unsubscribe` if specified in the options', (t) => {
  t.plan(1)
  const [main, worker] = mockWorker()
  worker.addEventListener('message', ({ data: message }) => {
    if (message.type === REQUEST) return
    t.is(message.type, UNSUBSCRIBE)
    worker.postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
    t.end()
  })

  mkInterface(main)
    .addRequest('https://example.com', { cancelable: true })
    .subscribe()
    .unsubscribe()
})

test('addRequest should redo a request when a new subscription is made', (t) => {
  t.plan(2)
  const [main, worker] = mockWorker()

  let id = null
  worker.addEventListener('message', ({ data: message }) => {
    t.true(id !== message.id)
    id = message.id
    worker.postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
  })

  const r$ = mkInterface(main)
    .addRequest('https://example.com')

  return O.merge(r$, r$)
})

test('`clear` should send a clear message to the worker.', t => {
  t.plan(1)
  const [main, worker] = mockWorker()
  worker.addEventListener('message', ({ data: message }) => {
    t.is(message.type, CLEAR_CACHE)

    worker.postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
  })

  return mkInterface(main).clear()
})

test('`invalidate` should send an invalidate message message to the worker.', t => {
  t.plan(3)
  const [main, worker] = mockWorker()
  worker.addEventListener('message', ({ data: message }) => {
    t.is(message.payload.url, 'url')
    t.is(message.payload.method, 'method')
    t.is(message.type, INVALIDATE)

    worker.postMessage({
      id: message.id,
      type: RESPONSE_NOTIFICATION,
      payload: Notification.createComplete(),
    })
  })

  return mkInterface(main).invalidate('url', 'method')
})

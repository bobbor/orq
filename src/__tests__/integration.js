// @flow

import test from 'ava'

import { mockWorker } from './helpers'

import {
  mkInterface,
  mkReceiver,
  mkMemCache,
  mkCachePolicy,
  mkRequestQueue,
} from '../'

const mainThread = mockWorker()
const workerThread = mockWorker()
mkInterface(mainThread)

test.todo('')

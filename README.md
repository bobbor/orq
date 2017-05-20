# Observable Request Queue

[![Build Status](https://travis-ci.org/Kriegslustig/observable-request-queue.svg?branch=master)](https://travis-ci.org/Kriegslustig/observable-request-queue)

HTTP Request Queue Optmized for Web Workers.

## Why not Use Service Workers?

* Not widely available
* Requests aren't cancelable

## Issues

* cannot add type constraints on request and response bodies
* cache policy should limit cache item size

-----

_Developed at [Vimcar](https://vimcar.com/)._

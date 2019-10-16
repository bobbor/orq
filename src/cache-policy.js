/**
 * @flow
 * Enforces a caching policy. Essentially the policy is a TTL cache. But in
 * addition you can define dependencies between different resources.
 * By default cache-policy tries to do work in a RESTful manner.
 * E.g. if we have a resource `/user/${id}`, and a PUT is done on that same
 * resource, cache-policy will invalidate the cached `/user/${id}`.
 * If you have a more complex URL scheme, you can define dependencies between
 * resources. E.g.:
 * {
 *   "http://example.com": {
 *     "/list-fish": {
 *       "contains": [ "/fish", "/fish/*" ]
 *     }
 *   }
 * }
 * With the above policy, you set the `/list-fish` cache to be invalidated
 * whenever a POST is done on `/fish` or a PUT/PATH is done on `/fish/*`.
 */

import {
  of,
  from as rxFrom
} from 'rxjs'
import {
  concatMap,
  mapTo,
  mergeAll,
  toArray,
} from 'rxjs/operators'

import {dropLastSegment} from './lib/utils'
import type {Cache} from './cache'

// Arbitrary
const DEFAULT_TTL = 210

export type CacheKey = [string, string]
export type CachePolicy = {
  ttl?: number,
  resources?: {
    [BaseUrl: string]: {
      [Path: string]: {
        ttl?: number,
        contains?: Array<string>
      }
    }
  }
}

const mkCachePolicy =
    (policy: CachePolicy) => {
      const defaultTtl = typeof policy.ttl === 'number'
          ? policy.ttl
          : DEFAULT_TTL

      const baseUrls = Object.keys(policy.resources || {})
      const getBaseUrl = (url: string) =>
          baseUrls.find(baseUrl =>
              url.indexOf(baseUrl) === 0,
          )
      const getRessourcePolicy = (url: string, baseUrl?: string) => {
        const {resources} = policy
        if (typeof resources !== 'object') return undefined
        const matchingBaseUrl = baseUrl || getBaseUrl(url)
        if (matchingBaseUrl === undefined) return undefined
        const path = url.replace(matchingBaseUrl, '')
        return resources[matchingBaseUrl][path]
      }
      const cacheInvalidationRules: Array<[RegExp, string]> =
          baseUrls.reduce((rules, baseUrl) => {
            if (!policy.resources) return rules
            const resourcePolicy = policy.resources[baseUrl]
            if (!resourcePolicy) return rules
            const paths = Object.keys(resourcePolicy)
            return rules.concat(paths.reduce((pathRules, path) => {
              const contains = resourcePolicy[path].contains
              if (!contains) return pathRules
              return pathRules.concat(contains.reduce((containsRules, pattern) => {
                containsRules.push([
                  new RegExp(`^${baseUrl}${pattern}$`),
                  `${baseUrl}${path}`,
                ])
                return containsRules
              }, []))
            }, []))
          }, [])
      const getContainerUrls = (url: string): Array<string> =>
          cacheInvalidationRules
          .filter(([pattern]) => pattern.test(url))
          .map(([, url]) => url)
      const dependantCacheUrls = (url: string) => [
        url,
        dropLastSegment(1, url),
        ...getContainerUrls(url),
      ]

      return (cache: Cache<string>): Cache<CacheKey> => ({
        set: ([method, url]: CacheKey, value: any) => {
          const resourcePolicy = getRessourcePolicy(url)
          const ttl =
              resourcePolicy &&
              typeof resourcePolicy.ttl === 'number'
                  ? resourcePolicy.ttl
                  : defaultTtl
          if (ttl === 0) return of(value)
          return cache.set(genKey([method, url]), {
            validUntil: Date.now() + ttl,
            value,
          }).pipe(mapTo(value))
        },

        get: ([method, url]: CacheKey) => {
          const key = genKey([method, url])
          if (method === 'GET') {
            return cache.get(key)
            .pipe(concatMap((item) => {
              if (!item) return of(undefined)
              return item.validUntil > Date.now()
                  ? of(item.value)
                  : cache.delete(key).pipe(mapTo(undefined))
            }))
          } else if (
              method === 'PUT' ||
              method === 'PATCH' ||
              method === 'POST'
          ) {
            return rxFrom(
                dependantCacheUrls(url)
                .map(url => cache.delete(genKey(['GET', url]))),
            ).pipe(
                mergeAll(),
                toArray(),
                mapTo(undefined),
            )
          } else {
            return of(undefined)
          }
        },
        has: (cacheKey: CacheKey) => cache.has(genKey(cacheKey)),
        delete: (cacheKey: CacheKey) => cache.delete(genKey(cacheKey)),
        clear: cache.clear,
      })
    }

const genKey = ([method: string, url: string]) =>
    `${method}:${url}`

export default mkCachePolicy

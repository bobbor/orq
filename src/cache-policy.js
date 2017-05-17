/**
 * @flow
 * Enforces a caching policy. Essentially the policy is a TTL cache. But in
 * addition you can define dependencies between different ressources.
 * By default cache-policy tries to do work in a RESTful manner.
 * E.g. if we have a ressource `/user/${id}`, and a PUT is done on that same
 * ressource, cache-policy will invalidate the cached `/user/${id}`.
 * If you have a more complex URL scheme, you can define dependencies between
 * ressources. E.g.:
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

import { Observable as O } from 'rxjs'

import { dropLastSegment } from './lib/utils'
import type { Cache } from './cache'

// Arbitrary
const DEFAULT_TTL = 210

export type CacheKey = [ string, string ]
export type CachePolicy = {
  ttl?: number,
  ressources?: {
    [BaseUrl: string]: {
      [Path: string]: {
        ttl?: number,
        containedIn?: Array<string>
      }
    }
  }
}

const mkCachePolicy =
  (policy: CachePolicy) => {
    const defaultTtl = policy.ttl || DEFAULT_TTL

    const baseUrls = Object.keys(policy.ressources || {})
    const getBaseUrl = (url: string) =>
      baseUrls.find(baseUrl =>
        url.indexOf(baseUrl) === 0
      )
    const getRessourcePolicy = (url: string, baseUrl?: string) => {
      const { ressources } = policy
      if (typeof ressources !== 'object') return undefined
      const matchingBaseUrl = baseUrl || getBaseUrl(url)
      if (matchingBaseUrl === undefined) return undefined
      const path = url.replace(matchingBaseUrl, '')
      return ressources[matchingBaseUrl][path]
    }
    const patternsInPolicy = (url: string) => {
      const baseUrl = getBaseUrl(url)
      if (!baseUrl) return []
      const ressourcePolicy = getRessourcePolicy(url, baseUrl)
      if (!ressourcePolicy || !ressourcePolicy.containedIn) return []
      return ressourcePolicy.containedIn.map(pattern =>
        new RegExp(`^GET:${baseUrl}${pattern}$`)
      )
    }
    const dependantCacheUrls = (url: string) => [
      url,
      dropLastSegment(1, url),
      ...patternsInPolicy(url)
    ]

    return (cache: Cache<string>): Cache<CacheKey> => ({
      set: ([ method, url ]: CacheKey, value: any) => {
        const ressourcePolicy = getRessourcePolicy(url)
        const ttl =
          ressourcePolicy &&
          typeof ressourcePolicy.ttl === 'number'
            ? ressourcePolicy.ttl
            : defaultTtl
        return cache.set(genKey([method, url]), {
          validUntil: Date.now() + ttl,
          value,
        })
      },

      get: ([ method, url ]: CacheKey) => {
        const key = genKey([ method, url ])
        if (method === 'GET') {
          return cache.get(key)
            .concatMap((item) => {
              if (!item) return O.of(undefined)
              return item.validUntil > Date.now()
                ? O.of(item.value)
                : cache.delete(key)
                  .mapTo(undefined)
            })
        } else if (
          method === 'PUT' ||
          method === 'PATCH' ||
          method === 'POST'
        ) {
          return O.from(
            dependantCacheUrls(url)
              .map(patternOrUrl =>
                typeof patternOrUrl === 'string'
                  ? cache.delete(genKey(['GET', patternOrUrl]))
                  : cache.deletePattern(patternOrUrl)
              )
          ).mergeAll().toArray().mapTo(undefined)
        } else {
          return O.of(undefined)
        }
      },
      has: (cacheKey: CacheKey) => cache.has(genKey(cacheKey)),
      delete: (cacheKey: CacheKey) => cache.delete(genKey(cacheKey)),
      deletePattern: cache.deletePattern,
      clear: cache.clear
    })
  }

const genKey = ([ method: string, url: string ]) =>
  `${method}:${url}`

export default mkCachePolicy

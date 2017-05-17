/**
 * @flow
 * General small utility functions
 */

export const dropLastSegment = (n: number, url: string): string =>
  url.split('/')
    .slice(0, n * -1)
    .join('/')

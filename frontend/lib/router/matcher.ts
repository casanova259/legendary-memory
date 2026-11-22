/**
 * Match a pathname against a route pattern (e.g., /scorer/matches/:id or /admin/*)
 */
export function matchPath(
  pattern: string,
  pathname: string,
  exact = false
): { matches: boolean; params: Record<string, string> } {
  // Normalize leading/trailing slashes
  const cleanPattern = pattern === '/' ? '/' : pattern.replace(/\/+$/, '');
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

  if (pattern === '*') {
    return { matches: true, params: {} };
  }

  const patternSegments = cleanPattern.split('/').filter(Boolean);
  const pathSegments = cleanPath.split('/').filter(Boolean);

  // If exact, lengths must match
  if (exact && patternSegments.length !== pathSegments.length) {
    return { matches: false, params: {} };
  }

  // If wildcard suffix e.g. /admin/*
  const hasWildcardSuffix = patternSegments[patternSegments.length - 1] === '*';
  const matchLength = hasWildcardSuffix ? patternSegments.length - 1 : patternSegments.length;

  if (hasWildcardSuffix) {
    if (pathSegments.length < matchLength) {
      return { matches: false, params: {} };
    }
  } else if (!exact) {
    if (pathSegments.length < matchLength) {
      return { matches: false, params: {} };
    }
  } else {
    if (pathSegments.length !== matchLength) {
      return { matches: false, params: {} };
    }
  }

  const extractedParams: Record<string, string> = {};

  for (let i = 0; i < matchLength; i++) {
    const pSeg = patternSegments[i];
    const pathSeg = pathSegments[i];

    if (pSeg.startsWith(':')) {
      const paramName = pSeg.slice(1);
      extractedParams[paramName] = decodeURIComponent(pathSeg);
    } else if (pSeg !== pathSeg) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params: extractedParams };
}

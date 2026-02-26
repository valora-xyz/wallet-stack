/**
 * Recursively strips values that are not useful to send through serialization
 * boundaries (e.g. React Native native bridge, URL params, analytics payloads).
 *
 * Removes: `undefined`, `null`, `NaN`, `Infinity`
 */
export const sanitizeProperties = <T extends object>(obj: T): Partial<T> =>
  JSON.parse(JSON.stringify(obj), (_key, value) => (value === null ? undefined : value))

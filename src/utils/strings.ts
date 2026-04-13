export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

const pluralRules: [RegExp, string][] = [
  [/(m)an$/i, '$1en'],
  [/(pe)rson$/i, '$1ople'],
  [/(child)$/i, '$1ren'],
  [/^(ox)$/i, '$1en'],
  [/(ax|test)is$/i, '$1es'],
  [/(octop|vir)us$/i, '$1i'],
  [/(alias|status|virus)$/i, '$1es'],
  [/(bu)s$/i, '$1ses'],
  [/(buffal|tomat)o$/i, '$1oes'],
  [/([ti])um$/i, '$1a'],
  [/sis$/i, 'ses'],
  [/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
  [/(hive)$/i, '$1s'],
  [/([^aeiouy]|qu)y$/i, '$1ies'],
  [/(x|ch|ss|sh)$/i, '$1es'],
  [/(matr|vert|ind)(?:ix|ex)$/i, '$1ices'],
  [/([m|l])ouse$/i, '$1ice'],
  [/(?:^|[^aeiou])o$/i, '$1es'],
  [/^(ox)$/i, '$1en'],
  [/(quiz)$/i, '$1zes'],
  [/s$/i, 's'],
  [/$/, 's']
];

export function pluralize(str: string): string {
  for (const [regex, replacement] of pluralRules) {
    if (regex.test(str)) {
      return str.replace(regex, replacement);
    }
  }
  return str;
}

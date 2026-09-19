export const escapeRegex = (value: string): string =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

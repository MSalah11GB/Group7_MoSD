import { describe, expect, test, vi } from 'vitest';

import { fetchAndParseLRC, parseLRC } from '../src/utils/lrcParser.js';

describe('lrcParser', () => {
  test('parseLRC parses timestamps and sorts by time', () => {
    const input = `
[ar:Artist]
[00:10.00]Line A
[00:05.50]Line B
`;

    const out = parseLRC(input);
    expect(out).toEqual([
      { time: 5500, text: 'Line B' },
      { time: 10000, text: 'Line A' },
    ]);
  });

  test('fetchAndParseLRC returns [] when url missing', async () => {
    await expect(fetchAndParseLRC('')).resolves.toEqual([]);
  });

  test('fetchAndParseLRC returns parsed content on success', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => '[00:01.00]Hi',
    }));

    vi.stubGlobal('fetch', fetchMock);
    const out = await fetchAndParseLRC('https://example.com/a.lrc');
    expect(fetchMock).toHaveBeenCalled();
    expect(out).toEqual([{ time: 1000, text: 'Hi' }]);
  });

  test('fetchAndParseLRC returns [] when fetch fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '',
      }))
    );

    await expect(fetchAndParseLRC('https://example.com/missing.lrc')).resolves.toEqual([]);

    errorSpy.mockRestore();
  });
});

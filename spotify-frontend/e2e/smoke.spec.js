import { expect, test } from '@playwright/test';

const API = 'http://localhost:4000';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

const artist = (id, name) => ({ _id: id, name, image: `${id}.png` });

const songs = [
    { _id: 's1', name: 'Alpha', artist: [artist('a1', 'Keshi')], artistName: 'Keshi', album: 'Skeletons', albumId: 'al1',
      genres: [{ _id: 'g1', name: 'Pop' }], image: 's1.png', file: 'https://cdn.test/s1.wav', duration: '0:03', lrcFile: '' },
    { _id: 's2', name: 'Beta', artist: [artist('a1', 'Keshi')], artistName: 'Keshi', album: 'none', albumId: null,
      genres: [{ _id: 'g1', name: 'Pop' }], image: 's2.png', file: 'https://cdn.test/s2.wav', duration: '0:03', lrcFile: '' },
    { _id: 's3', name: 'Gamma', artist: [artist('a2', 'Other Artist')], artistName: 'Other Artist', album: 'none', albumId: null,
      genres: [{ _id: 'g2', name: 'Rock' }], image: 's3.png', file: 'https://cdn.test/s3.wav', duration: '0:03', lrcFile: '' },
];
const catalog = {
    songs,
    albums: [{ _id: 'al1', name: 'Skeletons', desc: 'A moody album', image: 'al1.png', bgColor: '#222222' }],
    artists: [
        { _id: 'a1', name: 'Keshi', image: 'a1.png', bgColor: '#123456', genres: ['g1'] },
        { _id: 'a2', name: 'Other Artist', image: 'a2.png', bgColor: '#654321', genres: ['g2'] },
    ],
    genres: [{ _id: 'g1', name: 'Pop', songCount: 2 }, { _id: 'g2', name: 'Rock', songCount: 1 }],
    playlists: [],
};

/** A few seconds of silence, so the browser can really play, seek and finish a track. */
const silentWav = (seconds = 3) => {
    const rate = 8000;
    const samples = rate * seconds;
    const buf = Buffer.alloc(44 + samples, 128);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + samples, 4);
    buf.write('WAVEfmt ', 8);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20); // PCM
    buf.writeUInt16LE(1, 22); // mono
    buf.writeUInt32LE(rate, 24);
    buf.writeUInt32LE(rate, 28);
    buf.writeUInt16LE(1, 32);
    buf.writeUInt16LE(8, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(samples, 40);
    return buf;
};
const WAV = silentWav();

async function mockBackend(page, { songsFail = () => false } = {}) {
    await page.route('**://*.clerk.accounts.dev/**', (route) => route.abort());
    await page.route(/\.(png|jpg)$/, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }));

    await page.route('https://cdn.test/**', async (route) => {
        const range = route.request().headers().range;
        const headers = { ...CORS, 'content-type': 'audio/wav', 'accept-ranges': 'bytes' };
        if (range) {
            const [, start, end] = /bytes=(\d+)-(\d*)/.exec(range);
            const from = Number(start);
            const to = end ? Number(end) : WAV.length - 1;
            return route.fulfill({
                status: 206,
                headers: { ...headers, 'content-range': `bytes ${from}-${to}/${WAV.length}` },
                body: WAV.subarray(from, to + 1),
            });
        }
        return route.fulfill({ status: 200, headers, body: WAV });
    });

    await page.route(`${API}/api/**`, (route) => {
        const path = new URL(route.request().url()).pathname;
        const json = (body, status = 200) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });

        if (path === '/api/song/list') {
            return songsFail() ? json({ success: false, message: 'boom' }, 500) : json({ success: true, songs: catalog.songs });
        }
        if (path === '/api/album/list') return json({ success: true, albums: catalog.albums });
        if (path === '/api/artist/list') return json({ success: true, artists: catalog.artists });
        if (path === '/api/genre/list') return json({ success: true, genres: catalog.genres });
        if (path === '/api/playlist/list') return json({ success: true, playlists: catalog.playlists });
        return json({ success: false, message: 'not mocked' }, 404);
    });
}

const player = (page) => page.getByRole('contentinfo');
const audioState = (page) =>
    page.evaluate(() => {
        const audio = document.querySelector('audio');
        return { paused: audio.paused, src: audio.currentSrc, time: audio.currentTime, duration: audio.duration };
    });

test.beforeEach(async ({ page }) => {
    await mockBackend(page);
});

test('home page lists albums and songs, with artist names on the cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Featured Charts')).toBeVisible();
    await expect(page.getByRole('main').getByText('Skeletons')).toBeVisible();
    await expect(page.getByRole('main').getByText("Today's biggest hits")).toBeVisible();
    await expect(page.getByRole('main').getByText('Alpha')).toBeVisible();
    await expect(page.getByRole('main').getByText('Other Artist')).toBeVisible();
});

test('clicking a song really plays it, and pause/resume work', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByText('Beta').click();

    await expect(player(page).getByText('Beta')).toBeVisible();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    expect((await audioState(page)).src).toBe('https://cdn.test/s2.wav');

    await player(page).getByAltText('S', { exact: true }).click(); // pause button
    await expect.poll(async () => (await audioState(page)).paused).toBe(true);
    await expect(player(page).getByAltText('play_icon', { exact: true })).toBeVisible();

    await player(page).getByAltText('play_icon', { exact: true }).click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
});

test('the progress bar and clock follow playback', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByText('Alpha').click();

    await expect.poll(async () => (await audioState(page)).time).toBeGreaterThan(0.3);
    await expect(player(page).getByText('0:03')).toBeVisible(); // total time
    const width = await player(page).locator('hr').evaluate((el) => parseFloat(el.style.width));
    expect(width).toBeGreaterThan(0);
});

test('a finished song moves on to the queue, and previous goes back', async ({ page }) => {
    await page.goto('/');
    const card = page.getByRole('main').getByText('Gamma').locator('..');
    await card.hover();
    await card.getByRole('button', { name: 'Add to queue' }).click();

    await page.getByRole('main').getByText('Alpha').click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);

    await page.evaluate(() => {
        const audio = document.querySelector('audio');
        audio.currentTime = audio.duration - 0.3;
    });

    await expect(player(page).getByText('Gamma')).toBeVisible();
    await expect.poll(async () => (await audioState(page)).src).toBe('https://cdn.test/s3.wav');

    await player(page).getByAltText('Previous', { exact: true }).click();
    await expect(player(page).getByText('Alpha')).toBeVisible();
});

test('search finds songs as you type and playing a result works', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Search', { exact: true }).click();
    await page.getByPlaceholder(/Search songs/).fill('gam');

    const result = page.getByText('Other Artist').last();
    await expect(result).toBeVisible();
    await result.click();

    await expect(player(page).getByText('Gamma')).toBeVisible();
});

test('artist page lists that artist\'s songs', async ({ page }) => {
    await page.goto('/artist/a1');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Keshi' })).toBeVisible();
    await expect(main.getByText('Alpha')).toBeVisible();
    await expect(main.getByText('Beta')).toBeVisible();
    await expect(main.getByText('Gamma')).toHaveCount(0);
});

test('album and genre pages render their songs', async ({ page }) => {
    await page.goto('/album/al1');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Skeletons' })).toBeVisible();
    await expect(page.getByRole('main').getByText('Alpha')).toBeVisible();

    await page.goto('/genre/g2');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Rock' })).toBeVisible();
    await expect(page.getByRole('main').getByText('Gamma')).toBeVisible();
});

test('shows an error and recovers when the API is down', async ({ page }) => {
    let failing = true;
    await mockBackend(page, { songsFail: () => failing });
    await page.goto('/');

    await expect(page.getByText("Couldn't load the music library")).toBeVisible();

    failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('Featured Charts')).toBeVisible();
});

test('unknown pages say so instead of rendering nothing', async ({ page }) => {
    await page.goto('/no/such/page');
    await expect(page.getByText('Page not found')).toBeVisible();
});

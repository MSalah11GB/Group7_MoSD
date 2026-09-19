import SpotifyWebApi from 'spotify-web-api-node';
import { env } from '../env.js';
import { HttpError } from '../lib/HttpError.js';

const spotifyApi = new SpotifyWebApi({
  clientId: env.SPOTIFY_CLIENT_ID,
  clientSecret: env.SPOTIFY_CLIENT_SECRET,
});

let tokenExpiresAt = 0;

const ensureToken = async () => {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new HttpError(503, 'Spotify integration is not configured');
  }
  if (Date.now() < tokenExpiresAt) return;

  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body.access_token);
  tokenExpiresAt = Date.now() + (data.body.expires_in - 60) * 1000;
};

export const extractSpotifyTrackId = (url: string): string | null => {
  const matches = url.match(/track\/([a-zA-Z0-9]+)/);
  return matches?.[1] ?? null;
};

export type SpotifyTrackInfo = {
  name: string;
  image?: string;
  artists: { name: string; image?: string }[];
};

/** Metadata only: the app never downloads or copies audio from Spotify. */
export const getSpotifyTrackInfo = async (trackId: string): Promise<SpotifyTrackInfo> => {
  await ensureToken();
  const track = await spotifyApi.getTrack(trackId);

  const artists = await Promise.all(
    track.body.artists.map(async (artist) => {
      const details = await spotifyApi.getArtist(artist.id);
      return { name: artist.name, image: details.body.images[0]?.url };
    })
  );

  return { name: track.body.name, image: track.body.album.images[0]?.url, artists };
};

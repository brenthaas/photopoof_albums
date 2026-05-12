import type { Handler } from '@netlify/functions';

const FLICKR_BASE = 'https://api.flickr.com/services/rest/';

interface FlickrPhotoset {
  id: string;
  title: { _content: string };
  description: { _content: string };
  count_photos: number;
  primary: string;
  server: string;
  secret: string;
  url_z?: string;
  url_c?: string;
}

interface FlickrPhotosetListResponse {
  stat: string;
  message?: string;
  photosets: {
    photoset: FlickrPhotoset[];
  };
}

export const handler: Handler = async () => {
  const apiKey = process.env.FLICKR_API_KEY;
  const userId = process.env.FLICKR_USER_ID;
  const albumIds = process.env.FLICKR_ALBUM_IDS;

  if (!apiKey || !userId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Flickr API key or user ID not configured.' }),
    };
  }

  const url = new URL(FLICKR_BASE);
  url.searchParams.set('method', 'flickr.photosets.getList');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('user_id', userId);
  url.searchParams.set('primary_photo_extras', 'url_z,url_c');
  url.searchParams.set('per_page', '500');
  url.searchParams.set('format', 'json');
  url.searchParams.set('nojsoncallback', '1');

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as FlickrPhotosetListResponse;

    if (data.stat !== 'ok') {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.message }),
      };
    }

    let albums = data.photosets.photoset.map(a => ({
      id: a.id,
      title: a.title._content,
      description: a.description._content,
      count: a.count_photos,
      coverUrl: a.url_z ?? a.url_c ?? `https://live.staticflickr.com/${a.server}/${a.primary}_${a.secret}_z.jpg`,
    }));

    if (albumIds) {
      const ids = albumIds.split(',').map(id => id.trim()).filter(Boolean);
      const map = Object.fromEntries(albums.map(a => [a.id, a]));
      albums = ids.flatMap(id => (map[id] ? [map[id]] : []));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albums),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};

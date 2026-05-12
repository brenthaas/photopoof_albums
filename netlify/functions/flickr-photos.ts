import type { Handler } from '@netlify/functions';

const FLICKR_BASE = 'https://api.flickr.com/services/rest/';

interface FlickrPhotosetInfoResponse {
  stat: string;
  message?: string;
  photoset: {
    title: { _content: string };
    description: { _content: string };
  };
}

interface FlickrPhoto {
  id: string;
  title: string;
  server: string;
  secret: string;
  url_z?: string;
  url_c?: string;
  url_b?: string;
  url_h?: string;
  url_o?: string;
}

interface FlickrPhotosetPhotosResponse {
  stat: string;
  message?: string;
  photoset: {
    photo: FlickrPhoto[];
  };
}

export const handler: Handler = async event => {
  const apiKey = process.env.FLICKR_API_KEY;
  const userId = process.env.FLICKR_USER_ID;
  const albumId = event.queryStringParameters?.album_id;

  if (!apiKey || !userId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Flickr API key or user ID not configured.' }),
    };
  }

  if (!albumId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing album_id parameter.' }),
    };
  }

  const makeUrl = (method: string, extra: Record<string, string> = {}): string => {
    const url = new URL(FLICKR_BASE);
    url.searchParams.set('method', method);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('photoset_id', albumId);
    url.searchParams.set('format', 'json');
    url.searchParams.set('nojsoncallback', '1');
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    return url.toString();
  };

  try {
    const [infoRes, photosRes] = await Promise.all([
      fetch(makeUrl('flickr.photosets.getInfo')),
      fetch(makeUrl('flickr.photosets.getPhotos', {
        extras: 'url_z,url_b,url_h,url_o,url_c',
        per_page: '500',
      })),
    ]);

    const [infoData, photosData] = (await Promise.all([
      infoRes.json(),
      photosRes.json(),
    ])) as [FlickrPhotosetInfoResponse, FlickrPhotosetPhotosResponse];

    if (infoData.stat !== 'ok') {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: infoData.message }),
      };
    }

    if (photosData.stat !== 'ok') {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: photosData.message }),
      };
    }

    const photos = photosData.photoset.photo.map(p => ({
      id: p.id,
      title: p.title,
      thumb: p.url_z ?? p.url_c ?? `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_z.jpg`,
      full: p.url_h ?? p.url_b ?? p.url_o ?? p.url_z ?? '',
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: infoData.photoset.title._content,
        description: infoData.photoset.description._content,
        photos,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};

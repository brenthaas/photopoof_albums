interface Album {
  id: string;
  title: string;
  count: number;
  coverUrl: string;
}

interface Photo {
  id: string;
  title: string;
  thumb: string;
  full: string;
}

interface AlbumData {
  title: string;
  description: string;
  photos: Photo[];
}

// ── Albums page ───────────────────────────────────────

async function loadAlbums(): Promise<void> {
  const content = document.getElementById('albums-content')!;
  try {
    const res = await fetch('/.netlify/functions/flickr-albums');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const albums: Album[] = await res.json();

    if (!albums.length) {
      content.innerHTML = '<p class="error-msg">No albums found.</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'album-grid';
    grid.innerHTML = albums.map(a => `
      <a class="album-card" href="/album.html?id=${encodeURIComponent(a.id)}">
        <img class="album-cover" src="${esc(a.coverUrl)}" alt="${esc(a.title)}" loading="lazy" />
        <div class="album-info">
          <div class="album-name">${esc(a.title)}</div>
          <div class="album-count">${a.count} photo${a.count === 1 ? '' : 's'}</div>
        </div>
      </a>
    `).join('');

    content.innerHTML = '';
    content.appendChild(grid);
  } catch (err) {
    content.innerHTML = `<p class="error-msg">Failed to load albums: ${esc(String(err))}</p>`;
  }
}

// ── Album page ────────────────────────────────────────

let lightboxPhotos: Photo[] = [];
let lightboxIndex = 0;

async function loadAlbum(albumId: string): Promise<void> {
  const content = document.getElementById('album-content')!;
  try {
    const res = await fetch(`/.netlify/functions/flickr-photos?album_id=${encodeURIComponent(albumId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: AlbumData = await res.json();

    document.title = data.title;
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = data.title;

    lightboxPhotos = data.photos;

    const grid = document.createElement('div');
    grid.className = 'photo-grid';
    grid.innerHTML = data.photos.map((p, i) => `
      <img
        class="photo-thumb"
        src="${esc(p.thumb)}"
        alt="${esc(p.title)}"
        loading="lazy"
        data-index="${i}"
      />
    `).join('');

    grid.addEventListener('click', e => {
      const img = (e.target as HTMLElement).closest<HTMLImageElement>('.photo-thumb');
      if (img?.dataset.index !== undefined) openLightbox(parseInt(img.dataset.index, 10));
    });

    content.innerHTML = '';
    if (data.description) {
      const desc = document.createElement('p');
      desc.className = 'album-description';
      desc.textContent = data.description;
      content.appendChild(desc);
    }
    content.appendChild(grid);
  } catch (err) {
    content.innerHTML = `<p class="error-msg">Failed to load album: ${esc(String(err))}</p>`;
  }
}

// ── Lightbox ──────────────────────────────────────────

function openLightbox(index: number): void {
  lightboxIndex = index;
  renderLightbox();
  document.getElementById('lightbox')!.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(): void {
  document.getElementById('lightbox')!.classList.remove('open');
  document.body.style.overflow = '';
}

function renderLightbox(): void {
  const photo = lightboxPhotos[lightboxIndex];
  const img = document.getElementById('lb-img') as HTMLImageElement;
  img.src = photo.full || photo.thumb;
  img.alt = photo.title;
  document.getElementById('lb-caption')!.textContent = photo.title;
}

function lightboxStep(delta: number): void {
  lightboxIndex = (lightboxIndex + delta + lightboxPhotos.length) % lightboxPhotos.length;
  renderLightbox();
}

function initLightbox(): void {
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  document.getElementById('lb-close')!.addEventListener('click', closeLightbox);
  document.getElementById('lb-prev')!.addEventListener('click', () => lightboxStep(-1));
  document.getElementById('lb-next')!.addEventListener('click', () => lightboxStep(1));

  lb.addEventListener('click', e => {
    if (e.target === lb) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxStep(-1);
    if (e.key === 'ArrowRight') lightboxStep(1);
  });
}

// ── Init ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('albums-content')) {
    loadAlbums();
  } else if (document.getElementById('album-content')) {
    initLightbox();
    const albumId = new URLSearchParams(location.search).get('id');
    if (albumId) {
      loadAlbum(albumId);
    } else {
      document.getElementById('album-content')!.innerHTML =
        '<p class="error-msg">No album selected.</p>';
    }
  }
});

// ── Util ──────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

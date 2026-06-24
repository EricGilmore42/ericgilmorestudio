// ── Menu ──
const menuBtn = document.getElementById('menuBtn');
const menuOverlay = document.getElementById('menuOverlay');

if (menuBtn && menuOverlay) {
  menuBtn.addEventListener('click', () => {
    const isOpen = menuOverlay.classList.contains('is-open');
    if (isOpen) {
      menuOverlay.classList.remove('is-open');
      menuBtn.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    } else {
      menuOverlay.classList.add('is-open');
      menuBtn.classList.add('is-open');
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOverlay.classList.contains('is-open')) {
      menuOverlay.classList.remove('is-open');
      menuBtn.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Gallery (index.html) ──
const galleryEl = document.getElementById('gallery');

if (galleryEl && typeof artworks !== 'undefined') {
  artworks.forEach(work => {
    const a = document.createElement('a');
    a.className = 'artwork-item';
    a.href = `painting.html?id=${work.id}`;
    a.setAttribute('aria-label', work.title);

    const hasImage = work.images && work.images.length > 0;
    const thumbSrc = work.thumbnail || (hasImage ? work.images[0] : null);

    if (thumbSrc) {
      const img = document.createElement('img');
      img.className = 'artwork-img';
      img.src = thumbSrc;
      img.alt = work.title;
      img.loading = 'lazy';
      a.appendChild(img);
    } else if (!thumbSrc) {
      // Colored placeholder sized to the painting's aspect ratio
      const ph = document.createElement('div');
      ph.className = 'artwork-placeholder';
      const ratio = work.placeholder.ratio;
      // padding-top trick: height = width × (h/w)
      ph.style.cssText = `background:${work.placeholder.color}; padding-top:${(ratio * 100).toFixed(2)}%;`;
      a.appendChild(ph);
    }

    const overlay = document.createElement('div');
    overlay.className = 'artwork-hover';

    const tag = document.createElement('span');
    tag.className = work.sold ? 'artwork-price-tag is-sold' : 'artwork-price-tag';
    tag.textContent = work.sold ? 'Sold' : `$${work.price.toLocaleString()}`;
    overlay.appendChild(tag);
    a.appendChild(overlay);

    galleryEl.appendChild(a);
  });
}

// ── Painting Detail (painting.html) ──
const paintingLayout = document.getElementById('paintingLayout');

if (paintingLayout && typeof artworks !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  const work = artworks.find(w => w.id === id);

  if (!work) {
    paintingLayout.innerHTML = '<p style="padding:80px 40px;color:#999;">Painting not found.</p>';
  } else {
    document.title = `${work.title} — Eric Gilmore`;

    const hasImages = work.images && work.images.length > 0;

    // Left side
    const left = document.createElement('div');
    left.className = 'painting-left';

    if (hasImages) {
      const stack = document.createElement('div');
      stack.className = 'painting-image-stack';
      work.images.forEach((src, i) => {
        const img = document.createElement('img');
        img.className = 'painting-stack-img';
        img.src = src;
        img.alt = `${work.title} — view ${i + 1}`;
        img.loading = i === 0 ? 'eager' : 'lazy';
        stack.appendChild(img);
      });
      left.appendChild(stack);
    } else {
      // Placeholder
      const ph = document.createElement('div');
      ph.className = 'painting-main-placeholder';
      const ratio = work.placeholder.ratio;
      ph.style.cssText = `background:${work.placeholder.color}; padding-top:${Math.min(ratio * 100, 80).toFixed(2)}%; max-height:70vh;`;
      left.appendChild(ph);
    }

    // Right side
    const right = document.createElement('div');
    right.className = 'painting-right';

    const title = document.createElement('h1');
    title.className = 'painting-title';
    title.textContent = work.title;
    right.appendChild(title);

    const meta = document.createElement('ul');
    meta.className = 'painting-meta';
    const metaFields = [
      ['Year', work.year],
      ['Medium', work.medium],
      ['Dimensions', work.dimensions]
    ];
    metaFields.forEach(([label, value]) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${label}</span><span>${value}</span>`;
      meta.appendChild(li);
    });
    right.appendChild(meta);

    const priceEl = document.createElement('p');
    priceEl.className = work.sold ? 'painting-price is-sold' : 'painting-price';
    priceEl.textContent = work.sold ? 'Sold' : `$${work.price.toLocaleString()}`;
    right.appendChild(priceEl);

    const desc = document.createElement('div');
    desc.className = 'painting-description';
    work.description.split('\n\n').forEach(para => {
      const p = document.createElement('p');
      p.textContent = para;
      desc.appendChild(p);
    });
    right.appendChild(desc);

    if (!work.sold) {
      const inquire = document.createElement('a');
      inquire.className = 'painting-inquire';
      inquire.href = `contact.html?re=${encodeURIComponent(work.title)}`;
      inquire.textContent = 'Inquire About This Work';
      right.appendChild(inquire);
    }

    paintingLayout.appendChild(left);
    paintingLayout.appendChild(right);
  }
}

// Pre-fill contact form subject if coming from a painting page
const reField = document.getElementById('contactSubject');
if (reField) {
  const params = new URLSearchParams(window.location.search);
  const re = params.get('re');
  if (re) reField.value = `Inquiry: ${re}`;
}

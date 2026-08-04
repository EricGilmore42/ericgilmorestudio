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

// ── Gallery grid (shared by index.html and shop.html) ──
function renderGallery(el, items, linkBuilder, soldLabel = 'Sold') {
  items.forEach(item => {
    const a = document.createElement('a');
    a.className = 'artwork-item';
    a.href = linkBuilder(item);
    a.setAttribute('aria-label', item.title);

    const hasImage = item.images && item.images.length > 0;
    const thumbSrc = item.thumbnail || (hasImage ? item.images[0] : null);

    if (thumbSrc) {
      const img = document.createElement('img');
      img.className = 'artwork-img';
      img.src = thumbSrc;
      img.alt = item.title;
      img.loading = 'lazy';
      a.appendChild(img);
    } else if (!thumbSrc) {
      // Colored placeholder sized to the item's aspect ratio
      const ph = document.createElement('div');
      ph.className = 'artwork-placeholder';
      const ratio = item.placeholder.ratio;
      // padding-top trick: height = width × (h/w)
      ph.style.cssText = `background:${item.placeholder.color}; padding-top:${(ratio * 100).toFixed(2)}%;`;
      a.appendChild(ph);
    }

    const overlay = document.createElement('div');
    overlay.className = 'artwork-hover';

    const tag = document.createElement('span');
    tag.className = item.sold ? 'artwork-price-tag is-sold' : 'artwork-price-tag';
    tag.textContent = item.sold ? soldLabel : `$${item.price.toLocaleString()}`;
    overlay.appendChild(tag);
    a.appendChild(overlay);

    // Mobile: first tap shows price, second tap navigates
    if (window.matchMedia('(hover: none)').matches) {
      a.addEventListener('click', (e) => {
        if (!a.classList.contains('touch-active')) {
          e.preventDefault();
          document.querySelectorAll('.artwork-item.touch-active').forEach(el => el.classList.remove('touch-active'));
          a.classList.add('touch-active');
        }
      });
    }

    el.appendChild(a);
  });
}

// ── Gallery (index.html) ──
const galleryEl = document.getElementById('gallery');

if (galleryEl && typeof artworks !== 'undefined') {
  renderGallery(galleryEl, artworks, work => `/painting/?id=${work.id}`);
}

// ── Shop galleries (shop.html) ──
const stickerGalleryEl = document.getElementById('stickerGallery');
const printGalleryEl = document.getElementById('printGallery');

if (typeof shopProducts !== 'undefined') {
  if (stickerGalleryEl) {
    renderGallery(
      stickerGalleryEl,
      shopProducts.filter(p => p.type === 'sticker'),
      product => `/product/?id=${product.id}`,
      'Sold Out'
    );
  }
  if (printGalleryEl) {
    renderGallery(
      printGalleryEl,
      shopProducts.filter(p => p.type === 'print'),
      product => `/product/?id=${product.id}`,
      'Sold Out'
    );
  }
}

// ── Shared detail-page media column (painting.html and product.html) ──
function buildMediaColumn(item) {
  const left = document.createElement('div');
  left.className = 'painting-left';

  const hasImages = item.images && item.images.length > 0;
  if (hasImages) {
    const stack = document.createElement('div');
    stack.className = 'painting-image-stack';
    item.images.forEach((src, i) => {
      const img = document.createElement('img');
      img.className = 'painting-stack-img';
      img.src = src;
      img.alt = `${item.title} — view ${i + 1}`;
      img.loading = i === 0 ? 'eager' : 'lazy';
      stack.appendChild(img);
    });
    left.appendChild(stack);
  } else {
    const ph = document.createElement('div');
    ph.className = 'painting-main-placeholder';
    const ratio = item.placeholder.ratio;
    ph.style.cssText = `background:${item.placeholder.color}; padding-top:${Math.min(ratio * 100, 80).toFixed(2)}%; max-height:70vh;`;
    left.appendChild(ph);
  }

  return left;
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

    const left = buildMediaColumn(work);

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
      inquire.href = `/contact/?re=${encodeURIComponent(work.title)}`;
      inquire.textContent = 'Inquire About This Work';
      right.appendChild(inquire);
    }

    paintingLayout.appendChild(left);
    paintingLayout.appendChild(right);
  }
}

// ── Product Detail (product.html) ──
const productLayout = document.getElementById('productLayout');
const VENMO_HANDLE = 'EricGilmore42';

if (productLayout && typeof shopProducts !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  const product = shopProducts.find(p => p.id === id);

  if (!product) {
    productLayout.innerHTML = '<p style="padding:80px 40px;color:#999;">Item not found.</p>';
  } else {
    document.title = `${product.title} — Eric Gilmore`;

    const left = buildMediaColumn(product);

    const right = document.createElement('div');
    right.className = 'painting-right';

    const title = document.createElement('h1');
    title.className = 'painting-title';
    title.textContent = product.title;
    right.appendChild(title);

    const meta = document.createElement('ul');
    meta.className = 'painting-meta';
    const metaFields = [
      ['Type', product.type === 'sticker' ? 'Sticker' : 'Print'],
      ['Dimensions', product.dimensions],
      ['Material', product.material]
    ];
    metaFields.forEach(([label, value]) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${label}</span><span>${value}</span>`;
      meta.appendChild(li);
    });
    right.appendChild(meta);

    const priceEl = document.createElement('p');
    priceEl.className = product.sold ? 'painting-price is-sold' : 'painting-price';
    priceEl.textContent = product.sold ? 'Sold Out' : `$${product.price.toLocaleString()}`;
    right.appendChild(priceEl);

    const desc = document.createElement('div');
    desc.className = 'painting-description';
    (product.description || '').split('\n\n').forEach(para => {
      if (!para) return;
      const p = document.createElement('p');
      p.textContent = para;
      desc.appendChild(p);
    });
    right.appendChild(desc);

    if (!product.sold) {
      if (product.type === 'sticker') {
        const addressGroup = document.createElement('div');
        addressGroup.className = 'form-group venmo-address-group';

        const addressLabel = document.createElement('label');
        addressLabel.className = 'form-label';
        addressLabel.htmlFor = 'mailingAddress';
        addressLabel.textContent = 'Mailing Address';
        addressGroup.appendChild(addressLabel);

        const addressField = document.createElement('textarea');
        addressField.className = 'form-textarea venmo-address-input';
        addressField.id = 'mailingAddress';
        addressField.rows = 3;
        addressField.placeholder = 'Street, City, State, ZIP';
        addressGroup.appendChild(addressField);

        const addressError = document.createElement('p');
        addressError.className = 'venmo-address-error';
        addressError.textContent = 'Enter your mailing address so we know where to ship it.';
        addressGroup.appendChild(addressError);

        right.appendChild(addressGroup);

        const buy = document.createElement('button');
        buy.type = 'button';
        buy.className = 'painting-inquire';
        buy.textContent = `Buy via Venmo — $${product.price}`;
        buy.addEventListener('click', () => {
          const address = addressField.value.trim();
          if (!address) {
            addressGroup.classList.add('is-invalid');
            addressField.focus();
            return;
          }
          addressGroup.classList.remove('is-invalid');
          const note = `${product.title} — Ship to: ${address}`;
          const url = `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${product.price}&note=${encodeURIComponent(note)}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        });
        right.appendChild(buy);

        const instructions = document.createElement('p');
        instructions.className = 'venmo-instructions';
        instructions.textContent = `Enter your mailing address above, then tap Buy via Venmo — we'll pre-fill it into the $${product.price} payment note to @${VENMO_HANDLE} so you don't have to type it twice.`;
        right.appendChild(instructions);
      } else {
        const inquire = document.createElement('a');
        inquire.className = 'painting-inquire';
        inquire.href = `/contact/?re=${encodeURIComponent(product.title)}`;
        inquire.textContent = 'Inquire About This Print';
        right.appendChild(inquire);
      }
    }

    productLayout.appendChild(left);
    productLayout.appendChild(right);
  }
}

// ── Email signup ──
document.querySelectorAll('.email-signup-form').forEach(form => {
  form.removeAttribute('target');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    try {
      await fetch(form.action, { method: 'POST', body: data, mode: 'no-cors' });
    } catch (_) {}
    const section = form.closest('.email-signup');
    section.innerHTML = '<p style="font-family:\'Cormorant Garamond\',serif;font-size:20px;padding:40px 0;">Thanks for signing up.</p>';
  });
});

// Pre-fill contact form subject if coming from a painting page
const reField = document.getElementById('contactSubject');
if (reField) {
  const params = new URLSearchParams(window.location.search);
  const re = params.get('re');
  if (re) reField.value = `Inquiry: ${re}`;
}

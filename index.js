const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');
const yearEl = document.querySelector('#year');
const filterButtons = document.querySelectorAll('.filter-btn');
const contactForm = document.querySelector('.contact-form');
const homeList = document.getElementById('tour-list');
const tourDetail = document.getElementById('tour-detail');
const API_URL = 'https://mariastour-production.up.railway.app/api/excursions';
const BUDGET_API_URL = 'https://mariastour-production.up.railway.app/api/budget-requests';

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const renderTours = (items) => {
  if (!homeList) return;

  homeList.innerHTML = items.map((item) => `
    <article class="tour-card" data-category="${item.categoria}">
      <img src="${item.imagens?.[0] || item.imagem}" alt="${item.titulo}" />
      <div class="tour-body">
        <div class="tour-tag">${item.categoria}</div>
        <h3>${item.titulo}</h3>
        <p>${item.descricao}</p>
        <div class="tour-meta">
          <span>${item.duracao}</span>
          <span>${item.preco}</span>
        </div>
        <a class="card-link" href="pages/passeio.html?id=${encodeURIComponent(item.id)}">Ver excursão</a>
      </div>
    </article>
  `).join('');

  const cards = document.querySelectorAll('.tour-card');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedFilter = button.dataset.filter;
      filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));

      cards.forEach((card) => {
        const matches = selectedFilter === 'all' || card.dataset.category === selectedFilter;
        card.classList.toggle('hidden', !matches);
      });
    });
  });
};

const loadTours = async () => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Erro ao buscar excursões');
    const excursions = await response.json();
    renderTours(excursions);
  } catch (error) {
    console.error(error);
    if (homeList) {
      homeList.innerHTML = '<p>Não foi possível carregar as excursões no momento.</p>';
    }
  }
};

const loadTourDetail = async () => {
  const tourId = new URLSearchParams(window.location.search).get('id');
  const loading = document.getElementById('tour-loading');
  const content = document.getElementById('tour-content');
  const error = document.getElementById('tour-error');

  try {
    if (!tourId) throw new Error('Passeio não informado');

    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Erro ao buscar passeio');

    const items = await response.json();
    const item = items.find((tour) => String(tour.id) === tourId);
    if (!item) throw new Error('Passeio não encontrado');

    document.title = `MariaTour | ${item.titulo}`;
    document.getElementById('tour-title').textContent = item.titulo;
    document.getElementById('tour-category').textContent = item.categoria;
    document.getElementById('tour-description').textContent = item.descricao;
    document.getElementById('tour-description-detail').textContent = item.descricao;
    document.getElementById('tour-about-title').textContent = item.titulo;
    document.getElementById('tour-price').textContent = item.preco;
    document.getElementById('tour-duration').textContent = item.duracao;

    const images = Array.isArray(item.imagens) && item.imagens.length
      ? item.imagens
      : item.imagem ? [item.imagem] : [];
    const image = document.getElementById('tour-image');
    image.src = images[0] || '';
    image.alt = item.titulo;

    const gallerySection = document.getElementById('tour-gallery-section');
    const gallery = document.getElementById('tour-gallery');
    gallery.replaceChildren();

    images.slice(1).forEach((imageUrl, index) => {
      const thumbnail = document.createElement('button');
      thumbnail.className = 'tour-gallery-item';
      thumbnail.type = 'button';
      thumbnail.setAttribute('aria-label', `Ver foto ${index + 2} de ${item.titulo}`);

      const thumbnailImage = document.createElement('img');
      thumbnailImage.src = imageUrl;
      thumbnailImage.alt = `${item.titulo}, foto ${index + 2}`;
      thumbnail.append(thumbnailImage);
      thumbnail.addEventListener('click', () => {
        image.src = imageUrl;
        image.alt = thumbnailImage.alt;
      });
      gallery.append(thumbnail);
    });

    gallerySection.classList.toggle('hidden', images.length < 2);

    loading.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (loadError) {
    console.error(loadError);
    loading.classList.add('hidden');
    error.classList.remove('hidden');
  }
};

if (homeList) loadTours();
if (tourDetail) loadTourDetail();

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nome = contactForm.querySelector('input[type="text"]').value.trim();
    const email = contactForm.querySelector('input[type="email"]').value.trim();
    const numero = contactForm.querySelector('input[type="tel"]').value.trim();
    const destino = contactForm.querySelector('select').value;
    const button = contactForm.querySelector('button');

    if (!nome || !email || !numero || !destino) {
      alert('Preencha nome, e-mail, número e destino para continuar.');
      return;
    }

    try {
      const response = await fetch(BUDGET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, numero, destino, status: 'Pendente' })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar orçamento');
      }

      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Solicitação enviada!';
        button.disabled = true;

        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
          contactForm.reset();
        }, 1800);
      }
    } catch (error) {
      console.error(error);
      alert('Não foi possível enviar a solicitação. Tente novamente.');
    }
  });
}

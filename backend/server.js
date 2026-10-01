const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const dataFile = path.join(__dirname, 'data', 'excursions.json');
const budgetDataFile = path.join(__dirname, 'data', 'budget-requests.json');

app.use(cors());
app.use(express.json());

const ensureDataFile = () => {
  if (!fs.existsSync(dataFile)) {
    const defaultData = [
      {
        id: 'ilha-grande',
        titulo: 'Ilha Grande - RJ',
        categoria: 'praia',
        descricao: 'Uma experiência de praia, mar cristalino e paisagens incríveis para relaxar e aproveitar o litoral.',
        duracao: '1 dia',
        preco: 'R$ 1.799,00',
        imagem: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
        link: 'ilha-grande.html'
      },
      {
        id: 'petropolis',
        titulo: 'Petrópolis',
        categoria: 'cidade',
        descricao: 'Visite a cidade imperial com clima agradável, natureza e pontos turísticos encantadores.',
        duracao: '1 dia',
        preco: 'R$ 350,00',
        imagem: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=900&q=80',
        link: 'petropolis.html'
      },
      {
        id: 'show-luan',
        titulo: 'Bate e volta - Luan Santana',
        categoria: 'evento',
        descricao: 'Uma viagem prática e segura para curtir o show do Luan Santana em Cariacica - ES.',
        duracao: '1 noite',
        preco: 'R$ 120,00',
        imagem: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
        link: 'show-luan.html'
      },
      {
        id: 'dia-das-criancas',
        titulo: 'Bate e volta - Dia das Crianças',
        categoria: 'familia',
        descricao: 'Uma programação divertida e segura para crianças e famílias aproveitarem o Dia das Crianças com alegria.',
        duracao: '1 dia',
        preco: 'adulto R$ 259,90',
        imagem: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=80',
        link: 'dia-das-criancas.html'
      }
    ];

    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2));
  }
};

const readExcursions = () => {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(raw);
};

const writeExcursions = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

const ensureBudgetDataFile = () => {
  if (!fs.existsSync(budgetDataFile)) {
    const defaultBudgetRequests = [
      {
        id: 'budget-1',
        nome: 'Laura Santos',
        email: 'laura@email.com',
        numero: '(21) 99999-1111',
        destino: 'Ilha Grande',
        status: 'Pendente'
      },
      {
        id: 'budget-2',
        nome: 'Pedro Almeida',
        email: 'pedro@email.com',
        numero: '(21) 98888-2222',
        destino: 'Petrópolis',
        status: 'Respondido'
      },
      {
        id: 'budget-3',
        nome: 'Marina Costa',
        email: 'marina@email.com',
        numero: '(28) 97777-3333',
        destino: 'Show Luan Santana',
        status: 'Pendente'
      }
    ];

    fs.writeFileSync(budgetDataFile, JSON.stringify(defaultBudgetRequests, null, 2));
  }
};

const readBudgetRequests = () => {
  ensureBudgetDataFile();
  const raw = fs.readFileSync(budgetDataFile, 'utf8');
  return JSON.parse(raw);
};

const writeBudgetRequests = (data) => {
  fs.writeFileSync(budgetDataFile, JSON.stringify(data, null, 2));
};

app.get('/api/excursions', (req, res) => {
  const excursions = readExcursions();
  res.json(excursions);
});

app.post('/api/excursions', (req, res) => {
  const payload = req.body;
  const excursions = readExcursions();
  const images = Array.isArray(payload.imagens)
    ? payload.imagens.filter((image) => typeof image === 'string' && image.trim())
    : payload.imagem ? [payload.imagem] : [];

  const newItem = {
    id: payload.id || cryptoRandomId(),
    titulo: payload.titulo,
    categoria: payload.categoria,
    descricao: payload.descricao,
    duracao: payload.duracao,
    preco: payload.preco,
    imagem: images[0] || '',
    imagens: images,
    link: payload.link || `passeio.html?id=${encodeURIComponent(payload.id || cryptoRandomId())}`
  };

  const existingIndex = excursions.findIndex((item) => item.id === newItem.id);
  if (existingIndex >= 0) {
    excursions[existingIndex] = newItem;
  } else {
    excursions.unshift(newItem);
  }

  writeExcursions(excursions);
  res.status(201).json(newItem);
});

app.put('/api/excursions/:id', (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const excursions = readExcursions();
  const index = excursions.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Excursão não encontrada.' });
  }

  excursions[index] = {
    ...excursions[index],
    ...payload,
    id
  };

  writeExcursions(excursions);
  res.json(excursions[index]);
});

app.delete('/api/excursions/:id', (req, res) => {
  const { id } = req.params;
  const excursions = readExcursions();
  const filtered = excursions.filter((item) => item.id !== id);

  writeExcursions(filtered);
  res.json({ message: 'Excursão removida com sucesso.' });
});

app.get('/api/budget-requests', (req, res) => {
  const budgetRequests = readBudgetRequests();
  res.json(budgetRequests);
});

app.post('/api/budget-requests', (req, res) => {
  const { nome, email, numero, destino, status = 'Pendente' } = req.body;

  if (!nome || !email || !numero || !destino) {
    return res.status(400).json({ message: 'Nome, e-mail, número e destino são obrigatórios.' });
  }

  const budgetRequests = readBudgetRequests();
  const newRequest = {
    id: cryptoRandomId(),
    nome,
    email,
    numero,
    destino,
    status
  };

  budgetRequests.unshift(newRequest);
  writeBudgetRequests(budgetRequests);
  res.status(201).json(newRequest);
});

app.put('/api/budget-requests/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const budgetRequests = readBudgetRequests();
  const index = budgetRequests.findIndex((request) => request.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Solicitação não encontrada.' });
  }

  budgetRequests[index] = {
    ...budgetRequests[index],
    status
  };

  writeBudgetRequests(budgetRequests);
  res.json(budgetRequests[index]);
});

function cryptoRandomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

app.listen(PORT, () => {
  console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});

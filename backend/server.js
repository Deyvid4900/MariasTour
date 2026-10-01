const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const dataFile = path.join(__dirname, 'data', 'excursions.json');
const budgetDataFile = path.join(__dirname, 'data', 'budget-requests.json');
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origem não permitida pelo CORS.'));
} }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

const sendError = (res, error) => {
  console.error(error);
  res.status(500).json({ message: 'Erro interno do servidor.' });
};
const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
const readExcursions = () => readJson(dataFile, []);
const readBudgetRequests = () => readJson(budgetDataFile, []);
const cryptoRandomId = () => crypto.randomUUID();
const cleanText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const isValidUrl = (value) => {
  try { const url = new URL(value); return url.protocol === 'https:'; } catch { return false; }
};

// Admin access is controlled only on the server; configure ADMIN_TOKEN as a secret environment variable.
const requireAdmin = (req, res, next) => {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!expected) return res.status(503).json({ message: 'A administração não está configurada.' });
  const a = Buffer.from(supplied); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ message: 'Não autorizado.' });
  next();
};
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });

app.get('/api/excursions', (req, res) => {
  try { res.json(readExcursions()); } catch (error) { sendError(res, error); }
});
app.post('/api/excursions', adminLimiter, requireAdmin, (req, res) => {
  try {
    const p = req.body || {};
    const titulo = cleanText(p.titulo, 120); const categoria = cleanText(p.categoria, 40);
    const descricao = cleanText(p.descricao, 2000); const duracao = cleanText(p.duracao, 80); const preco = cleanText(p.preco, 80);
    const imagens = (Array.isArray(p.imagens) ? p.imagens : [p.imagem]).filter((url) => typeof url === 'string' && isValidUrl(url)).slice(0, 10);
    if (!titulo || !categoria || !descricao || !duracao || !preco || imagens.length === 0) return res.status(400).json({ message: 'Dados inválidos ou incompletos. Informe ao menos uma imagem HTTPS.' });
    const excursions = readExcursions(); const id = cryptoRandomId();
    const item = { id, titulo, categoria, descricao, duracao, preco, imagem: imagens[0], imagens, link: `passeio.html?id=${encodeURIComponent(id)}` };
    excursions.unshift(item); writeJson(dataFile, excursions); res.status(201).json(item);
  } catch (error) { sendError(res, error); }
});
app.put('/api/excursions/:id', adminLimiter, requireAdmin, (req, res) => {
  try {
    const excursions = readExcursions(); const i = excursions.findIndex((item) => item.id === req.params.id);
    if (i < 0) return res.status(404).json({ message: 'Excursão não encontrada.' });
    const p = req.body || {}; const images = (Array.isArray(p.imagens) ? p.imagens : [p.imagem]).filter((url) => typeof url === 'string' && isValidUrl(url)).slice(0, 10);
    const fields = { titulo: cleanText(p.titulo, 120), categoria: cleanText(p.categoria, 40), descricao: cleanText(p.descricao, 2000), duracao: cleanText(p.duracao, 80), preco: cleanText(p.preco, 80) };
    if (Object.values(fields).some((v) => !v) || !images.length) return res.status(400).json({ message: 'Dados inválidos ou incompletos.' });
    excursions[i] = { ...excursions[i], ...fields, imagens: images, imagem: images[0], id: req.params.id };
    writeJson(dataFile, excursions); res.json(excursions[i]);
  } catch (error) { sendError(res, error); }
});
app.delete('/api/excursions/:id', adminLimiter, requireAdmin, (req, res) => {
  try { const items = readExcursions(); const filtered = items.filter((item) => item.id !== req.params.id); if (items.length === filtered.length) return res.status(404).json({ message: 'Excursão não encontrada.' }); writeJson(dataFile, filtered); res.json({ message: 'Excursão removida.' }); } catch (error) { sendError(res, error); }
});
app.post('/api/budget-requests', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }), (req, res) => {
  try {
    const p = req.body || {}; const nome = cleanText(p.nome, 100); const email = cleanText(p.email, 254).toLowerCase(); const numero = cleanText(p.numero, 30); const destino = cleanText(p.destino, 120);
    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[-+()\d\s.]{8,30}$/.test(numero) || !destino) return res.status(400).json({ message: 'Informe nome, e-mail, telefone e destino válidos.' });
    const requests = readBudgetRequests(); const item = { id: cryptoRandomId(), nome, email, numero, destino, status: 'Pendente', criadoEm: new Date().toISOString() };
    requests.unshift(item); writeJson(budgetDataFile, requests); res.status(201).json({ message: 'Solicitação recebida.' });
  } catch (error) { sendError(res, error); }
});
app.get('/api/budget-requests', adminLimiter, requireAdmin, (req, res) => { try { res.json(readBudgetRequests()); } catch (error) { sendError(res, error); } });
app.put('/api/budget-requests/:id', adminLimiter, requireAdmin, (req, res) => {
  try { const status = req.body?.status; if (!['Pendente', 'Respondido'].includes(status)) return res.status(400).json({ message: 'Status inválido.' }); const requests = readBudgetRequests(); const i = requests.findIndex((item) => item.id === req.params.id); if (i < 0) return res.status(404).json({ message: 'Solicitação não encontrada.' }); requests[i].status = status; writeJson(budgetDataFile, requests); res.json(requests[i]); } catch (error) { sendError(res, error); }
});

app.listen(PORT, () => console.log(`Servidor backend rodando na porta ${PORT}`));

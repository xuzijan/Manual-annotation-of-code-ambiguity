const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'progress.json');
const QUESTIONS_FILE = path.join(__dirname, 'step3_sample_30_readable.json');

function loadQuestions() {
  const raw = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
  return raw.map((item, idx) => ({
    id: item.sample_id,
    text: item.dialogue_lines.join('\n\n')
  }));
}

let questions = [];
try {
  questions = loadQuestions();
} catch (e) {
  console.warn('无法加载题目文件，使用空列表', e);
}

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ currentIndex: 0, answers: {} }));
  }
}

function readProgress() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { currentIndex: 0, answers: {} };
  }
}

function writeProgress(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/questions
  if (req.method === 'GET' && url.pathname === '/api/questions') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(questions));
    return;
  }

  // GET /api/progress
  if (req.method === 'GET' && url.pathname === '/api/progress') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(readProgress()));
    return;
  }

  // POST /api/answer
  if (req.method === 'POST' && url.pathname === '/api/answer') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { questionId, answer } = JSON.parse(body);
        const progress = readProgress();
        progress.answers[questionId] = answer;
        const idx = questions.findIndex(q => q.id === questionId);
        if (idx >= 0 && idx > progress.currentIndex) {
          progress.currentIndex = idx;
        }
        writeProgress(progress);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // 静态文件：index.html
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const filePath = path.join(__dirname, 'index.html');
    res.setHeader('Content-Type', 'text/html');
    res.end(fs.readFileSync(filePath));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

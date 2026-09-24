const puzzle = {
  size: 10,
  words: [
    { id: 1, number: 1, direction: 'across', row: 0, col: 0, answer: 'DADOS', clue: 'Informações que podem ser armazenadas e processadas.' },
    { id: 2, number: 2, direction: 'down', row: 0, col: 1, answer: 'ALGORITMO', clue: 'Sequência lógica de passos para resolver um problema.' },
    { id: 3, number: 3, direction: 'down', row: 0, col: 7, answer: 'ONLINE', clue: 'Estado de quem está conectado à internet.' },
    { id: 4, number: 4, direction: 'across', row: 3, col: 0, answer: 'CODIGO', clue: 'Conjunto de instruções escritas para um computador.' },
    { id: 5, number: 5, direction: 'across', row: 5, col: 1, answer: 'INTERNET', clue: 'Rede mundial que conecta computadores e dispositivos.' },
    { id: 6, number: 6, direction: 'down', row: 5, col: 6, answer: 'NUVEM', clue: 'Forma de armazenar e acessar arquivos pela internet.' },
    { id: 7, number: 7, direction: 'across', row: 8, col: 0, answer: 'ROBOT', clue: 'Máquina programável capaz de executar tarefas.' }
  ]
};

const grid = Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(null));
const cellWords = new Map();
let activeWordId = null;
let activeDirection = 'across';
let elapsed = 0;
let timerHandle = null;
let finished = false;

function keyFor(row, col) { return `${row}-${col}`; }

function buildGridData() {
  puzzle.words.forEach(word => {
    [...word.answer].forEach((letter, index) => {
      const row = word.row + (word.direction === 'down' ? index : 0);
      const col = word.col + (word.direction === 'across' ? index : 0);
      if (row >= puzzle.size || col >= puzzle.size) return;
      if (!grid[row][col]) grid[row][col] = { letter, number: null };
      grid[row][col].letter = letter;
      if (index === 0) grid[row][col].number = grid[row][col].number || word.number;
      const key = keyFor(row, col);
      if (!cellWords.has(key)) cellWords.set(key, []);
      cellWords.get(key).push(word.id);
    });
  });
}

function renderGrid() {
  const container = document.getElementById('crossword');
  container.innerHTML = '';
  grid.forEach((row, r) => row.forEach((cell, c) => {
    const box = document.createElement('div');
    box.className = cell ? 'cell' : 'cell block';
    box.dataset.row = r;
    box.dataset.col = c;
    if (cell) {
      if (cell.number) {
        const n = document.createElement('span');
        n.className = 'number';
        n.textContent = cell.number;
        box.appendChild(n);
      }
      const input = document.createElement('input');
      input.maxLength = 1;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', `Linha ${r + 1}, coluna ${c + 1}`);
      input.addEventListener('focus', () => selectFromCell(r, c));
      input.addEventListener('click', () => selectFromCell(r, c, true));
      input.addEventListener('input', e => handleInput(e, r, c));
      input.addEventListener('keydown', e => handleKeyDown(e, r, c));
      box.appendChild(input);
    }
    container.appendChild(box);
  }));
}

function wordsAt(row, col) { return (cellWords.get(keyFor(row, col)) || []).map(id => puzzle.words.find(w => w.id === id)); }

function selectFromCell(row, col, cycle = false) {
  const options = wordsAt(row, col);
  if (!options.length) return;
  let selected = options.find(w => w.id === activeWordId);
  if (cycle && options.length > 1 && selected) {
    const idx = options.indexOf(selected);
    selected = options[(idx + 1) % options.length];
  } else if (!selected) {
    selected = options.find(w => w.direction === activeDirection) || options[0];
  }
  selectWord(selected.id, row, col);
}

function selectWord(id, focusRow = null, focusCol = null) {
  activeWordId = id;
  const word = puzzle.words.find(w => w.id === id);
  activeDirection = word.direction;
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected', 'active'));
  getWordCells(word).forEach(({ row, col }) => {
    const cell = getCell(row, col);
    cell?.classList.add('selected');
  });
  const activeCell = focusRow !== null ? getCell(focusRow, focusCol) : getCell(word.row, word.col);
  activeCell?.classList.add('active');
  document.getElementById('activeClueTitle').textContent = `${word.number}. ${word.clue}`;
  document.querySelectorAll('.clue-item').forEach(i => i.classList.toggle('active', Number(i.dataset.id) === id));
}

function getWordCells(word) {
  return [...word.answer].map((_, i) => ({
    row: word.row + (word.direction === 'down' ? i : 0),
    col: word.col + (word.direction === 'across' ? i : 0)
  }));
}

function getCell(row, col) { return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`); }
function getInput(row, col) { return getCell(row, col)?.querySelector('input'); }

function handleInput(event, row, col) {
  const value = event.target.value.toUpperCase().replace(/[^A-ZÀ-ÚÇ]/g, '').slice(-1);
  event.target.value = value;
  clearValidation(row, col);
  if (value) moveAlongWord(row, col, 1);
  updateProgress();
}

function clearValidation(row, col) {
  getCell(row, col)?.classList.remove('wrong', 'correct');
}

function handleKeyDown(event, row, col) {
  if (event.key === 'Backspace' && !event.target.value) {
    event.preventDefault();
    moveAlongWord(row, col, -1, true);
    return;
  }
  const arrows = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  if (arrows[event.key]) {
    event.preventDefault();
    const [dr, dc] = arrows[event.key];
    focusValidCell(row + dr, col + dc);
  }
}

function moveAlongWord(row, col, delta, erase = false) {
  const word = puzzle.words.find(w => w.id === activeWordId);
  if (!word) return;
  const cells = getWordCells(word);
  const index = cells.findIndex(c => c.row === row && c.col === col);
  const next = cells[index + delta];
  if (next) {
    const input = getInput(next.row, next.col);
    if (erase) input.value = '';
    input?.focus();
  }
}

function focusValidCell(row, col) {
  const input = getInput(row, col);
  if (input) input.focus();
}

function renderClues(direction = 'across') {
  const list = document.getElementById('clueList');
  list.innerHTML = '';
  puzzle.words.filter(w => w.direction === direction).forEach(word => {
    const button = document.createElement('button');
    button.className = 'clue-item';
    button.dataset.id = word.id;
    button.type = 'button';
    button.innerHTML = `<span class="clue-number">${word.number}.</span>${word.clue}<span class="clue-answer-meta">${word.answer.length} letras</span>`;
    button.addEventListener('click', () => {
      selectWord(word.id);
      getInput(word.row, word.col)?.focus();
    });
    list.appendChild(button);
  });
}

function checkAnswers(showErrors = true) {
  let allCorrect = true;
  puzzle.words.forEach(word => {
    let wordCorrect = true;
    getWordCells(word).forEach(({ row, col }, index) => {
      const input = getInput(row, col);
      const cell = getCell(row, col);
      const hasLetter = input?.value.toUpperCase();
      const correct = hasLetter === word.answer[index];
      if (!correct) wordCorrect = false;
      if (showErrors && hasLetter) cell?.classList.toggle('wrong', !correct);
      if (correct) cell?.classList.add('correct');
    });
    if (!wordCorrect) allCorrect = false;
  });
  updateProgress();
  if (allCorrect) finishGame();
  return allCorrect;
}

function wordIsCorrect(word) {
  return getWordCells(word).every(({ row, col }, index) => getInput(row, col)?.value.toUpperCase() === word.answer[index]);
}

function updateProgress() {
  const solved = puzzle.words.filter(wordIsCorrect).length;
  document.getElementById('progressText').textContent = `${solved} / ${puzzle.words.length}`;
  document.querySelectorAll('.clue-item').forEach(item => {
    const word = puzzle.words.find(w => w.id === Number(item.dataset.id));
    item.classList.toggle('completed', wordIsCorrect(word));
  });
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function startTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (finished) return;
    elapsed += 1;
    document.getElementById('timer').textContent = formatTime(elapsed);
  }, 1000);
}

function finishGame() {
  if (finished) return;
  finished = true;
  clearInterval(timerHandle);
  document.getElementById('finalTime').textContent = formatTime(elapsed);
  document.getElementById('modal').classList.remove('hidden');
}

function resetGame() {
  finished = false;
  elapsed = 0;
  document.getElementById('timer').textContent = '00:00';
  document.getElementById('modal').classList.add('hidden');
  document.querySelectorAll('.cell input').forEach(input => input.value = '');
  document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('selected', 'active', 'correct', 'wrong'));
  activeWordId = null;
  document.getElementById('activeClueTitle').textContent = 'Selecione uma palavra';
  updateProgress();
  startTimer();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderClues(tab.dataset.tab);
    if (activeWordId) {
      const active = puzzle.words.find(w => w.id === activeWordId);
      if (active?.direction === tab.dataset.tab) selectWord(activeWordId);
    }
  }));
}

buildGridData();
renderGrid();
renderClues();
setupTabs();
startTimer();
updateProgress();

document.getElementById('checkBtn').addEventListener('click', () => checkAnswers(true));
document.getElementById('restartBtn').addEventListener('click', resetGame);
document.getElementById('playAgainBtn').addEventListener('click', resetGame);
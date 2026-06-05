const BTN_CLASS = 'jsc-apostar-btn';

const style = document.createElement('style');
style.textContent = `
  .${BTN_CLASS} {
    margin-left: auto;
    padding: .3rem .65rem;
    font-size: .62rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif;
    text-transform: uppercase;
    letter-spacing: .07em;
    border: 2px solid #1a1a1a;
    border-radius: 0;
    background: transparent;
    color: #e67541;
    box-shadow: 2px 2px 0 #111;
    cursor: pointer;
    transition: background .1s, color .1s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .${BTN_CLASS}:hover:not(:disabled) {
    background: #e67541;
    color: #fff;
  }
  .${BTN_CLASS}:active:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .${BTN_CLASS}:disabled {
    opacity: .55;
    cursor: default;
    box-shadow: none;
  }
  .${BTN_CLASS}.done {
    background: #008dd0;
    color: #fff;
    border-color: #1a1a1a;
    box-shadow: 2px 2px 0 #111;
  }
  .${BTN_CLASS}.err {
    background: transparent;
    color: #e67541;
    border-color: #1a1a1a;
    box-shadow: 2px 2px 0 #111;
  }
`;
document.head.appendChild(style);

function injectButtons(container) {
  container.querySelectorAll('.line').forEach(line => {
    if (line.querySelector('.' + BTN_CLASS)) return;

    const numbers = line.dataset.numbers?.split(',').map(Number).filter(Boolean);
    const lucky = Number(line.dataset.lucky);
    if (!numbers?.length || !lucky) return;

    const btn = document.createElement('button');
    btn.className = BTN_CLASS;
    btn.textContent = 'Apostar';
    btn.title = 'Enviar para o Carrinho de Apostas do Jogos Santa Casa';
    btn.addEventListener('click', () => handleBet(btn, numbers, lucky));
    line.appendChild(btn);
  });
}

async function handleBet(btn, numbers, lucky) {
  btn.disabled = true;
  btn.textContent = 'A enviar...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'ADD_TO_BASKET', numbers, lucky });
    if (response?.ok) {
      btn.textContent = '✓ Carrinho';
      btn.classList.add('done');
    } else {
      throw new Error(response?.error ?? 'Erro desconhecido');
    }
  } catch (e) {
    btn.textContent = '✗ Erro';
    btn.classList.add('err');
    btn.disabled = false;
    console.error('[totoloto-ext]', e);
  }
}

const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (!m.addedNodes.length) continue;
    const t = m.target;
    if (t.id === 'results' || t.id === 'smart-results') injectButtons(t);
  }
});

observer.observe(document.body, { childList: true, subtree: true });
injectButtons(document.body);

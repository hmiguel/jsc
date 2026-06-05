const BTN_CLASS = 'jsc-apostar-btn';

const style = document.createElement('style');
style.textContent = `
  .${BTN_CLASS} {
    margin-left: .75rem;
    padding: .2rem .6rem;
    font-size: .75rem;
    font-family: inherit;
    border: 1px solid var(--primary, #e05a2b);
    border-radius: 4px;
    background: transparent;
    color: var(--primary, #e05a2b);
    cursor: pointer;
    transition: background .15s, color .15s;
    white-space: nowrap;
  }
  .${BTN_CLASS}:hover:not(:disabled) {
    background: var(--primary, #e05a2b);
    color: #fff;
  }
  .${BTN_CLASS}:disabled {
    opacity: .6;
    cursor: default;
  }
  .${BTN_CLASS}.done {
    border-color: var(--green, #2b9e4c);
    color: var(--green, #2b9e4c);
  }
  .${BTN_CLASS}.err {
    border-color: var(--red, #c0392b);
    color: var(--red, #c0392b);
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
  btn.textContent = '…';

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

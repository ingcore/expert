import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from '@/state/store';
import { PruefbefundProvider } from '@/pruefbefund/state/store';
import { App } from '@/App';

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/app.css';
import '@/pruefbefund/styles/onepage.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root-Element nicht gefunden');

createRoot(container).render(
  <StrictMode>
    <StoreProvider>
      <PruefbefundProvider>
        <App />
      </PruefbefundProvider>
    </StoreProvider>
  </StrictMode>,
);

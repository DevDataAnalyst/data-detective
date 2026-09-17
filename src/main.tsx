import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import './index.css';
import { routes } from './routes';
import { appEventLog, appProgressStore } from './storage/appStorage';
import { ProgressProvider } from './storage/ProgressProvider';

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProgressProvider store={appProgressStore} events={appEventLog}>
      <RouterProvider router={router} />
    </ProgressProvider>
  </StrictMode>,
);

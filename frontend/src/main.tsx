import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { queryClient } from './lib/queryClient';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light">
        <Notifications />
        <App />
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

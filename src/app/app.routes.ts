import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/llm-chat/llm-chat').then(m => m.LlmChatComponent),
    title: 'Arrivia Document Glossary',
  },
];

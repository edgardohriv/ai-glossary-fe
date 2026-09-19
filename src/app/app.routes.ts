import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'rag-chat',
  },
  {
    path: 'llm-chat',
    loadComponent: () =>
      import('./features/llm-chat/llm-chat').then(m => m.LlmChatComponent),
    title: 'Arrivia Document Glossary - LLM CHAT',
  },
  {
    path: 'rag-chat',
    loadComponent: () =>
      import('./features/rag-chat/rag-chat').then(m => m.RagChatComponent),
    title: 'Arrivia Document Glossary - RAG CHAT',
  },
];

import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-rag-error-banner',
  template: `
    <div class="mx-4 mb-2 flex items-center gap-3 px-4 py-3
                bg-error-50 border border-error-200 rounded-lg text-error-700
                max-w-3xl md:mx-auto"
         role="alert"
         aria-live="assertive">
      <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p class="flex-1 text-sm font-medium">{{ message() }}</p>
      <button type="button"
              class="text-error-500 hover:text-error-700 transition-colors"
              (click)="dismissed.emit()"
              aria-label="Dismiss error">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `,
})
export class RagErrorBannerComponent {
  readonly message   = input.required<string>();
  readonly dismissed = output();
}

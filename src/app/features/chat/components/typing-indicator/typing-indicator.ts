import { Component } from '@angular/core';

@Component({
  selector: 'app-typing-indicator',
  template: `
    <div class="flex justify-start items-start gap-2"
         role="status"
         aria-label="Assistant is typing">
      <div class="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center
                  text-white text-xs font-bold shrink-0"
           aria-hidden="true">
        AI
      </div>
      <div class="bg-accent-50 border border-accent-200 rounded-2xl rounded-bl-sm
                  px-4 py-3 flex items-center gap-1.5">
        @for (i of [0, 1, 2]; track i) {
          <span class="w-2 h-2 rounded-full bg-accent-500 inline-block"
                [style.animation]="'typing-dot 1.4s ease-in-out infinite'"
                [style.animation-delay]="(i * 0.2) + 's'"
                aria-hidden="true">
          </span>
        }
      </div>
    </div>
  `,
})
export class TypingIndicatorComponent {}

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChatHeaderComponent } from './chat-header';

describe('ChatHeaderComponent', () => {
  let fixture: ComponentFixture<ChatHeaderComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const link = (): HTMLAnchorElement => el().querySelector('a')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatHeaderComponent);
  });

  it('should append RAG CHAT to the title and link to llm-chat in rag mode', () => {
    fixture.componentRef.setInput('mode', 'rag');
    fixture.detectChanges();

    expect(el().querySelector('h1')!.textContent).toContain('Arrivia Document Glossary - RAG CHAT');
    expect(link().getAttribute('href')).toBe('/llm-chat');
    expect(link().getAttribute('aria-label')).toBe('Switch to LLM CHAT');
  });

  it('should append LLM CHAT to the title and link to rag-chat in llm mode', () => {
    fixture.componentRef.setInput('mode', 'llm');
    fixture.detectChanges();

    expect(el().querySelector('h1')!.textContent).toContain('Arrivia Document Glossary - LLM CHAT');
    expect(link().getAttribute('href')).toBe('/rag-chat');
    expect(link().getAttribute('aria-label')).toBe('Switch to RAG CHAT');
  });

  it('should show Thinking... while loading and Online otherwise', () => {
    fixture.componentRef.setInput('mode', 'rag');
    fixture.detectChanges();
    expect(el().textContent).toContain('Online');

    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect(el().textContent).toContain('Thinking...');
  });
});

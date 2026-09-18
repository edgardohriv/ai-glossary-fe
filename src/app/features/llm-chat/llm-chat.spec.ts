import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LlmChatComponent } from './llm-chat';
import { LlmChatService } from './services/llm-chat.service';

describe('LlmChatComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LlmChatComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const service = TestBed.inject(LlmChatService);
    vi.spyOn(service, 'sendMessage').mockResolvedValue(of('Hello'));
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the initial greeting assistant message', () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      messages: () => Array<{ role: string; content: string }>;
    };
    const msgs = component.messages();
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe('assistant');
    expect(msgs[0].content).toContain('Arrivia');
  });

  it('isEmpty should be false after initial greeting is set', () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      isEmpty: () => boolean;
    };
    expect(component.isEmpty()).toBe(false);
  });

  it('canSend should be false when input is empty', () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      inputValue: { set: (v: string) => void };
      canSend: () => boolean;
    };
    component.inputValue.set('');
    expect(component.canSend()).toBe(false);
  });

  it('canSend should be true when input has text and not loading', () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      inputValue: { set: (v: string) => void };
      isLoading: { set: (v: boolean) => void };
      canSend: () => boolean;
    };
    component.inputValue.set('What is MBI?');
    component.isLoading.set(false);
    expect(component.canSend()).toBe(true);
  });

  it('canSend should be false when isLoading is true', () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      inputValue: { set: (v: string) => void };
      isLoading: { set: (v: boolean) => void };
      canSend: () => boolean;
    };
    component.inputValue.set('Hello');
    component.isLoading.set(true);
    expect(component.canSend()).toBe(false);
  });

  it('onSend() should add the user message to the messages list', async () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      inputValue: { set: (v: string) => void };
      messages: () => Array<{ role: string; content: string }>;
      onSend: (text: string) => Promise<void>;
    };
    component.inputValue.set('What is MBI?');
    await component.onSend('What is MBI?');
    const msgs = component.messages();
    expect(msgs.some(m => m.role === 'user' && m.content === 'What is MBI?')).toBe(true);
  });

  it('onSend() should call llmChatService.sendMessage', async () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const service = TestBed.inject(LlmChatService);
    const component = fixture.componentInstance as unknown as {
      inputValue: { set: (v: string) => void };
      onSend: (text: string) => Promise<void>;
    };
    component.inputValue.set('Test question');
    await component.onSend('Test question');
    expect(service.sendMessage).toHaveBeenCalled();
  });

  it('onSend() should clear the error signal before sending', async () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      inputValue: { set: (v: string) => void };
      error: { set: (v: string | null) => void; (): string | null };
      onSend: (text: string) => Promise<void>;
    };
    component.error.set('Previous error');
    component.inputValue.set('New message');
    await component.onSend('New message');
    expect(component.error()).toBeNull();
  });

  it('onDismissError() should clear the error signal', () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const component = fixture.componentInstance as unknown as {
      error: { set: (v: string | null) => void; (): string | null };
      onDismissError: () => void;
    };
    component.error.set('Some error');
    component.onDismissError();
    expect(component.error()).toBeNull();
  });

  it('onSend() should not send when input is whitespace only', async () => {
    const fixture = TestBed.createComponent(LlmChatComponent);
    const service = TestBed.inject(LlmChatService);
    const component = fixture.componentInstance as unknown as {
      inputValue: { set: (v: string) => void };
      onSend: (text: string) => Promise<void>;
    };
    component.inputValue.set('   ');
    await component.onSend('   ');
    expect(service.sendMessage).not.toHaveBeenCalled();
  });
});

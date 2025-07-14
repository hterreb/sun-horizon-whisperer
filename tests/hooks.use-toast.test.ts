import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { toast } from '../src/components/ui/use-toast';

describe('toast', () => {
  it('displays a toast', () => {
    const show = vi.fn();
    toast.show = show;
    toast.show('Test');
    expect(show).toHaveBeenCalledWith('Test');
  });
  it('updates a toast', () => {
    const update = vi.fn();
    toast.update = update;
    toast.update('id', { content: 'Updated' });
    expect(update).toHaveBeenCalledWith('id', { content: 'Updated' });
  });
  it('dismisses a toast', () => {
    const dismiss = vi.fn();
    toast.dismiss = dismiss;
    toast.dismiss('id');
    expect(dismiss).toHaveBeenCalledWith('id');
  });
}); 
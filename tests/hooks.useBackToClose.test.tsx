import { render, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useBackToClose } from '../src/hooks/useBackToClose';

// Item 173: Back closes the top open layer; a layer closed in the UI takes its entry back.
const Layer = ({ open, onClose, enabled = true }: { open: boolean; onClose: () => void; enabled?: boolean }) => {
  useBackToClose(open, onClose, enabled);
  return null;
};
const back = () => act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });

describe('useBackToClose (ROADMAP item 173)', () => {
  let pushState: ReturnType<typeof vi.spyOn>;
  let historyBack: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    pushState = vi.spyOn(window.history, 'pushState');
    historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds one entry per open layer, and Back closes only the top one', () => {
    const closePanel = vi.fn();
    const closeSearch = vi.fn();
    const { rerender } = render(<><Layer open onClose={closePanel} /><Layer open={false} onClose={closeSearch} /></>);
    rerender(<><Layer open onClose={closePanel} /><Layer open onClose={closeSearch} /></>);
    expect(pushState).toHaveBeenCalledTimes(2);

    back();
    expect(closeSearch).toHaveBeenCalledTimes(1);
    expect(closePanel).not.toHaveBeenCalled();
    // Closed by Back: its cleanup does not go back once more.
    rerender(<><Layer open onClose={closePanel} /><Layer open={false} onClose={closeSearch} /></>);
    expect(historyBack).not.toHaveBeenCalled();

    back();
    expect(closePanel).toHaveBeenCalledTimes(1);
  });

  it('a layer closed in the UI takes its entry back, and that popstate closes nothing', () => {
    const closePanel = vi.fn();
    const closeDialog = vi.fn();
    const { rerender } = render(<><Layer open onClose={closePanel} /><Layer open onClose={closeDialog} /></>);
    rerender(<><Layer open onClose={closePanel} /><Layer open={false} onClose={closeDialog} /></>);
    expect(historyBack).toHaveBeenCalledTimes(1);

    back(); // the popstate of that history.back()
    expect(closePanel).not.toHaveBeenCalled();
    expect(closeDialog).not.toHaveBeenCalled();

    back(); // a real Back
    expect(closePanel).toHaveBeenCalledTimes(1);
    rerender(<><Layer open={false} onClose={closePanel} /><Layer open={false} onClose={closeDialog} /></>);
  });

  it('does nothing when it is off (not a phone)', () => {
    const close = vi.fn();
    render(<Layer open onClose={close} enabled={false} />);
    expect(pushState).not.toHaveBeenCalled();
    back();
    expect(close).not.toHaveBeenCalled();
  });
});

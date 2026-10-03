import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { applyScenePlaybackRate, useScenePlaybackRate } from '../src/hooks/useScenePlaybackRate';
import type { PlayDirection } from '../src/utils/timeTravel';

// jsdom has no Web Animations API: a fake animation with the fields the hook reads and writes.
interface FakeAnimation {
  playbackRate: number;
  currentTime: number;
  effect: { target: Element; getComputedTiming: () => { endTime: number; duration: number } };
  transitionProperty?: string;
}
const fakeAnimation = (
  { currentTime = 0, duration = 96000, delay = 0, iterations = 1, target = document.createElement('div') } = {},
): FakeAnimation => ({
  playbackRate: 1,
  currentTime,
  effect: { target, getComputedTiming: () => ({ endTime: delay + iterations * duration, duration }) },
});
const sceneWith = (animations: FakeAnimation[]) => {
  const scene = document.createElement('div');
  scene.getAnimations = vi.fn(() => animations as unknown as Animation[]);
  return scene;
};

describe('applyScenePlaybackRate (ROADMAP item 83)', () => {
  it('plays each animation 8x faster forward, without a jump', () => {
    const boat = fakeAnimation({ currentTime: 30000 });
    applyScenePlaybackRate(sceneWith([boat]), 1, true);
    expect(boat.playbackRate).toBe(8);
    expect(boat.currentTime).toBe(30000);
    const spawn = fakeAnimation({ currentTime: 50 });
    applyScenePlaybackRate(sceneWith([boat, spawn]), 1, false);
    expect(spawn.playbackRate).toBe(8);
    expect(spawn.currentTime).toBe(50);
  });

  it('turns the animations on screen where they are when rewind starts', () => {
    const boat = fakeAnimation({ currentTime: 30000 });
    applyScenePlaybackRate(sceneWith([boat]), -1, true);
    expect(boat.playbackRate).toBe(-8);
    expect(boat.currentTime).toBe(30000);
  });

  it('starts a spawn in rewind at its end, its delay included, so it comes in from the right', () => {
    const boat = fakeAnimation({ currentTime: 30000 });
    applyScenePlaybackRate(sceneWith([boat]), -1, true);
    const companion = fakeAnimation({ currentTime: 50, duration: 80000, delay: 3000 });
    applyScenePlaybackRate(sceneWith([boat, companion]), -1, false);
    expect(companion.currentTime).toBe(83000);
    expect(companion.playbackRate).toBe(-8);
    expect(boat.currentTime).toBe(30000); // known animations keep their place
  });

  it('keeps a reversed infinite animation (the cloud drift) running, in its phase', () => {
    const cloud = fakeAnimation({ currentTime: 1000, duration: 45000, iterations: Infinity });
    applyScenePlaybackRate(sceneWith([cloud]), -1, true);
    expect(cloud.playbackRate).toBe(-8);
    expect(cloud.currentTime).toBeGreaterThanOrEqual(3_600_000);
    expect((cloud.currentTime - 1000) % 90000).toBe(0); // whole alternate periods
    const far = cloud.currentTime;
    applyScenePlaybackRate(sceneWith([cloud]), -1, false);
    expect(cloud.currentTime).toBe(far); // enough in reserve: no second jump
  });

  it('puts every animation back to live speed on pause', () => {
    const boat = fakeAnimation({ currentTime: 30000 });
    boat.playbackRate = -8;
    applyScenePlaybackRate(sceneWith([boat]), 0, true);
    expect(boat.playbackRate).toBe(1);
    expect(boat.currentTime).toBe(30000);
  });

  it('leaves CSS transitions and elements marked data-live-speed (snow, hail) at live speed', () => {
    const colour = { ...fakeAnimation(), transitionProperty: 'color' };
    const flake = document.createElement('div');
    flake.setAttribute('data-live-speed', '');
    const inside = document.createElement('span');
    flake.appendChild(inside);
    const snow = fakeAnimation({ target: inside, iterations: Infinity, duration: 6000 });
    applyScenePlaybackRate(sceneWith([colour, snow]), -1, false);
    expect(colour.playbackRate).toBe(1);
    expect(snow.playbackRate).toBe(1);
    expect(snow.currentTime).toBe(0);
  });
});

describe('useScenePlaybackRate (ROADMAP item 83)', () => {
  const renderScene = (scene: HTMLElement, direction: PlayDirection) =>
    renderHook(({ dir }) => useScenePlaybackRate({ current: scene }, dir), { initialProps: { dir: direction } });

  it('does not touch the animations in live mode', () => {
    const scene = sceneWith([fakeAnimation()]);
    const { rerender } = renderScene(scene, 0);
    rerender({ dir: 0 });
    expect(scene.getAnimations).not.toHaveBeenCalled();
  });

  it('follows play after each render, and sets live speed once after pause', () => {
    const boat = fakeAnimation({ currentTime: 30000 });
    const animations = [boat];
    const scene = sceneWith(animations);
    const { rerender } = renderScene(scene, 0);
    rerender({ dir: -1 });
    expect(boat.playbackRate).toBe(-8);
    expect(boat.currentTime).toBe(30000);
    const spawn = fakeAnimation({ currentTime: 0, duration: 80000 });
    animations.push(spawn);
    rerender({ dir: -1 }); // the next play tick
    expect(spawn.currentTime).toBe(80000);
    expect(spawn.playbackRate).toBe(-8);
    rerender({ dir: 0 });
    expect(boat.playbackRate).toBe(1);
    expect(spawn.playbackRate).toBe(1);
    const calls = vi.mocked(scene.getAnimations).mock.calls.length;
    rerender({ dir: 0 });
    expect(scene.getAnimations).toHaveBeenCalledTimes(calls);
  });

  it('does nothing where the browser has no Web Animations API', () => {
    const scene = document.createElement('div');
    expect(() => renderScene(scene, 1)).not.toThrow();
  });
});

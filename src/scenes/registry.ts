import type { ComponentType, LazyExoticComponent } from 'react';

export interface SceneProps {
  /** True while this is the station the viewer is at; neighbours are mounted but idle. */
  active: boolean;
}

export interface SceneEntry {
  Scene: LazyExoticComponent<ComponentType<SceneProps>>;
  Controls: LazyExoticComponent<ComponentType>;
}

/** Section id → lazily loaded 3D scene and DOM controls. Filled in one scene per build step. */
export const SCENES: Partial<Record<string, SceneEntry>> = {};

"use client";

import * as React from "react";
import {
  WorldExperienceCanvas,
  type WorldCanvasHandle
} from "@/components/landing/WorldExperienceCanvas";

/**
 * The boundary between the page and the renderer.
 *
 * `ScholarMindExperience` cannot import the canvas module directly, because
 * that module imports three.js and three.js must never enter the server bundle
 * or the initial client chunk. So this file is the thing `next/dynamic` loads,
 * and it is the only module in the landing tree that knows the canvas exists.
 *
 * It exists for one other reason: `next/dynamic` and `forwardRef` do not
 * compose reliably, so the handle is handed out through a mutable ref the
 * parent owns. That keeps the imperative contract in one place — the parent
 * pushes progress in, the scene pushes label positions out — instead of
 * threading a ref through a dynamic import and hoping it lands.
 */

type WorldSceneLayerProps = {
  /** Parent-owned slot the scene handle is published into. */
  handleRef: React.MutableRefObject<WorldCanvasHandle | null>;
  onReady: () => void;
  onFailure: (reason: string) => void;
};

export default function WorldSceneLayer({ handleRef, onReady, onFailure }: WorldSceneLayerProps) {
  const canvasRef = React.useRef<WorldCanvasHandle | null>(null);

  // Published after mount, and cleared before unmount, so the parent never
  // calls into a disposed renderer.
  React.useEffect(() => {
    handleRef.current = canvasRef.current;

    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);

  return <WorldExperienceCanvas ref={canvasRef} onReady={onReady} onFailure={onFailure} />;
}

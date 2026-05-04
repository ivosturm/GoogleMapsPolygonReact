import React from "react";
import type {TerraDraw} from 'terra-draw';

import {TerraDrawModeId} from './TerraDrawConfig';
import { logNode } from "./useTerraDraw";

type DrawingControlsProps = {
  draw: TerraDraw | null;
  editable: boolean;
  defaultMode: TerraDrawModeId;
};

const DrawingControls = ({draw, editable, defaultMode}: DrawingControlsProps) => {
  const [activeMode, setActiveMode] = React.useState<TerraDrawModeId>('static');

  React.useEffect(() => {
    if (!draw) return;

    if (!draw.enabled) {
      setActiveMode('static');
      return;
    }

    if (!editable) {
      // Keep TerraDraw in static mode when not editable, no cursor changes
      draw.setMode('static');
      setActiveMode('static');
      return;
    }

    if (activeMode !== 'static') return;

    // Start in default mode once TerraDraw is ready and widget is editable
    console.debug(logNode + " DrawingControls: Setting initial mode to", defaultMode);
    draw.setMode(defaultMode);
    setActiveMode(defaultMode);
  }, [draw, draw?.enabled, editable, defaultMode]);

  return null;
};

export default React.memo(DrawingControls);
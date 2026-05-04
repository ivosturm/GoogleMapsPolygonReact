/** @jsx React.createElement */
import React, { Fragment } from 'react';
import {Position} from 'geojson';

import {logNode, useTerraDraw} from './useTerraDraw';
import { TerraDraw } from 'terra-draw';
import { HexColorStyling } from 'terra-draw/dist/common';

type TerraDrawLayerProps = {
  children: (draw: ReturnType<typeof useTerraDraw>) => React.ReactNode;
  color: HexColorStyling;
  onPolyObjectComplete?: (coordinatesArray: Position[] | Position[][], draw: TerraDraw) => void;
};

const TerraDrawLayer = ({children, color, onPolyObjectComplete}: TerraDrawLayerProps & {onPolyObjectComplete?: (coordinatesArray: Position[] | Position[][], draw: TerraDraw) => void}) => {
  console.debug(logNode + "TerraDrawLayer rendered with color:", color);
  const draw = useTerraDraw(color,onPolyObjectComplete);

  return <>{children(draw)}</>;
};

export default React.memo(TerraDrawLayer);
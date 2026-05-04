import {
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode
} from 'terra-draw';
import { HexColorStyling } from 'terra-draw/dist/common';

export type TerraDrawModeId =
  | 'select'
  | 'linestring'
  | 'polygon'
  | 'static';

export const DRAWING_MODE_BUTTONS: Array<{id: TerraDrawModeId; label: string}> =
  [
    {id: 'select', label: 'Select'},
    {id: 'linestring', label: 'Line'},
    {id: 'polygon', label: 'Polygon'}
  ];

const createLineStringStyles = (color: HexColorStyling) => ({
  lineStringColor: color,
  lineStringOpacity: 0.7,
  lineStringWidth: 5,
  lineStringOutlineColor: "#FFFFFF" as HexColorStyling,
  lineStringOutlineOpacity: 1,
  lineStringOutlineWidth: 7
});

const createPolygonStyles = (color: HexColorStyling) => {
  return {fillColor: color, outlineColor: color};
};

// Selection flags control drag/rotate/vertex editing in Select mode.
const createSelectionFlags = () => ({
  feature: {
    draggable: true,
    rotateable: true,
    coordinates: {
      midpoints: true,
      draggable: true,
      deletable: true
    }
  }
});

// Centralized mode factory to keep UI and TerraDraw configuration in sync.
export const createTerraDrawModes = (color: HexColorStyling) => [
  new TerraDrawSelectMode({
    flags: {
      polygon: createSelectionFlags(),
      linestring: createSelectionFlags()
    }
  }),new TerraDrawLineStringMode({
    editable: true,
    styles: createLineStringStyles(color)
  }),
  new TerraDrawPolygonMode({
    editable: true,
    styles: createPolygonStyles(color)
  }) 
];
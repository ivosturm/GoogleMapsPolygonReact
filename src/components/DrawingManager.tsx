import {useMap, useMapsLibrary} from '@vis.gl/react-google-maps';
import {useEffect, useState} from 'react';
import { PolygonProps } from './Polygon';
import { PolylineProps } from './Polyline';

export function useDrawingManager(
  initialValue: google.maps.drawing.DrawingManager | null = null,
  polygons?: PolygonProps[],
  polylines?: PolylineProps[],
  onPolygonComplete?: (polygon: google.maps.Polygon) => void,
  onPolylineComplete?: (polyline: google.maps.Polygon) => void	
) {
  const map = useMap();
  const drawing = useMapsLibrary('drawing');
  const logNode = "Google Maps Polygon (React) widget: DrawingManager function: ";

  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager | null>(initialValue);

drawingManager?.addListener('overlaycomplete', (event: any) => {
    if (event.type === google.maps.drawing.OverlayType.CIRCLE) {
      console.log(logNode + 'Circle overlay complete');
    } else if (event.type === google.maps.drawing.OverlayType.MARKER) {
      console.log(logNode + 'Marker overlay complete');
    } else if (event.type === google.maps.drawing.OverlayType.POLYGON) {
      console.log(logNode + 'Polygon overlay complete');
      console.dir(event); 
      onPolygonComplete?.(event.overlay);
      drawingManager.setDrawingMode(null);
    } else if (event.type === google.maps.drawing.OverlayType.POLYLINE) {
      console.log(logNode + 'Polyline overlay complete');
      console.dir(event);
      onPolylineComplete?.(event.overlay);
      drawingManager.setDrawingMode(null);
    } else if (event.type === google.maps.drawing.OverlayType.RECTANGLE) {
      console.log(logNode + 'Rectangle overlay complete');  
    }  
});

  useEffect(() => {
    if (!map || !drawing) return;
    // generic options
    let drawingOptions = {
      drawingControl : true,
      drawingControlOptions : {
          drawingModes : [google.maps.drawing.OverlayType.POLYGON,google.maps.drawing.OverlayType.POLYLINE],
          position : google.maps.ControlPosition.TOP_CENTER
      }
    }
    // https://developers.google.com/maps/documentation/javascript/reference/drawing
    const newDrawingManager = new drawing.DrawingManager({
      map,
      drawingControl : true,
      drawingControlOptions : {
          drawingModes : [google.maps.drawing.OverlayType.POLYGON,google.maps.drawing.OverlayType.POLYLINE],
          position : google.maps.ControlPosition.TOP_CENTER
      }
    });

    // only add drawing manager if a poly object with empty coordinatesstring is fed
    if (polygons?.length === 1 && polygons[0].isNew && polylines?.length === 0){
        console.debug(logNode + 'drawingMode Polygon');
        // add polygon options 
        let polygonDrawingOpts = {
            drawingControl : drawingOptions.drawingControl,
            drawingControlOptions : {
                drawingModes : [google.maps.drawing.OverlayType.POLYGON],
                position : drawingOptions.drawingControlOptions.position
            },
            polygonOptions : {
                strokeColor : polygons[0].strokeColor,
                strokeOpacity : polygons[0].strokeOpacity,
                strokeWeight : polygons[0].strokeWeight,
                fillColor : polygons[0].fillColor,
                fillOpacity : polygons[0].fillOpacity
            }
        }
        newDrawingManager.setDrawingMode(polygonDrawingOpts.drawingControlOptions.drawingModes[0])
        newDrawingManager.setOptions(polygonDrawingOpts);
    } else if (polylines?.length === 1 && polylines[0].isNew && polygons?.length === 0){
        console.debug(logNode + 'drawingMode Polyline');
        // add polyline options
        let polylineDrawingOpts = {
            drawingControl : drawingOptions.drawingControl,
            drawingControlOptions : {
                drawingModes : [google.maps.drawing.OverlayType.POLYLINE],
                position : drawingOptions.drawingControlOptions.position
            },
            polylineOptions : {
                strokeColor : polylines[0].strokeColor,
                strokeOpacity : polylines[0].strokeOpacity,
                strokeWeight : polylines[0].strokeWeight
            }
        }
        newDrawingManager.setDrawingMode(polylineDrawingOpts.drawingControlOptions.drawingModes[0])
        newDrawingManager.setOptions(polylineDrawingOpts);       
    } else {
        console.debug(logNode + 'drawingMode NONE');
        drawingOptions.drawingControl = false;
        newDrawingManager.setOptions(drawingOptions);
    }

    setDrawingManager(newDrawingManager);

    return () => {
      newDrawingManager.setMap(null);
    };
  }, [drawing, map]);

  return drawingManager;
}


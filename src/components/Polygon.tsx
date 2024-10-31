import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo
} from 'react';
import { ObjectItem, EditableValue } from "mendix";
import { GoogleMapsContext, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Ref } from 'react';
import { PositionProps } from './PathUtils';

type PolygonEventProps = {
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onDrag?: (e: google.maps.MapMouseEvent) => void;
  onDragStart?: (e: google.maps.MapMouseEvent) => void;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
  onMouseOver?: (e: google.maps.MapMouseEvent) => void;
  onMouseOut?: (e: google.maps.MapMouseEvent) => void;
  onPolygonChange?: (path: google.maps.MVCArray<google.maps.LatLng>) => void;
};

export interface PolyProps {
  coordinatesStringAttrUpdate?: EditableValue<string>;
  isNew: boolean;
  center?: PositionProps;
  guid: string;
  mxObject: ObjectItem;
  name: string;
}

interface PolygonCustomProps extends PolyProps {
  encodedPaths?: string[];
  holes?: PositionProps[];
}

export type PolygonProps = google.maps.PolygonOptions &
  PolygonEventProps &
  PolygonCustomProps;

export type PolygonRef = Ref<google.maps.Polygon | null>;

function usePolygon(props: PolygonProps) {
  const {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    onPolygonChange,
    encodedPaths,
    ...polygonOptions
  } = props;

  const callbacks = useRef({
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    onPolygonChange
  });

  const geometryLibrary = useMapsLibrary('geometry');
  const logNode = "Google Maps Polygon (React) widget: Polygon: ";

  const polygon = useRef(new google.maps.Polygon()).current;

  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // update PolygonOptions (note the dependencies aren't properly checked
  // here, we just assume that setOptions is smart enough to not waste a
  // lot of time updating values that didn't change)
  useMemo(() => {
    polygon.setOptions(polygonOptions);
  }, [polygon, polygonOptions]);

  const map = useContext(GoogleMapsContext)?.map;

  useMemo(() => {
    if (!encodedPaths || !geometryLibrary) return;
    const paths = encodedPaths.map(path =>
      geometryLibrary.encoding.decodePath(path)
    );
    polygon.setPaths(paths);
  }, [polygon, encodedPaths, geometryLibrary]);

  useEffect(() => {
    if (!map) {
      if (map === undefined)
        console.error(logNode + '<Polygon> has to be inside a Map component.');
      return;
    }

    polygon.setMap(map);

    return () => {
      polygon.setMap(null);
    };
  }, [map]);

  const addEventListeners = useCallback(() => {
    const gme = google.maps.event;
    [
      ['click', 'onClick'],
      ['drag', 'onDrag'],
      ['dragstart', 'onDragStart'],
      ['dragend', 'onDragEnd'],
      ['mouseover', 'onMouseOver'],
      ['mouseout', 'onMouseOut']
    ].forEach(([eventName, eventCallback]) => {
      listenersRef.current.push(gme.addListener(polygon, eventName, (e: google.maps.MapMouseEvent) => {
        const callback = callbacks.current[eventCallback as keyof typeof callbacks.current] as ((e: google.maps.MapMouseEvent) => void) | undefined;
        if (callback) callback(e);
      }))
    });

    if (props.editable && props.coordinatesStringAttrUpdate && onPolygonChange) {
      polygon.getPaths().forEach((path) => {
        listenersRef.current.push(gme.addListener(path, 'insert_at', () => { onPolygonChange(path) }))
        listenersRef.current.push(gme.addListener(path, 'set_at', () => { onPolygonChange(path) }))
        listenersRef.current.push(gme.addListener(path, 'remove_at', () => { onPolygonChange(path) }))
      });
    }
  }, [polygon]);

  useEffect(() => {
    if (!polygon) return;

    addEventListeners();

    return () => {
      listenersRef.current.forEach(listener => listener.remove());
    }	 
    
  }, [polygon, polygonOptions]);

  return polygon;
}

/**
 * Component to render a polygon on a map
 */
export const Polygon = forwardRef((props: PolygonProps, ref: PolygonRef) => {
  const polygon = usePolygon(props);

  useImperativeHandle(ref, () => polygon, []);

  return null;
});
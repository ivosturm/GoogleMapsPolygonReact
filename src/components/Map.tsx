import {  Map as GoogleMap, useApiIsLoaded, useMap } from '@vis.gl/react-google-maps';

import React, { createElement, Fragment, useEffect, useRef, useState } from "react";

import {ObjectItem, ListActionValue, EditableValue, ListWidgetValue} from "mendix";
import { Big } from "big.js";

import InfoWindowComponent from "./InfoWindow";
import { createPathFromString, onPolyObjectChange, PositionProps,setCenterPolyobject,
    updateAreaAttributeFromRings,
} from "./PathUtils";
import { Polygon, PolygonProps } from "./Polygon";
import { Polyline, PolylineProps } from "./Polyline";
import { DefaultMapTypeEnum } from "typings/GoogleMapsPolygonProps";

const logNode = "Google Maps Polygon widget: Map: ";

interface ShapeUndoEntry {
    guid: string;
    type: "polygon" | "polyline";
    previousCoordinates: string;
}

export interface InfoWindowStateProps {
    name: string;  
    position: PositionProps;
    mxObject?: ObjectItem;
}

interface GoogleMapsPropsExtended {
    mapContainerStyle?:{
        width: string;
        height: string;
    }
    defaultLat: number;
    defaultLng: number;
    lowestZoom: number;
    onLoad?: (map: google.maps.Map) => void | Promise<void>;
    coordinatesStringAttrUpdate?: EditableValue<string>;
    areaAttrUpdate?: EditableValue<Big>;
    polygons?:PolygonProps[];
    polylines?:PolylineProps[];
    int_disableInfoWindow: boolean;
    int_onClick?: ListActionValue; 
    infoWindowWidget?: ListWidgetValue;
    overruleFitBoundsZoom: boolean;
    defaultMapType: DefaultMapTypeEnum;
    opt_drag: boolean;
    opt_mapcontrol: boolean;
    opt_recenterbutton: boolean;
    opt_scroll: boolean;
    opt_streetview: boolean;
    opt_undobutton: boolean;
    opt_zoomcontrol: boolean;
    opt_fullscreencontrol: boolean;
    opt_tilt: string;
    styleArray: string; 
}

interface MapState {
    center: {
        lat: number;
        lng: number;
    };
    zoom: number;
    bounds: google.maps.LatLngBounds;
    showingInfoWindow: boolean;
    infowindowObj: InfoWindowStateProps;
}

const CustomMap: React.FC<GoogleMapsPropsExtended> = (props) => {

    const [state, setState] = useState<MapState>({
        center: {
            lat: props.defaultLat,
            lng: props.defaultLng
        },
        zoom: props.lowestZoom,
        bounds: {} as google.maps.LatLngBounds,
        showingInfoWindow: false,
        infowindowObj: {} as InfoWindowStateProps
    });

    const isLoaded = useApiIsLoaded();
    const map = useMap();

    // --- Recenter state & refs ---
    const [_initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [initialZoom, setInitialZoom] = useState<number | null>(null);
    const [hasBeenDragged, setHasBeenDragged] = useState(false);
    const [mapSettled, setMapSettled] = useState(false);
    const initialCenterRef = useRef<{ lat: number; lng: number } | null>(null);
    const initialZoomRef = useRef<number | null>(null);
    const mapStateCapturedRef = useRef(false);

    // --- Undo state & refs ---
    const [undoStepCount, setUndoStepCount] = useState(0);
    const [redoStepCount, setRedoStepCount] = useState(0);
    const undoStackRef = useRef<ShapeUndoEntry[]>([]);
    const redoStackRef = useRef<ShapeUndoEntry[]>([]);
    const lastKnownShapeCoordinatesRef = useRef<Record<string, string>>({});
    const draggingShapeRef = useRef<Record<string, boolean>>({});
    const dragStartCoordinatesRef = useRef<Record<string, string>>({});

    // --- Shape instance refs (for immediate visual undo) ---
    const polygonInstancesRef = useRef<Record<string, google.maps.Polygon>>({});
    const polylineInstancesRef = useRef<Record<string, google.maps.Polyline>>({});

    // Reset recenter state whenever a new map instance is attached.
    useEffect(() => {
        setHasBeenDragged(false);
        setMapSettled(false);
        setInitialCenter(null);
        setInitialZoom(null);
        setUndoStepCount(0);
        setRedoStepCount(0);
        undoStackRef.current = [];
        redoStackRef.current = [];
        mapStateCapturedRef.current = false;
        initialCenterRef.current = null;
        initialZoomRef.current = null;
    }, [map]);

    useEffect(() => {
        if (isLoaded && map) {
            console.debug(logNode + "rerendering because map is loaded and polygons/polylines changed...");
            // Reset recenter state so the button doesn't show stale state after data reloads.
            setMapSettled(false);
            setHasBeenDragged(false);
            mapStateCapturedRef.current = false;
            map.setCenter({ lat: props.defaultLat, lng: props.defaultLng });
            handleOnGoogleApiLoaded(map);
        }
    }, [isLoaded, map, props.polygons, props.polylines]);

    // Once the map has settled, capture the initial center/zoom and start
    // listening for user drags to show the recenter button.
    useEffect(() => {
        if (map && isLoaded && mapSettled && !mapStateCapturedRef.current) {
            const center = map.getCenter();
            const zoom = map.getZoom();
            if (center) {
                const centerObj = { lat: center.lat(), lng: center.lng() };
                const zoomVal = zoom || props.lowestZoom;
                initialCenterRef.current = centerObj;
                initialZoomRef.current = zoomVal;
                setInitialCenter(centerObj);
                setInitialZoom(zoomVal);
                mapStateCapturedRef.current = true;

                const dragEndListener = map.addListener("dragend", () => {
                    setHasBeenDragged(true);
                });
                return () => {
                    google.maps.event.removeListener(dragEndListener);
                };
            }
        }
    }, [map, isLoaded, mapSettled]);

    // Keyboard shortcuts:
    // - Ctrl+Z / Cmd+Z: undo
    // - Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z: redo
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isModKey = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();

            if (isModKey && key === "z" && event.shiftKey) {
                if (!redoStackRef.current.length) return;
                event.preventDefault();
                handleRedoLastShapeEdit();
                return;
            }

            if (isModKey && key === "y") {
                if (!redoStackRef.current.length) return;
                event.preventDefault();
                handleRedoLastShapeEdit();
                return;
            }

            if (isModKey && key === "z") {
                if (!undoStackRef.current.length) return;
                event.preventDefault();
                handleUndoLastShapeEdit();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [props.coordinatesStringAttrUpdate]);

    // fitbounds is an async function. The zoom can only be retrieved if this async function was finished, hence add a one time event that waits until map is finished zooming and the get the zoom level and store it in the state for later access
    useEffect(() => {
        if (map) {
            console.debug(logNode + "rerendering map because bounds changed...");
            map.fitBounds(state.bounds);
            google.maps.event.addListenerOnce(map, 'idle', () => {
                setState(prevState => ({ ...prevState, zoom: map.getZoom() || props.lowestZoom }));
                // Mark the map as settled after auto-zoom/center completes
                setMapSettled(true);
            });
        }
    }, [state.bounds]);
    
    const handleOnGoogleApiLoaded = (map: google.maps.Map) => {

        let mapBounds = new google.maps.LatLngBounds();
        let noOfObjects = 0;
        // iterate over all polygons / polylines 
        // 1. set the center
        // 2. add all positions of objects to mapBounds
        if (props.polygons){
            for (var i = 0 ; i < props.polygons.length ; i++){
                setCenterPolyobject(props.polygons[i],mapBounds,"polygon",props.polygons[i].name);
                noOfObjects++;
            }
        }

        if (props.polylines){
            for (var j = 0 ; j < props.polylines.length ; j++){
                setCenterPolyobject(props.polylines[j],mapBounds,"polyline",props.polylines[j].name);
                noOfObjects++;
            } 
        }
        if (noOfObjects == 1 && props.overruleFitBoundsZoom){
            console.debug(logNode + 'zoom: overruling zoomlevel to: ' + props.lowestZoom);
            map.setCenter(mapBounds.getCenter());
            updateMapCenterAndBounds(mapBounds);
            map.setZoom(props.lowestZoom);
            google.maps.event.addListenerOnce(map, 'idle', () => {
                setMapSettled(true);
            });
        } 
        // either no objects at all, or one object without coordinates, zoom to default lat/lng
        else if (noOfObjects === 0 || (noOfObjects === 1 && 
                ((props.polylines && props.polylines.length === 1 && props.polylines[0].isNew) || ((props.polygons && props.polygons.length === 1 && props.polygons[0].isNew)))))
        {
            console.debug(logNode  + 'zoom: no coordinates found for any of the objects, zooming to default lat lng..');
            google.maps.event.addListenerOnce(map, 'idle', () => {
                setMapSettled(true);
            });
        }
        else {
            console.debug(logNode  + 'zoom: fitting bounds for ' + noOfObjects + ' objects..');
            map.fitBounds(mapBounds);
            updateMapCenterAndBounds(mapBounds);
            // const zoom = map.getZoom();
        }      
        // add map options once the google API is loaded    
        /*let mapOptions = createMapOptions();
        if (props.styleArray !== "") {
            mapOptions.styles = JSON.parse(props.styleArray);
        }
        map.setOptions(mapOptions);  */
    };
    const updateMapCenterAndBounds = (mapBounds: any) => {
        const boundsCenter = mapBounds.getCenter();
        const lat = boundsCenter.lat();
        const lng = boundsCenter.lng();
        const mapCenter = {
            lat,lng
        }
        setState(prevState => ({ ...prevState, center: mapCenter, bounds: mapBounds }));
    }

    // --- Recenter handler ---
    const handleRecenter = () => {
        if (map && initialCenterRef.current && initialZoomRef.current !== null) {
            map.setCenter(initialCenterRef.current);
            map.setZoom(initialZoomRef.current);
            setHasBeenDragged(false);
        }
    };

    // --- Undo helpers ---
    const pushUndoEntry = (entry: ShapeUndoEntry) => {
        if (!entry.previousCoordinates || !entry.previousCoordinates.trim()) return;
        undoStackRef.current.push(entry);
        if (undoStackRef.current.length > 50) {
            undoStackRef.current.shift();
        }
        setUndoStepCount(undoStackRef.current.length);

        // Any new edit invalidates the redo history.
        redoStackRef.current = [];
        setRedoStepCount(0);
    };

    const getPolygonOuterPath = (guid: string): google.maps.MVCArray<google.maps.LatLng> | null => {
        const polygon = polygonInstancesRef.current[guid];
        const paths = polygon?.getPaths();

        if (!paths || paths.getLength() === 0) {
            return null;
        }

        return paths.getAt(0);
    };

    const getPolygonRings = (guid: string): google.maps.LatLng[][] => {
        const polygon = polygonInstancesRef.current[guid];
        const paths = polygon?.getPaths();
        if (!paths || paths.getLength() === 0) {
            return [];
        }

        const rings: google.maps.LatLng[][] = [];
        for (let i = 0; i < paths.getLength(); i++) {
            rings.push(paths.getAt(i).getArray());
        }
        return rings;
    };

    const getPolylinePath = (guid: string): google.maps.MVCArray<google.maps.LatLng> | null => {
        const polyline = polylineInstancesRef.current[guid];
        return polyline?.getPath() || null;
    };

    const getShapePath = (type: "polygon" | "polyline", guid: string): google.maps.MVCArray<google.maps.LatLng> | null => {
        return type === "polygon" ? getPolygonOuterPath(guid) : getPolylinePath(guid);
    };

    const getShapeCoordinates = (type: "polygon" | "polyline", guid: string): string => {
        const path = getShapePath(type, guid);
        return path ? path.getArray().toString() : "";
    };

    const setPolygonPathFromCoordinateString = (guid: string, coordinatesString: string) => {
        const instance = polygonInstancesRef.current[guid];
        if (!instance || !coordinatesString) return;
        const parsed = createPathFromString(coordinatesString, false, false).paths;
        if (parsed.length === 0) {
            return;
        }
        const latLngPath = parsed.map(point => new google.maps.LatLng(point.lat, point.lng));
        const existingPaths = instance.getPaths();
        const combinedPaths: google.maps.LatLng[][] = [latLngPath];

        if (existingPaths && existingPaths.getLength() > 1) {
            for (let i = 1; i < existingPaths.getLength(); i++) {
                combinedPaths.push(existingPaths.getAt(i).getArray());
            }
        }

        instance.setPaths(combinedPaths);
    };

    const setPolylinePathFromCoordinateString = (guid: string, coordinatesString: string) => {
        const instance = polylineInstancesRef.current[guid];
        if (!instance || !coordinatesString) return;
        const parsed = createPathFromString(coordinatesString, false, false).paths;
        if (parsed.length === 0) {
            return;
        }
        const latLngPath = parsed.map(point => new google.maps.LatLng(point.lat, point.lng));
        instance.setPath(latLngPath);
    };

    const handleUndoLastShapeEdit = () => {
        const lastEntry = undoStackRef.current.pop();
        setUndoStepCount(undoStackRef.current.length);
        if (!lastEntry || !props.coordinatesStringAttrUpdate) return;

        const currentCoordinates = getShapeCoordinates(lastEntry.type, lastEntry.guid);
        if (currentCoordinates && currentCoordinates !== lastEntry.previousCoordinates) {
            redoStackRef.current.push({
                guid: lastEntry.guid,
                type: lastEntry.type,
                previousCoordinates: currentCoordinates
            });
            if (redoStackRef.current.length > 50) {
                redoStackRef.current.shift();
            }
            setRedoStepCount(redoStackRef.current.length);
        }

        props.coordinatesStringAttrUpdate.setValue(lastEntry.previousCoordinates);
        lastKnownShapeCoordinatesRef.current[`${lastEntry.type}:${lastEntry.guid}`] = lastEntry.previousCoordinates;

        if (lastEntry.type === "polygon") {
            setPolygonPathFromCoordinateString(lastEntry.guid, lastEntry.previousCoordinates);
            updateAreaAttributeFromRings(getPolygonRings(lastEntry.guid), props.areaAttrUpdate);
        } else {
            setPolylinePathFromCoordinateString(lastEntry.guid, lastEntry.previousCoordinates);
        }
    };

    const handleRedoLastShapeEdit = () => {
        const lastEntry = redoStackRef.current.pop();
        setRedoStepCount(redoStackRef.current.length);
        if (!lastEntry || !props.coordinatesStringAttrUpdate) return;

        const currentCoordinates = getShapeCoordinates(lastEntry.type, lastEntry.guid);
        if (currentCoordinates && currentCoordinates !== lastEntry.previousCoordinates) {
            undoStackRef.current.push({
                guid: lastEntry.guid,
                type: lastEntry.type,
                previousCoordinates: currentCoordinates
            });
            if (undoStackRef.current.length > 50) {
                undoStackRef.current.shift();
            }
            setUndoStepCount(undoStackRef.current.length);
        }

        props.coordinatesStringAttrUpdate.setValue(lastEntry.previousCoordinates);
        lastKnownShapeCoordinatesRef.current[`${lastEntry.type}:${lastEntry.guid}`] = lastEntry.previousCoordinates;

        if (lastEntry.type === "polygon") {
            setPolygonPathFromCoordinateString(lastEntry.guid, lastEntry.previousCoordinates);
            updateAreaAttributeFromRings(getPolygonRings(lastEntry.guid), props.areaAttrUpdate);
        } else {
            setPolylinePathFromCoordinateString(lastEntry.guid, lastEntry.previousCoordinates);
        }
    };

    const handleShapeDragStart = (type: "polygon" | "polyline", guid: string) => {
        const shapeKey = `${type}:${guid}`;
        draggingShapeRef.current[shapeKey] = true;
        dragStartCoordinatesRef.current[shapeKey] =
            lastKnownShapeCoordinatesRef.current[shapeKey] || getShapeCoordinates(type, guid);
    };

    const handleShapePathChange = (
        type: "polygon" | "polyline",
        guid: string,
        path: google.maps.MVCArray<google.maps.LatLng>,
        _withAreaUpdate: boolean
    ) => {
        const shapeKey = `${type}:${guid}`;
        if (draggingShapeRef.current[shapeKey]) return;

        const currentCoordinates = path.getArray().toString();
        const previousCoordinates = lastKnownShapeCoordinatesRef.current[shapeKey] || currentCoordinates;

        if (currentCoordinates !== previousCoordinates) {
            pushUndoEntry({ guid, type, previousCoordinates });
            lastKnownShapeCoordinatesRef.current[shapeKey] = currentCoordinates;
        }

        onPolyObjectChange(
            path,
            previousCoordinates,
            props.coordinatesStringAttrUpdate
        );

        if (_withAreaUpdate) {
            updateAreaAttributeFromRings(getPolygonRings(guid), props.areaAttrUpdate);
        }
    };

    const handleShapeDragEnd = (type: "polygon" | "polyline", guid: string, _withAreaUpdate: boolean) => {
        const shapeKey = `${type}:${guid}`;
        const path = getShapePath(type, guid);
        const previousCoordinates = dragStartCoordinatesRef.current[shapeKey] || lastKnownShapeCoordinatesRef.current[shapeKey] || "";

        draggingShapeRef.current[shapeKey] = false;
        delete dragStartCoordinatesRef.current[shapeKey];

        if (!path) {
            return;
        }

        const currentCoordinates = path.getArray().toString();

        if (!currentCoordinates || currentCoordinates === previousCoordinates) {
            lastKnownShapeCoordinatesRef.current[shapeKey] = currentCoordinates || previousCoordinates;
            return;
        }

        pushUndoEntry({ guid, type, previousCoordinates });
        lastKnownShapeCoordinatesRef.current[shapeKey] = currentCoordinates;

        onPolyObjectChange(
            path,
            previousCoordinates,
            props.coordinatesStringAttrUpdate
        );

        if (_withAreaUpdate) {
            updateAreaAttributeFromRings(getPolygonRings(guid), props.areaAttrUpdate);
        }
    };

    const onInfoWindowClose = () => {
        // Your logic for handling InfoWindow close
        setState(prevState => ({ ...prevState, showingInfoWindow: false }));
    };
    const isShapeNonInteractive = (mxObject: ObjectItem) =>
        props.int_disableInfoWindow && !props.int_onClick?.get(mxObject).canExecute;
    const mvcObjectClickHandler = (event: any, name: string, center?: PositionProps, mxObject?: ObjectItem) => {
        if (props.int_onClick && mxObject) {
            props.int_onClick.get(mxObject).execute();
        }

        if (props.int_disableInfoWindow) {
            setState(prevState => ({ ...prevState, showingInfoWindow: false }));
            return;
        }

        // if optional center wasn't passed, use the event's latLng
        if (!center) {
            center = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        }
        // Your logic for handling MVC object click
        setState((prevState: MapState) => ({
            ...prevState,
            showingInfoWindow: true,
            infowindowObj: {
                //...prevState.infowindowObj,
                name,
                position: center as PositionProps,
                mxObject
            }
        }));
    };

    return (
        <>
            {isLoaded ? (
                <GoogleMap
                        style={props.mapContainerStyle}
                        defaultCenter={Object.keys(state.bounds).length === 0 ? state.center : { lat: state.bounds.getCenter().lat(), lng: state.bounds.getCenter().lng() }}
                        defaultZoom={state.zoom}
                        draggable={props.opt_drag}
                        zoomControl={props.opt_zoomcontrol}
                        zoomControlOptions={{
                            position: google.maps.ControlPosition.RIGHT_CENTER
                        }}
                        scrollwheel={props.opt_scroll}
                        streetViewControl={props.opt_streetview}
                        fullscreenControl={props.opt_fullscreencontrol}
                        gestureHandling={"greedy"}
                        mapTypeId={google.maps.MapTypeId[props.defaultMapType as keyof typeof google.maps.MapTypeId] || google.maps.MapTypeId.ROADMAP}
                        mapTypeControl={props.opt_mapcontrol}
                        mapTypeControlOptions={{
                            position: google.maps.ControlPosition.TOP_LEFT
                        }}
                        tilt={parseInt(props.opt_tilt.replace("d", ""), 10)}
                        disableDefaultUI={true}
                    >
                        {hasBeenDragged && initialCenterRef.current && initialZoom !== null && mapSettled && props.opt_recenterbutton && (
                            <button
                                onClick={handleRecenter}
                                title="Recenter map"
                                aria-label="Recenter map"
                                type="button"
                                className="gm-control-active gm-recenter-control"
                            >
                                📍
                            </button>
                        )}
                        {undoStepCount > 0 && props.coordinatesStringAttrUpdate && props.opt_undobutton && (
                            <button
                                onClick={handleUndoLastShapeEdit}
                                title={`Undo beschikbaar: ${undoStepCount}`}
                                aria-label={`Undo beschikbaar: ${undoStepCount}`}
                                type="button"
                                className="gm-control-active gm-recenter-control gm-history-control"
                                style={{ top: 58 }}
                            >
                                <span className="gm-history-icon">↶</span>
                                <span className="gm-history-count">- {undoStepCount}</span>
                            </button>
                        )}
                        {redoStepCount > 0 && props.coordinatesStringAttrUpdate && props.opt_undobutton && (
                            <button
                                onClick={handleRedoLastShapeEdit}
                                title={`Redo beschikbaar: ${redoStepCount}`}
                                aria-label={`Redo beschikbaar: ${redoStepCount}`}
                                type="button"
                                className="gm-control-active gm-recenter-control gm-history-control"
                                style={{ top: 58, right: 52 }}
                            >
                                <span className="gm-history-icon">↷</span>
                                <span className="gm-history-count">+ {redoStepCount}</span>
                            </button>
                        )}
                        {state.showingInfoWindow && (
                            <InfoWindowComponent
                                onCloseClick={onInfoWindowClose}
                                name={state.infowindowObj.name}
                                position={state.infowindowObj.position}
                                infoWindowWidget={props.infoWindowWidget}
                                mxObject={state.infowindowObj.mxObject || {} as ObjectItem}
                            />
                        )}
                        {props.polygons?.map((polygon) => (
                            !polygon.isNew ? (
                                <Polygon
                                    isNew={false}
                                    key={"polygon_" + polygon.guid}
                                    ref={(instance) => {
                                        if (instance) {
                                            polygonInstancesRef.current[polygon.guid] = instance;
                                            const shapeKey = `polygon:${polygon.guid}`;
                                            if (!lastKnownShapeCoordinatesRef.current[shapeKey]) {
                                                const paths = instance.getPaths().getAt(0);
                                                lastKnownShapeCoordinatesRef.current[shapeKey] = paths?.getArray().toString() || "";
                                            }
                                        } else {
                                            delete polygonInstancesRef.current[polygon.guid];
                                        }
                                    }}
                                    name={polygon.name}
                                    center={polygon.center}
                                    clickable={!isShapeNonInteractive(polygon.mxObject)}
                                    onClick={isShapeNonInteractive(polygon.mxObject) ? undefined : (event: any) => mvcObjectClickHandler(event, polygon.name, polygon.center, polygon.mxObject)}
                                    onDragStart={() => handleShapeDragStart("polygon", polygon.guid)}
                                    onDragEnd={() => handleShapeDragEnd("polygon", polygon.guid, true)}
                                    onPolygonChange={(path: google.maps.MVCArray<google.maps.LatLng>) => {
                                        handleShapePathChange("polygon", polygon.guid, path, true);
                                    }}
                                    guid={polygon.guid}
                                    mxObject={polygon.mxObject}
                                    paths={polygon.paths}
                                    strokeColor={polygon.strokeColor}
                                    strokeOpacity={polygon.strokeOpacity}
                                    strokeWeight={polygon.strokeWeight}
                                    fillColor={polygon.fillColor}
                                    fillOpacity={polygon.fillOpacity}
                                    visible={polygon.visible}
                                    editable={polygon.editable}
                                    draggable={polygon.draggable}
                                    coordinatesStringAttrUpdate={props.coordinatesStringAttrUpdate}
                                />
                            ) : null
                        ))}
                        {props.polylines?.map((polyline) => (
                            !polyline.isNew ? (
                                <Polyline
                                    isNew={false}
                                    key={"polyline_" + polyline.guid}
                                    ref={(instance) => {
                                        if (instance) {
                                            polylineInstancesRef.current[polyline.guid] = instance;
                                            const shapeKey = `polyline:${polyline.guid}`;
                                            if (!lastKnownShapeCoordinatesRef.current[shapeKey]) {
                                                const path = instance.getPath();
                                                lastKnownShapeCoordinatesRef.current[shapeKey] = path?.getArray().toString() || "";
                                            }
                                        } else {
                                            delete polylineInstancesRef.current[polyline.guid];
                                        }
                                    }}
                                    name={polyline.name}
                                    icons={polyline.icons}
                                    center={polyline.center}
                                    clickable={!isShapeNonInteractive(polyline.mxObject)}
                                    onClick={isShapeNonInteractive(polyline.mxObject) ? undefined : (event: any) => mvcObjectClickHandler(event, polyline.name, event.latLng, polyline.mxObject)}
                                    onDragStart={() => handleShapeDragStart("polyline", polyline.guid)}
                                    onDragEnd={() => handleShapeDragEnd("polyline", polyline.guid, false)}
                                    onPolylineChange={(path: google.maps.MVCArray<google.maps.LatLng>) => {
                                        handleShapePathChange("polyline", polyline.guid, path, false);
                                    }}
                                    guid={polyline.guid}
                                    mxObject={polyline.mxObject}
                                    path={polyline.path}
                                    strokeColor={polyline.strokeColor}
                                    strokeWeight={polyline.strokeWeight}
                                    strokeOpacity={polyline.strokeOpacity}
                                    visible={polyline.visible}
                                    editable={polyline.editable}
                                    draggable={polyline.draggable}
                                    coordinatesStringAttrUpdate={props.coordinatesStringAttrUpdate}
                                />
                            ) : null
                        ))}
                </GoogleMap>
            ) : (
                <div className="spinner" />
            )}
        </>
    );
};

export default CustomMap;
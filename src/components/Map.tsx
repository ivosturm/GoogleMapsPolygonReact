import {  Map as GoogleMap, useApiIsLoaded, useMap } from '@vis.gl/react-google-maps';
import {useDrawingManager} from './DrawingManager';

import React, { createElement, Fragment, useEffect, /*useEffect,*/ useState } from "react";

import {ObjectItem, ListActionValue, EditableValue, ListWidgetValue} from "mendix";

import InfoWindowComponent from "./InfoWindow";
import { onPolyObjectChange, PositionProps,setCenterPolyobject,/*, setCenterPolyobject, updateCoordinatesAttribute */
updateCoordinatesAttribute} from "./PathUtils";
import { Polygon, PolygonProps } from "./Polygon";
import { Polyline, PolylineProps } from "./Polyline";
import { DefaultMapTypeEnum } from "typings/GoogleMapsPolygonProps";

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
    polygons?:PolygonProps[];
    polylines?:PolylineProps[];
    int_disableInfoWindow: boolean;
    int_onClick?: ListActionValue; 
    infoWindowWidget?: ListWidgetValue;
    overruleFitBoundsZoom: boolean;
    defaultMapType: DefaultMapTypeEnum;
    opt_drag: boolean;
    opt_mapcontrol: boolean;
    opt_scroll: boolean;
    opt_streetview: boolean;
    opt_zoomcontrol: boolean;
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
    const logNode = "Google Maps Polygon (React) widget: Map component ";

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

    useEffect(() => {
        if (isLoaded && map) {
            console.debug(logNode + "rerendering because map is loaded and polygons/polylines changed...");
            map.setCenter({ lat: props.defaultLat, lng: props.defaultLng });
            handleOnGoogleApiLoaded(map);
        }
    }, [isLoaded, map, props.polygons, props.polylines]);

    // fitbounds is an async function. The zoom can only be retrieved if this async function was finished, hence add a one time event that waits until map is finished zooming and the get the zoom level and store it in the state for later access
    useEffect(() => {
        if (map) {
            console.debug(logNode + "rerendering map because bounds changed...");
            map.fitBounds(state.bounds);
            google.maps.event.addListenerOnce(map, 'idle', () => {
                setState(prevState => ({ ...prevState, zoom: map.getZoom() || props.lowestZoom }));
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
        } 
        // either no objects at all, or one object without coordinates, zoom to default lat/lng
        else if (noOfObjects === 0 || (noOfObjects === 1 && 
                ((props.polylines && props.polylines.length === 1 && props.polylines[0].isNew) || ((props.polygons && props.polygons.length === 1 && props.polygons[0].isNew)))))
        {
            console.debug(logNode  + 'zoom: no coordinates found for any of the objects, zooming to default lat lng..');
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

    const onInfoWindowClose = () => {
        // Your logic for handling InfoWindow close
        setState(prevState => ({ ...prevState, showingInfoWindow: false }));
    };
    const onPolygonComplete = (polygon: google.maps.Polygon) => {
        console.log('onPolygonComplete called with polygon: ', polygon);
        const coordinates = (polygon.getPath().getArray().toString());
        updateCoordinatesAttribute(coordinates, props.coordinatesStringAttrUpdate);
        // Add polygon event listeners
        const gme = google.maps.event;
        polygon.getPaths().forEach((path) =>{
            gme.addListener(path, 'insert_at', () => {onPolyObjectChange(path, Array.isArray(polygon.getPaths) ? polygon.getPaths().getArray().join() : "", props.coordinatesStringAttrUpdate)});
            gme.addListener(path, 'set_at', () => {onPolyObjectChange(path, Array.isArray(polygon.getPaths) ? polygon.getPaths().getArray().join() : "", props.coordinatesStringAttrUpdate)});
            gme.addListener(path, 'remove_at', () => {onPolyObjectChange(path, Array.isArray(polygon.getPaths) ? polygon.getPaths().getArray().join(): "", props.coordinatesStringAttrUpdate)});
          });
    }
    const onPolylineComplete = (polyline: google.maps.Polyline) => {
        console.log('onPolylineComplete called with polyline: ', polyline);
        const coordinates = (polyline.getPath().getArray().toString());
        updateCoordinatesAttribute(coordinates, props.coordinatesStringAttrUpdate);
        // Add polygon event listeners
        const gme = google.maps.event;
        const path = polyline.getPath();

        gme.addListener(path, 'insert_at', () => {onPolyObjectChange(path, polyline.getPath().getArray().toString(), props.coordinatesStringAttrUpdate)});
        gme.addListener(path, 'set_at', () => {onPolyObjectChange(path, polyline.getPath().getArray().toString(), props.coordinatesStringAttrUpdate)});
        gme.addListener(path, 'remove_at', () => {onPolyObjectChange(path, polyline.getPath().getArray().toString(), props.coordinatesStringAttrUpdate)});
    }
    const mvcObjectClickHandler = (event: any, name: string, center?: PositionProps, mxObject?: ObjectItem) => {
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

    useDrawingManager(
        null,
        props.polygons,
        props.polylines,
        onPolygonComplete, 
        onPolylineComplete
    );

    return (
                <>
                    {isLoaded ? (
                        <GoogleMap
                        style={props.mapContainerStyle}
                        defaultCenter={Object.keys(state.bounds).length === 0 ? state.center : { lat: state.bounds.getCenter().lat(), lng: state.bounds.getCenter().lng() }}
                        defaultZoom={state.zoom}
                        zoomControl={props.opt_zoomcontrol}
                        zoomControlOptions={{
                            position: google.maps.ControlPosition.RIGHT_CENTER
                        }}
                        scrollwheel={props.opt_scroll}
                        streetViewControl={props.opt_streetview}
                        gestureHandling={"greedy"} 
                        mapTypeId={google.maps.MapTypeId[props.defaultMapType as keyof typeof google.maps.MapTypeId] || google.maps.MapTypeId.ROADMAP}
                        mapTypeControl={props.opt_mapcontrol}
                        mapTypeControlOptions={{
                            position: google.maps.ControlPosition.TOP_LEFT
                        }}
                        tilt={parseInt(props.opt_tilt.replace("d", ""), 10)}
                        disableDefaultUI={true}
                        // onLoad={(map: google.maps.Map) => handleOnGoogleApiLoaded(map)}
                    >
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
                                    name={polygon.name}
                                    center={polygon.center}
                                    onClick={(event: any) => mvcObjectClickHandler(event, polygon.name, polygon.center, polygon.mxObject)}
                                    onPolygonChange={(path: google.maps.MVCArray<google.maps.LatLng>) => {
                                        //console.debug(logNode + "polygon path changed: " + path.getArray().toString());
                                        onPolyObjectChange(path, Array.isArray(polygon.paths) ? polygon.paths.join() : "", props.coordinatesStringAttrUpdate)
                                    }}
                                    guid={polygon.guid}
                                    mxObject={polygon.mxObject}
                                    paths={polygon.paths}
                                    holes={polygon.holes}
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
                                name={polyline.name}
                                icons={polyline.icons}
                                center={polyline.center}
                                onClick={(event:any) => mvcObjectClickHandler(event, polyline.name, event.latLng,polyline.mxObject)}
                                onPolylineChange={(path: google.maps.MVCArray<google.maps.LatLng>) => {
                                    //console.debug(logNode + "polyline path changed: " + path.getArray().toString());
                                    onPolyObjectChange(path, polyline.path?.toString() || "", props.coordinatesStringAttrUpdate)
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
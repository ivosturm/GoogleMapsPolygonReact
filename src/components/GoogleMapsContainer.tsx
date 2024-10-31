import {createElement, useEffect}  from "react";

import {ObjectItem,EditableValue,ListValue, ListActionValue, ListAttributeValue,ValueStatus, ListWidgetValue} from "mendix";

import  { PolygonProps } from "./Polygon";
import { DefaultMapTypeEnum } from "typings/GoogleMapsPolygonProps";
import { createPathFromString, isAttributeEditable, PathArrayProps, setLineStyleOptions } from "./PathUtils";
import { PolylineProps } from "./Polyline";
import CustomMap from "./Map";

import { APIProvider } from '@vis.gl/react-google-maps';

type DataSource = "static" | "context" | "XPath" | "microflow";
const containerStyle = {
    width: "800px",
    height: "600px"
};

const libraries  = "drawing";

export interface GoogleMapsWidgetProps {
    mapWidth: number;
    mapHeight: number;
    polyObjects?: ListValue;
    coordinatesStringAttr: ListAttributeValue<string>;
    coordinatesStringAttrUpdate?: EditableValue<string>;
    draggableInEditMode: boolean;
    holeCoordinatesStringAttr?: ListAttributeValue<string>;
    reverseCoordinatesAttr?: ListAttributeValue<boolean>;
    colorAttr?: ListAttributeValue<string>;
    strokeWeightAttr?: ListAttributeValue<Big>;
    opacityAttr?: ListAttributeValue<Big>;
    objectTypeAttr: ListAttributeValue<string>;
    lineTypeAttr?: ListAttributeValue<string>;
    defaultMapType: DefaultMapTypeEnum;
    apiKey: string;
    defaultLat: string;
    defaultLng: string;
    dynamicDefaultLocation: boolean;
    defaultLocation?: ListValue;
    defaultLatAttr?: ListAttributeValue<Big | string>;
    defaultLngAttr?: ListAttributeValue<Big | string>;
    dataSource: DataSource;
    disableInfoWindow: boolean;
    int_onClick?: ListActionValue;
    infoWindowWidget?: ListWidgetValue;
    overruleFitBoundsZoom: boolean;
    lowestZoom: number;
    opt_drag: boolean;
    opt_mapcontrol: boolean;
    opt_scroll: boolean;
    opt_streetview: boolean;
    opt_zoomcontrol: boolean;
    opt_tilt: string;
    styleArray: string;
}

export interface GoogleMapsContainerState {
    map: google.maps.Map;
    isLoaded: boolean;     
    editable: boolean;
}

interface GoogleMapsContainerProps extends GoogleMapsWidgetProps {
    locations:Location[];
    polygons:PolygonProps[];
    polylines:PolylineProps[];
}


export const GoogleMapsContainer: React.FC<GoogleMapsContainerProps> = (props) => {

    const logNode = "Google Maps Polygon (React) widget: ";
    let mxObjects: ObjectItem[] = [];
    
    useEffect(() => {
        console.debug(logNode + 'componentDidMount:', props);
    }, []);
    // Initialize map dimensions
    if (props.mapWidth === 10000) {
        containerStyle.width = "100%";
    } else {
        containerStyle.width = props.mapWidth + "px";
    }
    if (props.mapHeight === 10000) {
        containerStyle.height = "100vh";
    } else {
        containerStyle.height = props.mapHeight + "px";
    }
    const datasource = props.polyObjects;
    if (!datasource || datasource.status !== ValueStatus.Available || !datasource.items) {
        return null;
    }

    // set default location based on static values
    let defaultLat = Number(props.defaultLat),
    defaultLng = Number(props.defaultLng);

    // and if dynamic default location is configured, overrule static value
    if (props.dynamicDefaultLocation){
        const defaultLocationDataSource = props.defaultLocation;
        if (!defaultLocationDataSource || defaultLocationDataSource.status !== ValueStatus.Available || !defaultLocationDataSource.items) {
            return null;
        } else {
            defaultLocationDataSource.items.map(defaultLocationMxObject => {
                if (props.defaultLatAttr && props.defaultLngAttr){
                    const lat = Number(props.defaultLatAttr.get(defaultLocationMxObject).value),
                    lng = Number(props.defaultLngAttr.get(defaultLocationMxObject).value);
                    console.debug(logNode + "dynamic default location loaded with lat: " + lat + " / lng:  " + lng);
                    defaultLat = lat;
                    defaultLng = lng;
                }
            })
        }
    }

    let coordinatesString : string = "",
    holeCoordinatesString : string = "",
    reverse : boolean = false,
    draggable: boolean = false,
    isNew : boolean = false,
    strokeColor : string = "",
    strokeOpacity : number = 1,
    strokeWeight : number = 1,
    name : string = '',
    type : string = 'Polygon',
    path : PathArrayProps;

    // create polygons / polylines 
    // showing of infowindow is handled via state, if shown, don't recreate already existing objects
    if (datasource && datasource.items){
        let editable = false;
        if (props.coordinatesStringAttrUpdate){
            if (isAttributeEditable("coordinatesStringAttrUpdate",props.coordinatesStringAttrUpdate)){
                editable = true;
            }
        }      
        mxObjects = datasource.items;
        mxObjects.map(mxObject => {
            // get all generic attribute values relevant for both Polygon and Polyline
            // due to bug in Mendix Pluggable Widget API, readOnly field is always true for datasource objects, hence use attribute
            /*
            draggable = /*!props.coordinatesStringAttr(mxObject).readOnly;
            editable = !props.coordinatesStringAttr(mxObject).readOnly;
            */
            if (editable && props.draggableInEditMode){
                draggable = true;
            }
            coordinatesString = String(props.coordinatesStringAttr.get(mxObject).value);
            
            if (!coordinatesString){
                isNew = true;
            }
            props.reverseCoordinatesAttr ? reverse = Boolean(props.reverseCoordinatesAttr.get(mxObject).value) : false;  
            if (props.colorAttr){
                strokeColor = String(props.colorAttr.get(mxObject).value);
            }
            
            props.opacityAttr ? strokeOpacity = Number(props.opacityAttr.get(mxObject).value) : 0; 
            props.strokeWeightAttr ? strokeWeight = Number(props.strokeWeightAttr.get(mxObject).value) : 2;
            // transform the coordinates string to a path object
            path = createPathFromString(coordinatesString,reverse,false);
            type = String(props.objectTypeAttr.get(mxObject).value);
            let indexObj = -1;

            if (type === 'Polygon'){
                
                let polygonObj = {
                    guid : mxObject.id,
                    isNew,
                    name,
                    mxObject,
                    paths : path.paths, 
                    visible : true,
                    draggable,
                    editable,
                    strokeColor,
                    strokeOpacity,
                    strokeWeight,
                    fillColor : strokeColor,
                    fillOpacity : strokeOpacity      
                } as PolygonProps;

                let holePath;
                if (props.holeCoordinatesStringAttr){
                    holeCoordinatesString = String(props.holeCoordinatesStringAttr.get(mxObject).value);            
                    if (holeCoordinatesString){
                        // hole / inner bounds needs to be wound in opposite order of outer bounds
                        holePath = createPathFromString(holeCoordinatesString,reverse,true);               
                    }
                }
                if (holePath){
                    polygonObj.holes = holePath.paths;
                }
                indexObj = -1;
                props.polygons.filter(function(polygon,index){
                    if (polygon.guid == polygonObj.guid){
                        indexObj = index;
                        return;
                    }
                });
                // object exists -> remove old by index and add new
                if (indexObj > -1) {
                    props.polygons.splice(indexObj,1);  
                }
                props.polygons.push(polygonObj);
                
            } else if (type === 'Polyline'){
                let lineType = "Normal";
                if (props.lineTypeAttr){
                    lineType = String(props.lineTypeAttr.get(mxObject).value);
                }
                let polylineObj = {
                    guid : mxObject.id,
                    isNew,
                    name,
                    mxObject,
                    path : path.paths, 
                    lineType,
                    visible : true,
                    draggable,
                    editable,               
                    strokeColor,
                    strokeOpacity,
                    strokeWeight
                    
                } as PolylineProps;

                if (lineType === "Dotted" || lineType === "Dashed") {
                    // set the stying options correctly for a dotted / dashed line
                    setLineStyleOptions(lineType, polylineObj);
                }
                // reset index as it could have been updated from other object
                indexObj = -1;
                props.polylines.filter(function(polyline,index){
                    if (polyline.guid == polylineObj.guid){
                        indexObj = index;
                        return;
                    }
                });
                // object exists -> remove old by index and add new
                if (indexObj > -1) {
                    props.polylines.splice(indexObj,1);  
                }
                props.polylines.push(polylineObj);
            }
        })
    }
    return (
        
        <div style={{ height: containerStyle.height, width: containerStyle.width }} className={"googlemaps-polygon"}>
            <APIProvider
                // 5-5-2024 Added async part. See: https://github.com/JustFly1984/react-google-maps-api/issues/3334 
                // 24-10-2024: Removed again since moved to new vis.gl/react-google-maps package
                apiKey={props.apiKey /* + "&loading=async"*/}
                libraries={[libraries]}
            >
                <CustomMap
                    mapContainerStyle={containerStyle}
                    defaultLat={defaultLat}
                    defaultLng={defaultLng}
                    lowestZoom={props.lowestZoom}
                    coordinatesStringAttrUpdate={props.coordinatesStringAttrUpdate}
                    polygons={props.polygons}
                    polylines={props.polylines}
                    int_onClick={props.int_onClick}
                    int_disableInfoWindow={props.disableInfoWindow}
                    infoWindowWidget={props.infoWindowWidget}
                    overruleFitBoundsZoom={props.overruleFitBoundsZoom}
                    defaultMapType={props.defaultMapType}
                    opt_drag={props.opt_drag}
                    opt_mapcontrol={props.opt_mapcontrol}
                    opt_scroll={props.opt_scroll}
                    opt_streetview={props.opt_streetview}
                    opt_tilt={props.opt_tilt}
                    opt_zoomcontrol={props.opt_zoomcontrol}
                    styleArray={props.styleArray}
                />
            </APIProvider>
        </div>      
    ); 
}


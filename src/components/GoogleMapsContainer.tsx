import {createElement, useEffect, Fragment}  from "react";

import {ObjectItem,EditableValue,ListValue, ListActionValue, ListAttributeValue,ValueStatus, ListWidgetValue} from "mendix";
import { Big } from "big.js";

import  { PolygonProps } from "./Polygon";
import { DefaultMapTypeEnum } from "typings/GoogleMapsPolygonProps";
import { createHolePathsFromString, createPathFromString, isAttributeEditable, PathArrayProps, setLineStyleOptions, showFriendlyErrorPopup, updateAreaAttributeFromRings } from "./PathUtils";
import { PolylineProps } from "./Polyline";
import CustomMap from "./Map";

import { updateCoordinatesAttribute} from "./PathUtils";

import { APIProvider } from '@vis.gl/react-google-maps';

import TerraDrawLayer from './TerraDrawLayer';

import DrawingControls from "./DrawingControls";

import { TerraDraw } from "terra-draw";

import {Position} from 'geojson';
import { TerraDrawModeId } from "./TerraDrawConfig";
import { HexColorStyling } from "terra-draw/dist/common";

const libraries = ["geometry"];

type DataSource = "static" | "context" | "XPath" | "microflow";
const containerStyle = {
    width: "800px",
    height: "600px"
};

export const logNode = "Google Maps Polygon widget: ";
const invalidCoordinatePopupShownForGuid = new Set<string>();
const invalidHolePopupShownForGuid = new Set<string>();

export interface GoogleMapsWidgetProps {
    mapWidth: number;
    mapHeight: number;
    polyObjects?: ListValue;
    coordinatesStringAttr: ListAttributeValue<string>;
    coordinatesStringAttrUpdate?: EditableValue<string>;
    areaAttrUpdate?: EditableValue<Big>;
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
    opt_recenterbutton: boolean;
    opt_scroll: boolean;
    opt_streetview: boolean;
    opt_undobutton: boolean;
    opt_zoomcontrol: boolean;
    opt_fullscreencontrol: boolean;
    opt_tilt: string;
    styleArray: string;
}

interface GoogleMapsContainerProps extends GoogleMapsWidgetProps {
    polygons:PolygonProps[];
    polylines:PolylineProps[];
}

const onPolyObjectComplete = (coordinatesArray: Position[] | Position[][], draw: TerraDraw,props: GoogleMapsContainerProps, drawMode: TerraDrawModeId) => {
    console.log(logNode + 'onPolyObjectComplete for ' + drawMode + ' called with coordinatesArray: ', coordinatesArray);

    // coordinatesArray is Position[][][] - array of rings, each ring is array of [lng, lat] pairs
    // Take the first ring (outer boundary)
    const outerRing = (coordinatesArray as Position[][])[0] as Position[];
    let coordinates: string = "";

    if (drawMode === "linestring") {
        // For linestring, coordinatesArray is Position[][] - array of [lng, lat] pairs
        const lineCoordinates = (coordinatesArray as Position[]) as Position[];
        coordinates = lineCoordinates.map(coord => `(${coord[1]},${coord[0]})`).join(',');
        console.debug(logNode + "Updating coordinates attribute for polyline with value:", coordinates);
        updateCoordinatesAttribute(coordinates, props.coordinatesStringAttrUpdate);
        props.polylines && props.polylines.length > 0 ? props.polylines[0].isNew = false : null;

    } else if (drawMode === "polygon") {
        coordinates = outerRing.map(coord => `(${coord[1]},${coord[0]})`).join(',');
        updateCoordinatesAttribute(coordinates, props.coordinatesStringAttrUpdate);
        const outerRingAsLatLng = outerRing.map(coord => ({ lat: coord[1], lng: coord[0] }));
        updateAreaAttributeFromRings([outerRingAsLatLng], props.areaAttrUpdate);
        props.polygons && props.polygons.length > 0 ? props.polygons[0].isNew = false : null;
    }
    
    console.debug(logNode + "Updating coordinates attribute with value:", coordinates);
    draw.setMode('static');
}

export const GoogleMapsContainer: React.FC<GoogleMapsContainerProps> = (props) => {

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
    const isLoadingData = !datasource || datasource.status !== ValueStatus.Available || !datasource.items;

    // set default location based on static values
    let defaultLat = Number(props.defaultLat),
    defaultLng = Number(props.defaultLng);

    // and if dynamic default location is configured, overrule static value
    if (props.dynamicDefaultLocation){
        const defaultLocationDataSource = props.defaultLocation;
        if (defaultLocationDataSource && defaultLocationDataSource.status === ValueStatus.Available && defaultLocationDataSource.items) {
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
        const isSingleEditMode = editable && datasource.items.length === 1;
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

            const hasNonEmptyCoordinates = typeof coordinatesString === "string" && coordinatesString.trim().length > 0;
            const hasValidParsedPath = Array.isArray(path.paths) && path.paths.length > 0;
            const isInvalidNonEmptyCoordinates = hasNonEmptyCoordinates && !hasValidParsedPath;
            const guid = String(mxObject.id);

            if (isSingleEditMode && isInvalidNonEmptyCoordinates && !invalidCoordinatePopupShownForGuid.has(guid)) {
                const logMessage =
                    logNode +
                    "Invalid coordinate string for object " +
                    guid +
                    ". Expected format like '(lat,lng),(lat,lng),...'. Received: " +
                    coordinatesString;
                console.error(logMessage);

                showFriendlyErrorPopup(
                    "The coordinates for this object are not in a valid format. Please check the value and use, for example: (52.37,4.89),(52.38,4.90),(52.36,4.91)."
                );
                invalidCoordinatePopupShownForGuid.add(guid);
            }

            if (!isInvalidNonEmptyCoordinates && invalidCoordinatePopupShownForGuid.has(guid)) {
                invalidCoordinatePopupShownForGuid.delete(guid);
            }

            const objectTypeRaw = String(props.objectTypeAttr.get(mxObject).value || "");
            const objectType = objectTypeRaw.trim().toLowerCase();
            let indexObj = -1;

            if (objectType === 'polygon'){
                
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

                let holePaths;
                if (props.holeCoordinatesStringAttr){
                    const holeValue = props.holeCoordinatesStringAttr.get(mxObject).value;
                    holeCoordinatesString = typeof holeValue === "string" ? holeValue : "";
                    if (holeCoordinatesString.trim()) {
                        holePaths = createHolePathsFromString(holeCoordinatesString, reverse);

                        const hasValidHolePath = Array.isArray(holePaths) && holePaths.length > 0;
                        if (isSingleEditMode && !hasValidHolePath && !invalidHolePopupShownForGuid.has(guid)) {
                            const holeLogMessage =
                                logNode +
                                "Invalid hole coordinate string for object " +
                                guid +
                                ". Expected one or more valid hole rings. Received: " +
                                holeCoordinatesString;
                            console.error(holeLogMessage);

                            showFriendlyErrorPopup(
                                "De hole-coordinaten voor dit object hebben geen geldig formaat. Controleer de waarde en gebruik bijvoorbeeld meerdere punten per ring, gescheiden zoals in de documentatie."
                            );
                            invalidHolePopupShownForGuid.add(guid);
                        }

                        if (hasValidHolePath && invalidHolePopupShownForGuid.has(guid)) {
                            invalidHolePopupShownForGuid.delete(guid);
                        }
                    } else if (invalidHolePopupShownForGuid.has(guid)) {
                        invalidHolePopupShownForGuid.delete(guid);
                    }
                }
                if (holePaths && holePaths.length > 0){
                    polygonObj.paths = [path.paths, ...holePaths] as any;
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
                
            } else if (objectType === 'polyline'){
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
        const singleItemEditableMode = 
            (props.polylines && props.polylines.length === 1 && props.polylines[0].isNew) ||
            (props.polygons && props.polygons.length === 1 && props.polygons[0].isNew);

        let defaultEditMode: TerraDrawModeId = "static";
        let defaultEditColor: HexColorStyling = "#FF0000";
        let isEditable = false;

        if (props.polygons && props.polygons.length === 1 && props.polygons[0].isNew) {
            defaultEditMode = "polygon";
            defaultEditColor = (props.polygons[0].strokeColor || "#FF0000") as HexColorStyling;
            isEditable = !props.coordinatesStringAttrUpdate?.readOnly;
        } else if (props.polylines && props.polylines.length === 1 && props.polylines[0].isNew) {
            defaultEditMode = "linestring";
            defaultEditColor = (props.polylines[0].strokeColor || "#FF0000") as HexColorStyling;
            isEditable = !props.coordinatesStringAttrUpdate?.readOnly;
        }
        
        console.debug(logNode + "edit mode options: ", {
            singleItemEditableMode,
            defaultEditColor,
            defaultEditMode,
            isEditable
        });    return (
        
        <div style={{ height: containerStyle.height, width: containerStyle.width }} className={"googlemaps-polygon"}>
            {isLoadingData && (
                <div className="gm-loading-box gm-loading-box-data">
                    Loading data...
                </div>
            )}
            <APIProvider
                // 5-5-2024 Added async part. See: https://github.com/JustFly1984/react-google-maps-api/issues/3334 
                // 24-10-2024: Removed again since moved to new vis.gl/react-google-maps package
                apiKey={props.apiKey /* + "&loading=async"*/}
                libraries={libraries}
            >
                <TerraDrawLayer 
                    onPolyObjectComplete={(coordinatesArray, draw) => onPolyObjectComplete(coordinatesArray, draw, props, defaultEditMode)}
                    color={defaultEditColor} >
                    {draw => (
                        <>
                            <CustomMap
                                mapContainerStyle={containerStyle}
                                defaultLat={defaultLat}
                                defaultLng={defaultLng}
                                lowestZoom={props.lowestZoom}
                                coordinatesStringAttrUpdate={props.coordinatesStringAttrUpdate}
                                areaAttrUpdate={props.areaAttrUpdate}
                                polygons={props.polygons}
                                polylines={props.polylines}
                                int_onClick={props.int_onClick}
                                int_disableInfoWindow={props.disableInfoWindow}
                                infoWindowWidget={props.infoWindowWidget}
                                overruleFitBoundsZoom={props.overruleFitBoundsZoom}
                                defaultMapType={props.defaultMapType}
                                opt_drag={props.opt_drag}
                                opt_mapcontrol={props.opt_mapcontrol}
                                opt_recenterbutton={props.opt_recenterbutton}
                                opt_scroll={props.opt_scroll}
                                opt_streetview={props.opt_streetview}
                                opt_undobutton={props.opt_undobutton}
                                opt_tilt={props.opt_tilt}
                                opt_zoomcontrol={props.opt_zoomcontrol}
                                opt_fullscreencontrol={props.opt_fullscreencontrol}
                                styleArray={props.styleArray}
                            />
                            <DrawingControls 
                                draw={draw} 
                                defaultMode={defaultEditMode}
                                editable={isEditable && singleItemEditableMode}
                            />
                        </>
                    )}
                </TerraDrawLayer>
            </APIProvider>
        </div>      
    ); 
}


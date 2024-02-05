import {Component, createElement}  from "react";

import {ObjectItem,EditableValue,ListValue, ListActionValue, ListAttributeValue,ValueStatus, ListWidgetValue} from "mendix";

import  { PolygonProps } from "./Polygon";
import { DefaultMapTypeEnum } from "typings/GoogleMapsPolygonProps";
import { createPathFromString, isAttributeEditable, PathArrayProps, setLineStyleOptions } from "./PathUtils";
import { PolylineProps } from "./Polyline";
import { Map } from "./Map";

import { LoadScriptComponent } from "./LoadScriptComponent";

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


export default class GoogleMapsContainer extends Component<GoogleMapsContainerProps,GoogleMapsContainerState> {
    mxObjects: ObjectItem[];
    logNode: string;
    constructor(props: GoogleMapsContainerProps) {
        super(props);
        this.state = {
            map: {} as google.maps.Map,
            isLoaded: false,
            editable: false
        }; 
        this.logNode = "Google Maps Polygon (React) widget: ";

    }
    componentDidMount () {
        console.debug(this.logNode + 'componentDidMount:', this.props);        
    }
    shouldComponentUpdate(nextProps:GoogleMapsContainerProps,nextState:GoogleMapsContainerState) {
        // no changes, no reload!G
        if (nextState == this.state && nextProps == this.props){
            console.debug(this.logNode + 'state nor props changed!');
            return false;
        } // props changes, reload! 
        else if (nextState == this.state && nextProps != this.props){
            if (this.props.polyObjects?.status == 'loading' && nextProps.polyObjects?.status == 'available'){
                console.debug(this.logNode + 'props changed, Mendix objects available!');
                return true;
            } else if (this.props.coordinatesStringAttrUpdate != nextProps.coordinatesStringAttrUpdate || this.props.coordinatesStringAttr != nextProps.coordinatesStringAttr ){
                console.debug(this.logNode + 'props changed, object coordinates updated via drawing!');
                return false;
            } else {
                console.debug(this.logNode + 'props changed');
                return true;
            }         
        } // state changed, don't reload if only map was added to state! 
        else if (nextState != this.state && nextProps == this.props){
            if (!this.state.isLoaded && nextState.isLoaded){
                console.debug(this.logNode + 'state isLoaded changed!');
                return false;
            } else {
                console.debug('state changed!');
                return true;
            }           
        } else if (nextState != this.state && nextProps != this.props){
            console.debug(this.logNode + 'state and props changed!');
            return true;
        } // shouldn't occur
        else {
            return false;
        }           
    }
    render() { 
        // Initialize map dimensions
        if (this.props.mapWidth === 10000) {
            containerStyle.width = "100%";
        } else {
            containerStyle.width = this.props.mapWidth + "px";
        }
        if (this.props.mapHeight === 10000) {
            containerStyle.height = "100vh";
        } else {
            containerStyle.height = this.props.mapHeight + "px";
        }
        const datasource = this.props.polyObjects;
        if (!datasource || datasource.status !== ValueStatus.Available || !datasource.items) {
            return null;
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
            if (this.props.coordinatesStringAttrUpdate){
                if (isAttributeEditable("coordinatesStringAttrUpdate",this.props.coordinatesStringAttrUpdate)){
                    editable = true;
                }
            }      
            this.mxObjects = datasource.items;
            this.mxObjects.map(mxObject => {
                // get all generic attribute values relevant for both Polygon and Polyline
                // due to bug in Mendix Pluggable Widget API, readOnly field is always true for datasource objects, hence use attribute
                /*
                draggable = /*!this.props.coordinatesStringAttr(mxObject).readOnly;
                editable = !this.props.coordinatesStringAttr(mxObject).readOnly;
                */
                if (editable && this.props.draggableInEditMode){
                    draggable = true;
                }
                coordinatesString = String(this.props.coordinatesStringAttr.get(mxObject).value);
                
                if (!coordinatesString){
                    isNew = true;
                }
                this.props.reverseCoordinatesAttr ? reverse = Boolean(this.props.reverseCoordinatesAttr.get(mxObject).value) : false;  
                if (this.props.colorAttr){
                    strokeColor = String(this.props.colorAttr.get(mxObject).value);
                }
                
                this.props.opacityAttr ? strokeOpacity = Number(this.props.opacityAttr.get(mxObject).value) : 0; 
                this.props.strokeWeightAttr ? strokeWeight = Number(this.props.strokeWeightAttr.get(mxObject).value) : 2;
                // transform the coordinates string to a path object
                path = createPathFromString(coordinatesString,reverse,false);
                type = String(this.props.objectTypeAttr.get(mxObject).value);
                let indexObj = -1;

                if (type === 'Polygon'){
                    
                    let polygonObj = {
                        guid : mxObject.id,
                        isNew: isNew,
                        name : name,
                        mxObject : mxObject,
                        paths : path.paths, 
                        visible : true,
                        draggable : draggable,
                        editable : editable,
                        style : {
                            strokeColor : strokeColor,
                            strokeOpacity : strokeOpacity,
                            strokeWeight : strokeWeight,
                            fillColor : strokeColor,
                            fillOpacity : strokeOpacity
                        }
                    } as PolygonProps;

                    let holePath;
                    if (this.props.holeCoordinatesStringAttr){
                        holeCoordinatesString = String(this.props.holeCoordinatesStringAttr.get(mxObject).value);            
                        if (holeCoordinatesString){
                            // hole / inner bounds needs to be wound in opposite order of outer bounds
                            holePath = createPathFromString(holeCoordinatesString,reverse,true);               
                        }
                    }
                    if (holePath){
                        polygonObj.holes = holePath.paths;
                    }
                    indexObj = -1;
                    this.props.polygons.filter(function(polygon,index){
                        if (polygon.guid == polygonObj.guid){
                            indexObj = index;
                            return;
                        }
                    });
                    // object exists -> remove old by index and add new
                    if (indexObj > -1) {
                        this.props.polygons.splice(indexObj,1);  
                    }
                    this.props.polygons.push(polygonObj);
                    
                } else if (type === 'Polyline'){
                    let lineType = "Normal";
                    if (this.props.lineTypeAttr){
                        lineType = String(this.props.lineTypeAttr.get(mxObject).value);
                    }
                    let polylineObj = {
                        guid : mxObject.id,
                        isNew: isNew,
                        name : name,
                        mxObject : mxObject,
                        paths : path.paths, 
                        lineType : lineType,
                        visible : true,
                        draggable : draggable,
                        editable : editable,
                        style : {
                            strokeColor : strokeColor,
                            strokeOpacity : strokeOpacity,
                            strokeWeight : strokeWeight
                        }
                    } as PolylineProps;

                    if (lineType === "Dotted" || lineType === "Dashed") {
                        // set the stying options correctly for a dotted / dashed line
                        setLineStyleOptions(lineType, polylineObj);
                    }
                    // reset index as it could have been updated from other object
                    indexObj = -1;
                    this.props.polylines.filter(function(polyline,index){
                        if (polyline.guid == polylineObj.guid){
                            indexObj = index;
                            return;
                        }
                    });
                    // object exists -> remove old by index and add new
                    if (indexObj > -1) {
                        this.props.polylines.splice(indexObj,1);  
                    }
                    this.props.polylines.push(polylineObj);
                }

            })
        }

        return (
            <div style={{ height: containerStyle.height, width: containerStyle.width }} className={"googlemaps-polygon"}>
                <LoadScriptComponent
                    apiKey={this.props.apiKey}
                    libraries={[libraries]}
                >
                    <Map
                        mapContainerStyle={containerStyle}
                        defaultLat={this.props.defaultLat}
                        defaultLng={this.props.defaultLng}
                        lowestZoom={this.props.lowestZoom}
                        coordinatesStringAttrUpdate={this.props.coordinatesStringAttrUpdate}
                        polygons={this.props.polygons}
                        polylines={this.props.polylines}
                        int_onClick={this.props.int_onClick}
                        int_disableInfoWindow={this.props.disableInfoWindow}
                        infoWindowWidget={this.props.infoWindowWidget}
                        overruleFitBoundsZoom={this.props.overruleFitBoundsZoom}
                        defaultMapType={this.props.defaultMapType}
                        opt_drag={this.props.opt_drag}
                        opt_mapcontrol={this.props.opt_mapcontrol}
                        opt_scroll={this.props.opt_scroll}
                        opt_streetview={this.props.opt_streetview}
                        opt_tilt={this.props.opt_tilt}
                        opt_zoomcontrol={this.props.opt_zoomcontrol}
                        styleArray={this.props.styleArray}
                    />
                </LoadScriptComponent>
            </div>      
        ); 
    }
}


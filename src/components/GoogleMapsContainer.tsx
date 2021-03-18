import React, {Component}  from "react";

import {ObjectItem,EditableValue,ListValue, ListActionValue, ListAttributeValue,ValueStatus} from "mendix";

import {
    DrawingManager,
    GoogleMap,
    LoadScriptNext

} from "@react-google-maps/api";

import PolygonComponent, { PolygonProps } from "./Polygon";
import { DefaultMapTypeEnum } from "typings/GoogleMapsPolygonProps";
import InfoWindowComponent from "./InfoWindow";
import { createPathFromString, isAttributeEditable, PathArrayProps, PositionProps, setCenterPolyobject, setLineStyleOptions, updateCoordinatesAttribute } from "./PathUtils";
import PolylineComponent, { PolylineProps } from "./Polyline";
//import LoadScriptComponent from "./LoadScriptComponent";

type DataSource = "static" | "context" | "XPath" | "microflow";

export interface GoogleMapsWidgetProps {
    polyObjects?: ListValue;
    coordinatesStringAttr: ListAttributeValue<string>;
    coordinatesStringAttrUpdate?: EditableValue<string>;
    draggableInEditMode: boolean;
    holeCoordinatesStringAttr?: ListAttributeValue<string>;
    reverseCoordinatesAttr?: ListAttributeValue<boolean>;
    colorAttr: ListAttributeValue<string>;
    strokeWeightAttr?: ListAttributeValue<BigJs.Big>;
    opacityAttr?: ListAttributeValue<BigJs.Big>;
    infoWindowAttr: ListAttributeValue<string>;
    objectTypeAttr: ListAttributeValue<string>;
    lineTypeAttr?: ListAttributeValue<string>;
    defaultMapType: DefaultMapTypeEnum;
    apiKey: string;
    defaultLat: string;
    defaultLng: string;
    dataSource: DataSource;
    int_disableInfoWindow: boolean;
    int_infoWindowNameLabel: string;
    int_onClick?: ListActionValue;
    int_onClickButtonClass: string;
    int_onClickButtonLabel: string;
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

export interface MapState {
    center:{
        lat:number;
        lng:number;
    } 
    isLoaded: boolean;  
    zoom:number; 
    bounds: google.maps.LatLngBounds;
    showingInfoWindow:boolean;
    infowindowObj: InfoWindowProps;
    map: google.maps.Map;
    editable: boolean;
}

interface GoogleMapsContainerProps extends GoogleMapsWidgetProps {
    locations:Location[];
    polygons:PolygonProps[];
    polylines:PolylineProps[];
}

export interface InfoWindowProps {
    name: string;
    position?: {
        lat: number,
        lng:number
    };
   // anchor: google.maps.MVCObject,
    mxObject?: ObjectItem;
}

export default class GoogleMapsContainer extends Component<GoogleMapsContainerProps,MapState> {
    mxObjects: ObjectItem[];
    drawingMode: google.maps.drawing.OverlayType;
    logNode: string;
    constructor(props: GoogleMapsContainerProps) {
        super(props);
        this.state = {
            // this is where the center of map is going to be
            center : {
                lat: Number(this.props.defaultLat), 
                lng: Number(this.props.defaultLng)
            },
            bounds: {} as google.maps.LatLngBounds,
            // this is how much you want to zoom in
            zoom : Number(this.props.lowestZoom),
        
            showingInfoWindow: false,
            infowindowObj: {} as InfoWindowProps,
            map: {} as google.maps.Map,
            isLoaded: false,
            editable: false
        }; 
        this.logNode = "GoogleMapsPolygon widget: ";
        this.handleOnGoogleApiLoaded = this.handleOnGoogleApiLoaded.bind(this);
        this.createMapOptions = this.createMapOptions.bind(this);
        this.mvcObjectClickHandler = this.mvcObjectClickHandler.bind(this);
        this.onDMLoad = this.onDMLoad.bind(this); 
        this.onPolygonComplete = this.onPolygonComplete.bind(this);   
        this.onPolylineComplete = this.onPolylineComplete.bind(this);    
    }
    componentDidMount () {
        console.debug('componentDidMount:', this.props);        
    }
    shouldComponentUpdate(nextProps:GoogleMapsContainerProps,nextState:MapState) {
        // no changes, no reload!
        if (nextState == this.state && nextProps == this.props){
            console.debug('state nor props changed!');
            return false;
        } // props changes, reload! 
        else if (nextState == this.state && nextProps != this.props){
            if (this.props.polyObjects?.status == 'loading' && nextProps.polyObjects?.status == 'available'){
                console.debug('props changed, Mendix objects available!');
            } else {
                console.debug('props changed');
            }         
            return true;
        } // state changed, don't reload if only map was added to state! 
        else if (nextState != this.state && nextProps == this.props){
            if (!this.state.isLoaded && nextState.isLoaded){
                console.debug('state isLoaded changed!');
                return false;
            } else {
                console.debug('state changed!');
                return true;
            }           
        } else if (nextState != this.state && nextProps != this.props){
            console.debug('state and props changed!');
            return true;
        } // shouldn't occur
        else {
            return false;
        }
              
    }
    mvcObjectClickHandler(event:any, name: string, center?: PositionProps,mxObject?: ObjectItem){
        // trigger infowindow functionality if enabled in interaction settings
        if (!this.props.int_disableInfoWindow && event && center){
            this.setState({
                showingInfoWindow : true,
                infowindowObj : {
                    name: name,
                    position:center,
                    mxObject: mxObject,

                }
            })
        } 
        // else trigger action call directly
        else if (mxObject && this.props.int_onClick){
            this.props.int_onClick(mxObject).execute();
        }
    }
    onInfoWindowClose = () =>
        this.setState({
        showingInfoWindow: false,
        infowindowObj: {} as InfoWindowProps
        });
    onDMLoad(drawingManager: google.maps.drawing.DrawingManager) {
        // generic options
        let drawingOptions = {
            drawingControl : true,
            drawingControlOptions : {
                drawingModes : [google.maps.drawing.OverlayType.POLYGON,google.maps.drawing.OverlayType.POLYLINE],
                position : google.maps.ControlPosition.TOP_CENTER
            }
        }
        // only add drawing manager if a poly object with empty coordinatesstring is fed
        if (this.props.polygons.length === 1 && this.props.polygons[0].isNew){
            // add polygon options 
            let polygonDrawingOpts = {
                drawingControl : drawingOptions.drawingControl,
                drawingControlOptions : {
                    drawingModes : [google.maps.drawing.OverlayType.POLYGON],
                    position : drawingOptions.drawingControlOptions.position
                },
                polygonOptions : {
                    strokeColor : this.props.polygons[0].style.strokeColor,
                    strokeOpacity : this.props.polygons[0].style.strokeOpacity,
                    strokeWeight : this.props.polygons[0].style.strokeWeight,
                    fillColor : this.props.polygons[0].style.fillColor,
                    fillOpacity : this.props.polygons[0].style.fillOpacity
                }
            }
            drawingManager.setDrawingMode(polygonDrawingOpts.drawingControlOptions.drawingModes[0])
            drawingManager.setOptions(polygonDrawingOpts);
        } else if (this.props.polylines.length === 1 && this.props.polylines[0].isNew){
            // add polyline options
            let polylineDrawingOpts = {
                drawingControl : drawingOptions.drawingControl,
                drawingControlOptions : {
                    drawingModes : [google.maps.drawing.OverlayType.POLYLINE],
                    position : drawingOptions.drawingControlOptions.position
                },
                polylineOptions : {
                    strokeColor : this.props.polylines[0].style.strokeColor,
                    strokeOpacity : this.props.polylines[0].style.strokeOpacity,
                    strokeWeight : this.props.polylines[0].style.strokeWeight
                }
            }
            drawingManager.setDrawingMode(polylineDrawingOpts.drawingControlOptions.drawingModes[0])
            drawingManager.setOptions(polylineDrawingOpts);       
        } else {
            drawingOptions.drawingControl = false;
            drawingManager.setOptions(drawingOptions);
        }  
    }
    onPolygonComplete(polygon : google.maps.Polygon){
        
        const coordinates = (polygon.getPath().getArray().toString());
        updateCoordinatesAttribute(coordinates,this.props.coordinatesStringAttrUpdate);
    }
    onPolylineComplete(polyline : google.maps.Polyline){
        
        const coordinates = (polyline.getPath().getArray().toString());
        updateCoordinatesAttribute(coordinates,this.props.coordinatesStringAttrUpdate);
    }

    render() { 
        const libraries = "drawing";
        const containerStyle = {
            width: '800px',
            height: '600px'
        };
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
        if (datasource && datasource.items && !this.state.showingInfoWindow){
            let editable = false;
            if (this.props.coordinatesStringAttrUpdate){
                if (isAttributeEditable("coordinatesStringAttrUpdate",this.props.coordinatesStringAttrUpdate)){
                    editable = true;
                }
            }      
            this.mxObjects = datasource.items;
            this.mxObjects.map(mxObject => {
                // get all generic attribute values relevant for both Polygon and Polyline
                name = String(this.props.infoWindowAttr(mxObject).value);
                // due to bug in Mendix Pluggable Widget API, readOnly field is always true for datasource objects, hence use attribute
                /*
                draggable = /*!this.props.coordinatesStringAttr(mxObject).readOnly;
                editable = !this.props.coordinatesStringAttr(mxObject).readOnly;
                */
                if (editable && this.props.draggableInEditMode){
                    draggable = true;
                }
                coordinatesString = String(this.props.coordinatesStringAttr(mxObject).value);
                
                if (!coordinatesString){
                    isNew = true;
                }
                this.props.reverseCoordinatesAttr ? reverse = Boolean(this.props.reverseCoordinatesAttr(mxObject).value) : false;  
                strokeColor = String(this.props.colorAttr(mxObject).value);
                this.props.opacityAttr ? strokeOpacity = Number(this.props.opacityAttr(mxObject).value) : 0; 
                this.props.strokeWeightAttr ? strokeWeight = Number(this.props.strokeWeightAttr(mxObject).value) : 2;
                // transform the coordinates string to a path object
                path = createPathFromString(coordinatesString,reverse,false);
                type = String(this.props.objectTypeAttr(mxObject).value);
                
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
                        holeCoordinatesString = String(this.props.holeCoordinatesStringAttr(mxObject).value);            
                        if (holeCoordinatesString){
                            // hole / inner bounds needs to be wound in opposite order of outer bounds
                            holePath = createPathFromString(holeCoordinatesString,reverse,true);               
                        }
                    }
                    if (holePath){
                        polygonObj.holes = holePath.paths;
                    }
        
                    this.props.polygons.push(polygonObj);
                } else if (type === 'Polyline'){
                    let lineType = "Normal";
                    if (this.props.lineTypeAttr){
                        lineType = String(this.props.lineTypeAttr(mxObject).value);
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
                        // set the stying options correcltly for a dotted / dashed line
                        setLineStyleOptions(lineType, polylineObj);
                    }
                    this.props.polylines.push(polylineObj);
                }

            })

        }

        if (this.state.isLoaded){
            this.handleOnGoogleApiLoaded(this.state.map);
        }

        return (
            <div style={{ height: '90vh', width: '90%' }}>
                <LoadScriptNext
                    googleMapsApiKey={this.props.apiKey}
                    libraries={[libraries]}
                    id={"_com.mendix.widget.custom.Maps.Maps"}
                >
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={this.state.center}
                        zoom={this.state.zoom} 
                        onLoad={map => {this.handleOnGoogleApiLoaded(map)}} 

                    >
                        <DrawingManager                        
                            onLoad={this.onDMLoad}
                            onPolygonComplete={this.onPolygonComplete}
                            onPolylineComplete={this.onPolylineComplete}
                        />
                        {this.state.showingInfoWindow &&  (   
                        <InfoWindowComponent
                            onCloseClick={this.onInfoWindowClose}
                            //anchor={this.state.infowindowObj.anchor}
                            name={this.state.infowindowObj.name}
                            position={this.state.infowindowObj.position} 
                            className = {this.props.int_onClickButtonClass}
                            onClickButtonLabel = {this.props.int_onClickButtonLabel}
                            infoWindowLabel = {this.props.int_infoWindowNameLabel}
                            onClickAction = {this.props.int_onClick}  
                            mxObject = {this.state.infowindowObj.mxObject || {} as ObjectItem}          
                        >
                        </InfoWindowComponent>
                        )} 
                        {this.props.polygons.map((polygon,index)=> (
                            (!polygon.isNew) ?
                            <PolygonComponent 
                                isNew={false}
                                key={"polygon_" + index}
                                name={polygon.name}
                                center={polygon.center}
                                onClick={(event:any) => this.mvcObjectClickHandler(event, polygon.name, polygon.center,polygon.mxObject)}
                                guid={polygon.guid}
                                mxObject={polygon.mxObject}
                                paths={polygon.paths}
                                holes={polygon.holes}
                                style={polygon.style}
                                visible={polygon.visible}
                                editable={polygon.editable}
                                draggable={polygon.draggable}
                                coordinatesStringAttrUpdate={this.props.coordinatesStringAttrUpdate} 
                            /> :
                            null 
                        ))}
                        {this.props.polylines.map((polyline,index)=> (
                            (!polyline.isNew) ?
                            <PolylineComponent 
                                isNew={false}
                                key={"polygon_" + index}
                                name={polyline.name}
                                lineType={polyline.lineType}
                                center={polyline.center}
                                onClick={(event:any) => this.mvcObjectClickHandler(event, polyline.name, polyline.center,polyline.mxObject)}
                                guid={polyline.guid}
                                mxObject={polyline.mxObject}
                                paths={polyline.paths}
                                style={polyline.style}
                                visible={polyline.visible}
                                editable={polyline.editable}
                                draggable={polyline.draggable} 
                                coordinatesStringAttrUpdate={this.props.coordinatesStringAttrUpdate}
                            /> :
                            null 
                        ))}
                    </GoogleMap>
                </LoadScriptNext>
            </div>      
        ); 
    }
    private handleOnGoogleApiLoaded (map:google.maps.Map)  {
        // store map in state, so this function can be called a second time once the API and map are already loaded
        if (!this.state.isLoaded){
            this.setState({map:map,isLoaded : true})
        }
        let mapBounds = new google.maps.LatLngBounds();
        let noOfObjects = 0;
        // iterate over all polygons / polylines 
        // 1. set the center
        // 2. add all positions of objects to mapBounds
        for (var i = 0 ; i < this.props.polygons.length ; i++){
            setCenterPolyobject(this.props.polygons[i],mapBounds,"polygon",this.props.polygons[i].name);
            noOfObjects++;
        }

        for (var j = 0 ; j < this.props.polylines.length ; j++){
            setCenterPolyobject(this.props.polylines[j],mapBounds,"polyline",this.props.polylines[j].name);
            noOfObjects++;
        } 
    
        if (noOfObjects == 1 && this.props.overruleFitBoundsZoom){
            console.warn('overruling zoomlevel to: ' + this.props.lowestZoom);
            map.setCenter(mapBounds.getCenter());
            map.setZoom(this.props.lowestZoom);
        } else {
            map.fitBounds(mapBounds);
        }      
        // add map options once the google API is loaded    
        let mapOptions = this.createMapOptions();
        if (this.props.styleArray !== "") {
            mapOptions.styles = JSON.parse(this.props.styleArray);
        }
        map.setOptions(mapOptions);       

    } 
    private createMapOptions() {
        // next props are exposed at maps via react-google-map library
      return {
            draggable:this.props.opt_drag,
            zoomControl: this.props.opt_zoomcontrol,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER,
                style: google.maps.ZoomControlStyle.SMALL
            },
            mapTypeId: google.maps.MapTypeId[this.props.defaultMapType] || google.maps.MapTypeId.ROADMAP,
            mapTypeControl: this.props.opt_mapcontrol,
            mapTypeControlOptions: {
               position: google.maps.ControlPosition.TOP_LEFT
            },
            streetViewControl: this.props.opt_streetview,
            tilt: parseInt(this.props.opt_tilt.replace("d", ""), 10),
            styles:undefined
        };
    }
}


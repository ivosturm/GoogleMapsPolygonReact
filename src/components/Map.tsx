import {
    DrawingManager,
    GoogleMap
} from "@react-google-maps/api";
import React from "react";

import {ObjectItem, ListActionValue, EditableValue} from "mendix";

import InfoWindowComponent from "./InfoWindow";
import { PositionProps, setCenterPolyobject, updateCoordinatesAttribute } from "./PathUtils";
import PolygonComponent, { PolygonProps } from "./Polygon";
import PolylineComponent, { PolylineProps } from "./Polyline";
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
    defaultLat: string;
    defaultLng: string;
    lowestZoom: number;
    onLoad?: (map: google.maps.Map) => void | Promise<void>;
    coordinatesStringAttrUpdate?: EditableValue<string>;
    polygons?:PolygonProps[];
    polylines?:PolylineProps[];
    int_disableInfoWindow: boolean;
    int_infoWindowNameLabel: string;
    int_onClick?: ListActionValue;
    int_onClickButtonClass: string;
    int_onClickButtonLabel: string;
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
    map: google.maps.Map;
    isLoaded: boolean,
    center:{
        lat:number;
        lng:number;
    } 
    zoom:number; 
    bounds: google.maps.LatLngBounds;
    showingInfoWindow:boolean;
    infowindowObj: InfoWindowStateProps;
}
    
export class Map extends React.Component<GoogleMapsPropsExtended,MapState> {
    logNode: string;
    constructor(props: GoogleMapsPropsExtended) {
        super(props); 
        this.logNode = "Google Maps Polygon (React) widget: Map component "; 
        this.state = {
            map: {} as google.maps.Map,
            // this is where the center of map is going to be
            isLoaded: false,
            center : {
                lat: Number(this.props.defaultLat), 
                lng: Number(this.props.defaultLng)
            },
            bounds: {} as google.maps.LatLngBounds,
            // this is how much you want to zoom in
            zoom : Number(this.props.lowestZoom),
            showingInfoWindow: false,
            infowindowObj: {} as InfoWindowStateProps
        }; 
        this.mvcObjectClickHandler = this.mvcObjectClickHandler.bind(this);     
        this.onDMLoad = this.onDMLoad.bind(this); 
        this.onPolygonComplete = this.onPolygonComplete.bind(this); 
        this.onPolylineComplete = this.onPolylineComplete.bind(this);
        this.handleOnGoogleApiLoaded = this.handleOnGoogleApiLoaded.bind(this);
        this.createMapOptions = this.createMapOptions.bind(this);  
    }
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
        if (this.props.polygons?.length === 1 && this.props.polygons[0].isNew){
            console.debug(this.logNode + 'onDMLoad: drawingMode Polygon');
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
        } else if (this.props.polylines?.length === 1 && this.props.polylines[0].isNew){
            console.debug(this.logNode + 'onDMLoad: drawingMode Polyline');
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
            console.debug(this.logNode + 'onDMLoad: drawingMode NONE');
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
        infowindowObj: {} as InfoWindowStateProps
    });
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
        if (this.props.polygons){
            for (var i = 0 ; i < this.props.polygons.length ; i++){
                setCenterPolyobject(this.props.polygons[i],mapBounds,"polygon",this.props.polygons[i].name);
                noOfObjects++;
            }
        }

        if (this.props.polylines){
            for (var j = 0 ; j < this.props.polylines.length ; j++){
                setCenterPolyobject(this.props.polylines[j],mapBounds,"polyline",this.props.polylines[j].name);
                noOfObjects++;
            } 
        }
        if (noOfObjects == 1 && this.props.overruleFitBoundsZoom){
            console.debug('overruling zoomlevel to: ' + this.props.lowestZoom);
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
    render(){
        // if map already loaded before, calculate zoom and fitBounds again!
        if (this.state.isLoaded){
            this.handleOnGoogleApiLoaded(this.state.map);
        }
        return(           
        <GoogleMap
            mapContainerStyle={this.props.mapContainerStyle}
            center={this.state.center}
            zoom={this.state.zoom} 
            onLoad={(map: google.maps.Map<Element>) => {this.handleOnGoogleApiLoaded(map)}}
        > 
            <DrawingManager                        
                onLoad={this.onDMLoad}
                onPolygonComplete={this.onPolygonComplete}
                onPolylineComplete={this.onPolylineComplete}
            />                       
        {this.state.showingInfoWindow &&  (   
            <InfoWindowComponent
                onCloseClick={this.onInfoWindowClose}
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
            {this.props.polygons?.map((polygon)=> (
                (!polygon.isNew) ?
                <PolygonComponent 
                    isNew={false}
                    key={"polygon_" + polygon.guid}
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
            {this.props.polylines?.map((polyline)=> (
                (!polyline.isNew) ?
                <PolylineComponent 
                    isNew={false}
                    key={"polyline_" + polyline.guid}
                    name={polyline.name}
                    lineType={polyline.lineType}
                    center={polyline.center}
                    onClick={(event:any) => this.mvcObjectClickHandler(event, polyline.name, event.latLng,polyline.mxObject)}
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
            ))}</GoogleMap>
        )
    }
}
    
 
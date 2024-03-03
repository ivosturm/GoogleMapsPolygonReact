import { Component, ReactNode, createElement } from "react";

import GoogleMapsContainer  from "./components/GoogleMapsContainer";

import { GoogleMapsPolygonContainerProps } from "../typings/GoogleMapsPolygonProps";

import "./ui/GoogleMapsPolygon.css";

export default class GoogleMapsPolygon extends Component<GoogleMapsPolygonContainerProps> {
    render(): ReactNode {
        return <GoogleMapsContainer 
            dataSource = {"XPath"}
            mapHeight={this.props.mapHeight}
            mapWidth={this.props.mapWidth}
            polyObjects = {this.props.polyObjects}
            defaultMapType = {this.props.defaultMapType}
            coordinatesStringAttr = {this.props.coordinatesStringAttr}
            coordinatesStringAttrUpdate = {this.props.coordinatesStringAttrUpdate}
            draggableInEditMode={this.props.draggableInEditMode}
            holeCoordinatesStringAttr = {this.props.holeCoordinatesStringArray}
            colorAttr = {this.props.colorAttr}
            strokeWeightAttr = {this.props.strokeWeightAttr}
            opacityAttr = {this.props.opacityAttr}
            objectTypeAttr = {this.props.objectTypeAttr}
            lineTypeAttr = {this.props.lineTypeAttr}
            reverseCoordinatesAttr = {this.props.reverseCoordinatesAttr}         
            opt_drag = {this.props.opt_drag}
            opt_mapcontrol = {this.props.opt_mapcontrol}
            opt_scroll = {this.props.opt_scroll}
            opt_streetview = {this.props.opt_streetview}
            opt_zoomcontrol = {this.props.opt_zoomcontrol}
            opt_tilt = {this.props.opt_tilt}
            disableInfoWindow={this.props.disableInfoWindow}
            int_onClick={this.props.onClick}
            infoWindowWidget={this.props.infoWindowWidget}
            apiKey={this.props.apiAccessKey} 
            defaultLat = {this.props.defaultLat}    
            defaultLng = {this.props.defaultLng}
            dynamicDefaultLocation = {this.props.dynamicDefaultLocation}
            defaultLocation = {this.props.defaultLocation}
            defaultLatAttr = {this.props.defaultLatAttr}
            defaultLngAttr = {this.props.defaultLngAttr}
            overruleFitBoundsZoom = {this.props.overruleFitBoundsZoom}
            lowestZoom = {this.props.lowestZoom}
            locations={[]}
            polygons={[]}
            polylines={[]}
            styleArray={this.props.styleArray}  />;
    }
}

import { Component, ReactNode, createElement } from "react";
import { ValueStatus } from "mendix";
import { GoogleMapsContainer }  from "./components/GoogleMapsContainer";
import "./ui/GoogleMapsPolygon.css";

import { GoogleMapsPolygonContainerProps } from "../typings/GoogleMapsPolygonProps";

export default class GoogleMapsPolygon extends Component<GoogleMapsPolygonContainerProps> {
    render(): ReactNode {
        const apiKeyObjectDS = this.props.apiKeyObjectDS;

        if (!apiKeyObjectDS || apiKeyObjectDS.status !== ValueStatus.Available) {
            return <div>Loading...</div>;
        } else if (apiKeyObjectDS.status === ValueStatus.Available && (!apiKeyObjectDS.items || apiKeyObjectDS.items.length === 0)) {
            return <div>Please provide an API key</div>;
        } 

        const apiKeyObject = apiKeyObjectDS.items![0];
        const apiKey = String(this.props.apiKeyAttribute.get(apiKeyObject).value);

        return  (
            <div id="google-maps-polygon">
            {!apiKey ? <div className="error">Please provide a valid API key to make the widget work in Production</div> : null}
            <GoogleMapsContainer
            dataSource = {"XPath"}
            mapHeight={this.props.mapHeight}
            mapWidth={this.props.mapWidth}
            polyObjects = {this.props.polyObjects}
            defaultMapType = {this.props.defaultMapType}
            coordinatesStringAttr = {this.props.coordinatesStringAttr}
            coordinatesStringAttrUpdate = {this.props.coordinatesStringAttrUpdate}
            areaAttrUpdate = {this.props.areaAttrUpdate}
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
            opt_recenterbutton = {this.props.opt_recenterbutton}
            opt_scroll = {this.props.opt_scroll}
            opt_streetview = {this.props.opt_streetview}
            opt_undobutton = {this.props.opt_undobutton}
            opt_zoomcontrol = {this.props.opt_zoomcontrol}
            opt_fullscreencontrol = {this.props.opt_fullscreencontrol}
            opt_tilt = {this.props.opt_tilt}
            disableInfoWindow={this.props.disableInfoWindow}
            int_onClick={this.props.onClick}
            infoWindowWidget={this.props.infoWindowWidget}
            apiKey={apiKey} 
            defaultLat = {this.props.defaultLat}    
            defaultLng = {this.props.defaultLng}
            dynamicDefaultLocation = {this.props.dynamicDefaultLocation}
            defaultLocation = {this.props.defaultLocation}
            defaultLatAttr = {this.props.defaultLatAttr}
            defaultLngAttr = {this.props.defaultLngAttr}
            overruleFitBoundsZoom = {this.props.overruleFitBoundsZoom}
            lowestZoom = {this.props.lowestZoom}
            polygons={[]}
            polylines={[]}
            styleArray={this.props.styleArray}
            />
            </div>
        );
    }
}

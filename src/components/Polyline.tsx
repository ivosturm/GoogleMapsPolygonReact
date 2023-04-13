import { Polyline } from "@react-google-maps/api";
import React, { createElement } from "react";
import { addPolyEvent } from "./PathUtils";
import { PolyProps } from "./Polygon";

export interface PolylineProps extends PolyProps {
    style: {
        strokeColor : string;
        strokeOpacity : number;
        strokeWeight : number;
        icons?:IconsProps[];
    }; 
    lineType: string;  
}

export interface IconsProps {
    icon: IconProps,
    offset: string,
    repeat: string
}

export interface IconProps {
 
    path: string | google.maps.SymbolPath,
    fillOpacity?: number,
    strokeOpacity?: number,
    scale: number,
    strokeWeight: number

}

export interface PolylineState {
    polyline: google.maps.Polyline;
    center: google.maps.LatLng;
}

export default class PolylineComponent extends React.Component<PolylineProps,PolylineState> {
    logNode: string;
    constructor(props: PolylineProps) {
        super(props);
        this.logNode = "Google Maps Polygon (React) widget: Polyline Component: ";
        this.state = {
            polyline: {} as google.maps.Polyline,
            center: {} as google.maps.LatLng
        };
    }
  
    onClick = (e:any) => {
        if (e){

        }
    };
    onInfoWindowLoad = () => {
        console.debug(this.logNode + 'infoWindow: ');
    }
    onInfoWindowClose = () => {

    };
    onLoad = (polyline: google.maps.Polyline) => {  

        const polylineBounds = new google.maps.LatLngBounds();
        const newPaths = polyline.getPath();

        newPaths.forEach(function(element){polylineBounds.extend(element)})

        // store center of polyline in polyline state
        let center = polylineBounds.getCenter();

        this.setState({
            polyline : polyline,
            center: center
        });

        //Add a dynamic listener to the polygon or polygon click event for the NewEdit screen
        if (this.props.editable && this.props.coordinatesStringAttrUpdate) {
            addPolyEvent(newPaths,this.props.paths,this.props.coordinatesStringAttrUpdate);
        }
    };
    shouldComponentUpdate(nextProps:any) {
        if (nextProps.name == this.props.name && nextProps.center == this.props.center && nextProps.paths == this.props.paths){
            console.debug(this.logNode + 'polyline ' + this.props.name + ' NOT updated, since name, center and path havent changed!');
            return false;
        } else if (nextProps.name !== this.props.name){
            console.debug(this.logNode + 'polyline ' + this.props.name + ' updated! New name: ' + nextProps.name);
            return false;
        } else if (nextProps.center != this.props.center){
            console.debug(this.logNode + 'polyline ' + this.props.name + ' updated! New center: ' + nextProps.center);
            return false;
        } else if (nextProps.paths !== this.props.paths){
            console.debug(this.logNode + 'polyline ' + this.props.name + ' updated! New path: ' + nextProps.paths);
            return true;
        } else {
            return true;
        }
    }
    render() {  

        return (
            <Polyline
                onLoad={this.onLoad}
                path={this.props.paths}
                options={this.props.style}
                editable={this.props.editable}
                visible={this.props.visible}
                onClick={this.props.onClick}
            >
            </Polyline>
        );
    }
  }




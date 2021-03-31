import { Polygon } from "@react-google-maps/api";
import React from "react";
import { ObjectItem,EditableValue} from "mendix";
import { addPolyEvent, PositionProps } from "./PathUtils";

export interface PolyProps {
    isNew:boolean;
    paths:PositionProps[];   
    center?: PositionProps;
    guid: string;
    mxObject: ObjectItem;
    name: string;
    draggable: boolean;
    editable?: boolean;
    visible: boolean;
    onClick?:any;
    coordinatesStringAttrUpdate?: EditableValue<string>;
}

export interface PolygonProps extends PolyProps {
    holes?:PositionProps[];
    style: {
        strokeColor : string;
        strokeOpacity : number;
        strokeWeight : number;
        fillColor : string;
        fillOpacity : number;
    } 
}

export interface PolygonState {
    polygon: google.maps.Polygon;
    center: google.maps.LatLng;
}

export default class PolygonComponent extends React.Component<PolygonProps,PolygonState> {
    logNode: string;
    constructor(props: PolygonProps) {
        super(props);
        this.logNode = "Google Maps Polygon (React) widget: Polygon Component: ";
        this.state = {
            polygon: {} as google.maps.Polygon,
            center: {} as google.maps.LatLng
        };
    }
  
    onClick = (e:any) => {
        if (e){

        }
    };
    onInfoWindowLoad = () => {
        console.log('infoWindow: ');
    }
    onInfoWindowClose = () => {

    };  
    onLoad = (polygon: google.maps.Polygon) => {  

        const polygonBounds = new google.maps.LatLngBounds();
        const newPaths = polygon.getPath();

        newPaths.forEach(function(element){polygonBounds.extend(element)})

        // store center of polygon in polygon props
        let center = polygonBounds.getCenter();

        this.setState({
            polygon : polygon,
            center: center
        });

        // add a dynamic listener to the polygon or polygon click event for the NewEdit screen
        if (this.props.editable && this.props.coordinatesStringAttrUpdate) {
            addPolyEvent(polygon,newPaths,this.props.paths,this.props.coordinatesStringAttrUpdate);
        }

    };
    shouldComponentUpdate(nextProps:any) {
        if (nextProps.name == this.props.name && nextProps.center == this.props.center && nextProps.paths == this.props.paths){
            console.debug(this.logNode + 'polygon ' + this.props.name + ' NOT updated, since name, center and path havent changed!');
            return false;
        } else if (nextProps.name !== this.props.name){
            console.debug(this.logNode + 'polygon ' + this.props.name + ' updated! New name: ' + nextProps.name);
            return false;
        } else if (nextProps.center != this.props.center){
            console.debug(this.logNode + 'polygon ' + this.props.name + ' updated! New center: ' + nextProps.center);
            return false;
        } else if (nextProps.paths !== this.props.paths){
            console.debug(this.logNode + 'polygon ' + this.props.name + ' updated! New path: ' + nextProps.paths);
            return true;
        } else {
            return true;
        }
    }
    render() {  
      // if holes are added then add the holes array as well
        let paths = [];
        if (this.props.holes){
            console.debug(this.logNode + 'polygon ' + this.props.name + ' has holes!')
            paths = [this.props.paths,this.props.holes]
        } else {
            paths = [this.props.paths]
        }

        return (
            <Polygon
                onLoad={this.onLoad}
                paths={paths}
                options={this.props.style}
                draggable={this.props.draggable}
                editable={this.props.editable}
                visible={this.props.visible}
                onClick={this.props.onClick}
            >
            </Polygon>
        );
    }
  }



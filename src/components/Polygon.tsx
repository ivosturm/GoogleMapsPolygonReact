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
    constructor(props: PolygonProps) {
        super(props);
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

        //Add a dynamic listener to the polygon or polygon click event for the NewEdit screen
        if (this.props.editable && this.props.coordinatesStringAttrUpdate) {
            addPolyEvent(polygon,newPaths,this.props.paths,this.props.coordinatesStringAttrUpdate);
        }

    };
    shouldComponentUpdate(prevProps:any) {
        if (prevProps.name == this.props.name && prevProps.center == this.props.center){
            console.debug('polygon ' + this.props.name + ' NOT updated!');
            return false;
        } else {
            console.debug('polygon ' + this.props.name + ' updated!');
            console.debug('old/new name: '+ prevProps.name + ' / ' + this.props.name + 'old/new position: '+ prevProps.position + ' / ' + this.props.center  );
            return true;
        }
    }
    render() {  
      // if holes are added then add the holes array as well
        let paths = [];
        if (this.props.holes){
            console.warn('polygon ' + this.props.name + ' has holes!')
            paths = [this.props.paths,this.props.holes]
        } else {
            paths = [this.props.paths]
        }

        return (
            <Polygon
                onLoad={this.onLoad}
                paths={paths}
                options={this.props.style}
                editable={this.props.editable}
                visible={this.props.visible}
                onClick={this.props.onClick}
            >
            </Polygon>
        );
    }
  }



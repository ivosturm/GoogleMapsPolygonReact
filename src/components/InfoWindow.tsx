import React, { Component, createElement } from "react";
import { InfoWindow } from "@react-google-maps/api";

import { ObjectItem, ListWidgetValue} from "mendix";
import { PositionProps } from "./PathUtils";

export interface InfoWindowProps extends InfoWindowExposedProps{
    anchor?: google.maps.MVCObject;
    position? : PositionProps;  
    onCloseClick?: any;
}

export interface InfoWindowExposedProps {
    name: string;  
    infoWindowWidget?: ListWidgetValue;
    mxObject?: ObjectItem;
}
 
export default class InfoWindowComponent extends Component<InfoWindowProps> {
    logNode: string;
    constructor(props: InfoWindowProps) {
        super(props);
        this.logNode = "Google Maps Polygon (React) widget: InfoWindow Component: ";
    }
    componentDidUpdate(prevProps:any) {
        if (prevProps){
            console.debug(this.logNode + 'componentDidUpdate');
        }      
    }
    render(){  
        let innerWidget: React.ReactNode;
        if (this.props.infoWindowWidget && this.props.mxObject) {
            innerWidget = this.props.infoWindowWidget.get(this.props.mxObject);
        }
        return (  <InfoWindow
        position={this.props.position}
        onCloseClick={this.props.onCloseClick}
        anchor={this.props.anchor}
    >
        <div>
            {innerWidget}
        </div>
    </InfoWindow>)
    }
};



   
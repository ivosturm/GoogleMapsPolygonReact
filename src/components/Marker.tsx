import React, { createElement } from "react";
import { Marker } from "@react-google-maps/api";
import { ObjectItem} from "mendix";


export interface Location {
    address?: string;
    position: {
        lat: number;
        lng: number;
    }
    name: string;
    mxObject?: ObjectItem;
}

export interface MarkerProps extends Location {
    url?: string;
    draggable?:boolean;
    onClick:any;
}

export interface MarkerState {
    marker: google.maps.Marker;
}

export default class MarkerComponent extends React.Component<MarkerProps,MarkerState>  {
    constructor(props: MarkerProps) {
        super(props);
        this.state = {
            marker: {} as google.maps.Marker
        };
    }
    onLoad = (marker: google.maps.Marker) => {  

        this.setState({
            marker : marker
        });
    };
    onClick = (e:any) => {
        if (e){
            console.dir(this.props);

        }
    };
    onInfoWindowLoad = () => {
        console.log('infoWindow: ');
    }
    onInfoWindowClose = () => {

    };
    shouldComponentUpdate(prevProps:any) {
        if (prevProps.name == this.props.name && prevProps.position == this.props.position){
            console.debug('marker ' +  this.props.name + ' NOT updated!');
            return false;
        } else {
            console.debug('marker ' +  this.props.name + ' updated!');
            return true;
        }
    }
    render(){
 
        if (this.props.url) {
            const style = { backgroundImage: `url(${this.props.url})` };

            return <div className="widget-google-maps-marker-url" style={style}></div>
        }

        return (<Marker
                    onLoad={this.onLoad}
                    position={this.props.position}
                    onClick={this.props.onClick}
                    draggable={this.props.draggable}
                >
                <div className="widget-google-maps-marker"></div>
            </Marker>
        )
    }
}


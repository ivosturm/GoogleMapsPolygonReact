
import {
 LoadScript

} from "@react-google-maps/api";
import React from "react";

export interface LoadScriptComponentInterface {
    apiKey: string;
}

interface LoadScriptComponentState {
    //googleScriptRef : React.RefObject<LoadScript>
    isLoaded : boolean;
}

export default class LoadScriptComponent extends React.Component<LoadScriptComponentInterface,LoadScriptComponentState>{
    //googleScriptRef: React.RefObject<LoadScript>;
    constructor(props: LoadScriptComponentInterface) {
        super(props);
        //this.googleScriptRef = React.createRef();
        /*this.state = {
            isLoaded : false
        }*/
    }
   /* componentDidMount(){
        if (!this.state.isLoaded){
            console.error('Updating state to isLoaded=true');
            this.setState({ isLoaded: true});
        } 
    }
    shouldComponentUpdate(nextState:any) { 
        if (nextState.isLoaded != this.state.isLoaded) { 
            console.error('Load Script loading Google Maps API first time!');
            return true;
        } else {
            console.error('Load Script already loaded Google Maps API, not rerendering Load Script!');
           return false;
        }
    }*/
    render(){
       // if (!this.state.isLoaded){
           console.error('Rendering Load Script!');
            return (<LoadScript //ref={this.googleScriptRef}
                googleMapsApiKey={this.props.apiKey}
                libraries={["drawing"]}
                id={"_com.mendix.widget.custom.Maps.Maps"}
            ></LoadScript>
            )
        //} else {
          //  console.error('Not rendering Load Script!');
            //return null; 
       // }
    }   
}
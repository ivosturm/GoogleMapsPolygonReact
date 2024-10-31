import {EditableValue} from "mendix";
import { PolylineProps, IconProps, IconsProps } from "./Polyline";

export interface PathArrayProps {
    paths: PositionProps[];
}

export interface PositionProps {
    lat: number;
    lng: number;
}

const logNode = "Google Maps Polygon (React) widget: Path Utils: "; 

export function createPathFromString(coordinatesStringOriginal:string,reversedLatLng:boolean,sortLatLngPairsReversed:boolean): PathArrayProps {
    let lat : string[] = [],
	lng : string[] = [],
    coordinate : string | undefined = undefined,
    coordinates : string[] | undefined = undefined,
    coordinatesNo : number;

    // if square brackets used, switch to normal brackets
    const coordinatesString = coordinatesStringOriginal.replace(/\[/g,"(").replace(/\]/g,")").replace(/ /g,"");
 
    coordinates = coordinatesString.split("),(");
    coordinatesNo = coordinates.length;
    // instantiate new PathProps object, 
    // see https://stackoverflow.com/questions/13142635/how-can-i-create-an-object-based-on-an-interface-file-definition-in-typescript
    let pathObj = {paths:[]} as PathArrayProps;

    coordinates[0] = coordinates[0].replace("(", "");

    coordinates[coordinatesNo - 1] = coordinates[coordinatesNo - 1].replace(")", "");

    // for holes, reverse order of array since winding needs to be opposite of original path of outer border
    if (sortLatLngPairsReversed){
        coordinates = coordinates.reverse();
    }
    for (coordinate in coordinates) {
        coordinates[coordinate] = coordinates[coordinate].replace("(", ""); // remove first (
        coordinates[coordinate] = coordinates[coordinate].replace(")", ""); // remove last )

        if (reversedLatLng) {
            lng[coordinate] = coordinates[coordinate].split(",")[0];
            lat[coordinate] = coordinates[coordinate].split(",")[1];
        } else {
            lat[coordinate] = coordinates[coordinate].split(",")[0];
            lng[coordinate] = coordinates[coordinate].split(",")[1];

        }
        let path = {
            lat : parseFloat(lat[coordinate]), 
            lng : parseFloat(lng[coordinate])
        };
        pathObj.paths.push(path);
    }				
    return pathObj;
}
// generic function to catch and process changes in shape of polygon / polyline
export function onPolyObjectChange(path : any, oldcoordinates : string, attribute? : EditableValue<string>){
    // here do the snapping, after the polygon has been resized
    var newcoordinates = path.getArray();
    console.debug(logNode + 'onPolyObjectChange: new coordinates: ' + newcoordinates.toString());
    if (newcoordinates.toString() != oldcoordinates) {
        console.debug(logNode + 'coordinates changed');
        if (attribute){
            console.debug(logNode + 'trying to change attribute. First checking editability..');
            if (isAttributeEditable("coordinatesStringAttrUpdate",attribute)){
                console.debug(logNode + 'attribute editable.. Setting coordinates: ' + newcoordinates);
                attribute.setValue(newcoordinates.toString());
            };
        } 
    }
} 

export function setCenterPolyobject(polyObject:any,mapBounds:google.maps.LatLngBounds,type:string,name:string) {
    // polygon has paths, polyline has path
    let paths;
    if (polyObject && polyObject.paths) {
        paths = polyObject.paths;
    } else if (polyObject && polyObject.path) {
        paths = polyObject.path;
    }
    if (polyObject && !polyObject.isNew && paths && paths.length > 0 && !isNaN(paths[0].lat) && !isNaN(paths[0].lng)) { 
        let objBounds = new google.maps.LatLngBounds();
        for (var j = 0; j < paths.length; j++) {

            //console.info(this.state.polygons[i].paths[j]);
            const ObjElementBound = paths[j];
            // add bound to current polygon bound for determining center for infowindow
            objBounds.extend(ObjElementBound);

            // add bound to map bound for properly zooming to full extent of all polygons
            mapBounds.extend(ObjElementBound);
        }

        // store center of polygon in poly props
        const centerLatLng = objBounds.getCenter();
        polyObject.center = {
            lat : centerLatLng.lat(),
            lng : centerLatLng.lng()
        }
        //console.warn("polyobject center set to lat / lng: " + centerLatLng.lat() + ' / ' + centerLatLng.lng());
        
    } else if (polyObject && paths && (isNaN(paths[0].lat) || isNaN(paths[0].lng))){
        console.debug(logNode + type + ' ' + name + " has incorrect latitude / longitude. This can happen when " + type + " still needs to be drawn.")
    }
    return mapBounds;
}

export function updateCoordinatesAttribute(coordinates : string, coordinatesStringAttrUpdate? : EditableValue<string>){
    console.info(logNode + 'completed drawing! Coordinates retrieved: ' + coordinates);
    if (coordinatesStringAttrUpdate){
        if (isAttributeEditable("coordinatesStringAttrUpdate",coordinatesStringAttrUpdate)){
            coordinatesStringAttrUpdate.setValue(coordinates);
        };
    } 
}

export function setLineStyleOptions(lineType : string, polyLineObj : PolylineProps ) {
    let lineSymbol = {} as IconProps;
    polyLineObj.icons = [] as IconsProps[];
    if (lineType === "Dotted") {

        lineSymbol = {
            path: 0, //google not loaded yet, but should be: google.maps.SymbolPath.CIRCLE,
            fillOpacity: 1,
            scale: 3,
            strokeWeight: polyLineObj.strokeWeight ?? 1
        };
    } else if (lineType === "Dashed") {

        lineSymbol = {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 4,
            strokeWeight: polyLineObj.strokeWeight ?? 1
        };
    }
    polyLineObj.strokeOpacity = 0;
    const icons = [{
        icon: lineSymbol,
        offset: '0',
        repeat: '20px'
    }];
    polyLineObj.icons = icons;

    return polyLineObj;
}

export function isAttributeEditable(propName: string, prop: EditableValue): boolean {
    let editable = false;
    if (prop && prop.status === "available" && !prop.readOnly) {
        editable = true;
        console.debug(logNode + propName + " is editable.");
    }
    return editable;
}
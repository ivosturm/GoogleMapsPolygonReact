import {EditableValue} from "mendix";
import { Big } from "big.js";
import { PolylineProps, IconProps, IconsProps } from "./Polyline";

export interface PathArrayProps {
    paths: PositionProps[];
}

export interface PositionProps {
    lat: number;
    lng: number;
}

function extractTopLevelBracketGroups(value: string): string[] {
    const groups: string[] = [];
    let depth = 0;
    let start = -1;

    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if (char === "[") {
            if (depth === 0) {
                start = i;
            }
            depth++;
        } else if (char === "]") {
            depth--;
            if (depth === 0 && start > -1) {
                groups.push(value.slice(start, i + 1));
                start = -1;
            }
        }
    }

    return groups;
}

function splitAtTopLevel(value: string, separators: string[]): string[] {
    const parts: string[] = [];
    let current = "";
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < value.length; i++) {
        const char = value[i];

        if (char === "(") parenDepth++;
        else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
        else if (char === "[") bracketDepth++;
        else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
        else if (char === "{") braceDepth++;
        else if (char === "}") braceDepth = Math.max(0, braceDepth - 1);

        const isTopLevel = parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;
        if (isTopLevel && separators.includes(char)) {
            const trimmed = current.trim();
            if (trimmed) {
                parts.push(trimmed);
            }
            current = "";
            continue;
        }

        current += char;
    }

    const last = current.trim();
    if (last) {
        parts.push(last);
    }

    return parts;
}

interface CoordinatePairToken {
    lat: number;
    lng: number;
}

function parseCoordinatePairs(value: string): CoordinatePairToken[] {
    const pairs: CoordinatePairToken[] = [];
    const pairRegex = /[\(\[]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*,\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*[\)\]]/g;
    let match: RegExpExecArray | null;

    while ((match = pairRegex.exec(value)) !== null) {
        pairs.push({
            lat: Number(match[1]),
            lng: Number(match[2])
        });
    }

    return pairs;
}

function isSamePair(a: CoordinatePairToken, b: CoordinatePairToken): boolean {
    return Math.abs(a.lat - b.lat) < 1e-12 && Math.abs(a.lng - b.lng) < 1e-12;
}

function splitClosedRingsFromPairs(value: string): string[] {
    const pairs = parseCoordinatePairs(value);
    if (pairs.length === 0) {
        return [];
    }

    const rings: string[] = [];
    let current: CoordinatePairToken[] = [];

    for (const pair of pairs) {
        current.push(pair);
        if (current.length >= 4 && isSamePair(current[0], current[current.length - 1])) {
            rings.push(current.map(p => `(${p.lat},${p.lng})`).join(","));
            current = [];
        }
    }

    if (current.length > 0) {
        rings.push(current.map(p => `(${p.lat},${p.lng})`).join(","));
    }

    return rings;
}

export function createHolePathsFromString(holeCoordinatesStringOriginal: string, reversedLatLng: boolean): PositionProps[][] {
    const input = holeCoordinatesStringOriginal.trim();
    if (!input || input === "null" || input === "undefined") {
        return [];
    }

    const bracketGroups = extractTopLevelBracketGroups(input);
    const holeRingsRaw = bracketGroups.length > 1
        ? bracketGroups
        : splitAtTopLevel(input, [";", "|"]);

    const closedRings = holeRingsRaw.length === 1 ? splitClosedRingsFromPairs(holeRingsRaw[0]) : [];
    const holeRings = closedRings.length > 1
        ? closedRings
        : (holeRingsRaw.length > 0 ? holeRingsRaw : [input]);

    return holeRings
        .map(ring => createPathFromString(ring, reversedLatLng, true).paths)
        .filter(path =>
            path.length >= 3 &&
            path.every(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        );
}

const logNode = "Google Maps Polygon widget: Path Utils: "; 

export function createPathFromString(coordinatesStringOriginal:string,reversedLatLng:boolean,sortLatLngPairsReversed:boolean): PathArrayProps {
    const input = (coordinatesStringOriginal || "").trim();
    if (!input || input === "null" || input === "undefined") {
        return { paths: [] };
    }

    const parsedPairs = parseCoordinatePairs(input);
    if (parsedPairs.length === 0) {
        return { paths: [] };
    }

    const orderedPairs = sortLatLngPairsReversed ? [...parsedPairs].reverse() : parsedPairs;
    const paths = orderedPairs
        .map(pair =>
            reversedLatLng
                ? { lat: pair.lng, lng: pair.lat }
                : { lat: pair.lat, lng: pair.lng }
        )
        .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng));

    return { paths };
}
// generic function to catch and process changes in shape of polygon / polyline
export function onPolyObjectChange(path : any, oldcoordinates : string, attribute? : EditableValue<string>, areaAttrUpdate? : EditableValue<Big>){
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
        if (areaAttrUpdate) {
            updateAreaAttributeFromRings([newcoordinates], areaAttrUpdate);
        }
    }
} 

function toLatLngLiteral(point: any): google.maps.LatLngLiteral | null {
    if (!point) {
        return null;
    }
    if (typeof point.lat === "function" && typeof point.lng === "function") {
        return { lat: point.lat(), lng: point.lng() };
    }
    if (typeof point.lat === "number" && typeof point.lng === "number") {
        return { lat: point.lat, lng: point.lng };
    }
    return null;
}

export function updateAreaAttributeFromRings(rings: any[][], areaAttrUpdate?: EditableValue<Big>): void {
    if (!areaAttrUpdate || !rings || rings.length === 0) {
        return;
    }
    if (!isAttributeEditable("areaAttrUpdate", areaAttrUpdate)) {
        return;
    }
    if (!google.maps.geometry?.spherical?.computeArea) {
        console.warn(logNode + "geometry library unavailable, unable to compute polygon area");
        return;
    }

    const normalizedRings = rings
        .map(ring => ring.map(toLatLngLiteral).filter((point): point is google.maps.LatLngLiteral => point !== null))
        .filter(ring => ring.length >= 3);

    if (normalizedRings.length === 0) {
        return;
    }

    const computeArea = google.maps.geometry.spherical.computeArea;
    const outerArea = computeArea(normalizedRings[0]);
    const holesArea = normalizedRings.slice(1).reduce((sum, ring) => sum + computeArea(ring), 0);
    const areaSquareMeters = Math.max(0, outerArea - holesArea);
    const areaHectares = areaSquareMeters / 10000;

    areaAttrUpdate.setValue(new Big(areaHectares.toFixed(4)));
}

export function setCenterPolyobject(polyObject:any,mapBounds:google.maps.LatLngBounds,type:string,name:string) {
    // polygon has paths, polyline has path
    let paths;
    if (polyObject && polyObject.paths) {
        paths = polyObject.paths;
    } else if (polyObject && polyObject.path) {
        paths = polyObject.path;
    }
    // google polygon holes are represented as nested paths: [outerRing, holeRing1, ...]
    // for zoom/center logic we keep existing behavior by using the outer ring for bounds
    if (Array.isArray(paths) && paths.length > 0 && Array.isArray(paths[0])) {
        paths = paths[0];
    }
    const firstPathPoint = Array.isArray(paths) && paths.length > 0 ? paths[0] : undefined;
    const firstLat =
        firstPathPoint && typeof firstPathPoint.lat === "function"
            ? firstPathPoint.lat()
            : firstPathPoint?.lat;
    const firstLng =
        firstPathPoint && typeof firstPathPoint.lng === "function"
            ? firstPathPoint.lng()
            : firstPathPoint?.lng;

    if (polyObject && !polyObject.isNew && Array.isArray(paths) && paths.length > 0 && !isNaN(firstLat) && !isNaN(firstLng)) {
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
        
    } else if (polyObject && Array.isArray(paths) && paths.length > 0 && (isNaN(firstLat) || isNaN(firstLng))){
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

export function showFriendlyErrorPopup(message: string): void {
    const globalWindow = window as any;

    if (globalWindow?.mx?.ui?.error) {
        globalWindow.mx.ui.error(message);
        return;
    }
    if (globalWindow?.mx?.ui?.warning) {
        globalWindow.mx.ui.warning(message);
        return;
    }

    window.alert(message);
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
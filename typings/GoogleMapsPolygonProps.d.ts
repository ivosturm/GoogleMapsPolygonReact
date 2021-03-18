/**
 * This file was generated from GoogleMapsPolygon.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix UI Content Team
 */
import { CSSProperties } from "react";
import { EditableValue, ListValue, ListActionValue, ListAttributeValue } from "mendix";

export type DefaultMapTypeEnum = "ROADMAP" | "SATELLITE" | "HYBRID" | "TERRAIN";

export type Opt_tiltEnum = "d0" | "d45";

export interface GoogleMapsPolygonContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex: number;
    apiAccessKey: string;
    defaultLat: string;
    defaultLng: string;
    defaultMapType: DefaultMapTypeEnum;
    draggableInEditMode: boolean;
    overruleFitBoundsZoom: boolean;
    lowestZoom: number;
    polyObjects?: ListValue;
    holeCoordinatesStringArray?: ListAttributeValue<string>;
    coordinatesStringAttr: ListAttributeValue<string>;
    coordinatesStringAttrUpdate?: EditableValue<string>;
    reverseCoordinatesAttr?: ListAttributeValue<boolean>;
    colorAttr: ListAttributeValue<string>;
    strokeWeightAttr?: ListAttributeValue<BigJs.Big>;
    opacityAttr?: ListAttributeValue<BigJs.Big>;
    infoWindowAttr: ListAttributeValue<string>;
    objectTypeAttr: ListAttributeValue<string>;
    lineTypeAttr?: ListAttributeValue<string>;
    disableInfoWindow: boolean;
    infoWindowNameLabel: string;
    onClickButtonClass: string;
    onClickButtonLabel: string;
    onClick?: ListActionValue;
    opt_drag: boolean;
    opt_mapcontrol: boolean;
    opt_scroll: boolean;
    opt_streetview: boolean;
    opt_zoomcontrol: boolean;
    opt_tilt: Opt_tiltEnum;
    styleArray: string;
}

export interface GoogleMapsPolygonPreviewProps {
    class: string;
    style: string;
    apiAccessKey: string;
    defaultLat: string;
    defaultLng: string;
    defaultMapType: DefaultMapTypeEnum;
    draggableInEditMode: boolean;
    overruleFitBoundsZoom: boolean;
    lowestZoom: number | null;
    polyObjects: {} | null;
    holeCoordinatesStringArray: string;
    coordinatesStringAttr: string;
    coordinatesStringAttrUpdate: string;
    reverseCoordinatesAttr: string;
    colorAttr: string;
    strokeWeightAttr: string;
    opacityAttr: string;
    infoWindowAttr: string;
    objectTypeAttr: string;
    lineTypeAttr: string;
    disableInfoWindow: boolean;
    infoWindowNameLabel: string;
    onClickButtonClass: string;
    onClickButtonLabel: string;
    onClick: {} | null;
    opt_drag: boolean;
    opt_mapcontrol: boolean;
    opt_scroll: boolean;
    opt_streetview: boolean;
    opt_zoomcontrol: boolean;
    opt_tilt: Opt_tiltEnum;
    styleArray: string;
}

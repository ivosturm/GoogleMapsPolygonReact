/**
 * This file was generated from GoogleMapsPolygon.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { ComponentType, CSSProperties, ReactNode } from "react";
import { EditableValue, ListValue, ListActionValue, ListAttributeValue, ListWidgetValue } from "mendix";
import { Big } from "big.js";

export type DefaultMapTypeEnum = "ROADMAP" | "SATELLITE" | "HYBRID" | "TERRAIN";

export type Opt_tiltEnum = "d0" | "d45";

export interface GoogleMapsPolygonContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    mapHeight: number;
    mapWidth: number;
    apiAccessKey: string;
    defaultLat: string;
    defaultLng: string;
    defaultMapType: DefaultMapTypeEnum;
    draggableInEditMode: boolean;
    overruleFitBoundsZoom: boolean;
    lowestZoom: number;
    polyObjects: ListValue;
    holeCoordinatesStringArray: ListAttributeValue<string>;
    coordinatesStringAttr: ListAttributeValue<string>;
    coordinatesStringAttrUpdate?: EditableValue<string>;
    reverseCoordinatesAttr?: ListAttributeValue<boolean>;
    colorAttr: ListAttributeValue<string>;
    strokeWeightAttr?: ListAttributeValue<Big>;
    opacityAttr?: ListAttributeValue<Big>;
    objectTypeAttr: ListAttributeValue<string>;
    lineTypeAttr?: ListAttributeValue<string>;
    infoWindowWidget?: ListWidgetValue;
    disableInfoWindow: boolean;
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
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    mapHeight: number | null;
    mapWidth: number | null;
    apiAccessKey: string;
    defaultLat: string;
    defaultLng: string;
    defaultMapType: DefaultMapTypeEnum;
    draggableInEditMode: boolean;
    overruleFitBoundsZoom: boolean;
    lowestZoom: number | null;
    polyObjects: {} | { caption: string } | { type: string } | null;
    holeCoordinatesStringArray: string;
    coordinatesStringAttr: string;
    coordinatesStringAttrUpdate: string;
    reverseCoordinatesAttr: string;
    colorAttr: string;
    strokeWeightAttr: string;
    opacityAttr: string;
    objectTypeAttr: string;
    lineTypeAttr: string;
    infoWindowWidget: { widgetCount: number; renderer: ComponentType<{ children: ReactNode; caption?: string }> };
    disableInfoWindow: boolean;
    onClick: {} | null;
    opt_drag: boolean;
    opt_mapcontrol: boolean;
    opt_scroll: boolean;
    opt_streetview: boolean;
    opt_zoomcontrol: boolean;
    opt_tilt: Opt_tiltEnum;
    styleArray: string;
}

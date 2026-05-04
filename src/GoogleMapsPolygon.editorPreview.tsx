import { createElement, ReactElement } from "react";
import { GoogleMapsPolygonPreviewProps } from "../typings/GoogleMapsPolygonProps";

export function preview(props: GoogleMapsPolygonPreviewProps): ReactElement {
	const width = props.mapWidth && props.mapWidth !== 10000 ? `${props.mapWidth}px` : "100%";
	const height = props.mapHeight && props.mapHeight !== 10000 ? `${props.mapHeight}px` : "320px";

	return (
		<div
			className={props.class}
			style={{
				...props.styleObject,
				width,
				height,
				border: "1px solid #d6d6d6",
				borderRadius: 8,
				background: "linear-gradient(135deg, #eef4ff 0%, #f8fbff 100%)",
				color: "#24415d",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: "Segoe UI, sans-serif",
				fontSize: 14,
				padding: 16,
				boxSizing: "border-box",
				textAlign: "center"
			}}
		>
			Google Maps Polygon
		</div>
	);
}


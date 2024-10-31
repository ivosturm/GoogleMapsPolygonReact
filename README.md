## GoogleMapsPolygon
Displaying and editing Polygons and Polylines within your Mendix application.

This widget is a rewrite of the original GoogleMapsPolygon widget, originally based on the Dojo framework, see https://marketplace.mendix.com/link/component/105491.

This widget uses React / TypeScript and the new pluggable widgets API. Additional features:

Support for all datasources, even nanoflows;
Support for all types of on click behavior when clicking on a Polygon / Polyline overlay;
Editability based on Mendix Studio Pro, respecting entity access rights;
One hole per polygon is supported;

## Features
* plotting of Polygons and Polylines;
* drawing, editing and dragging of Polygons and Polylines
* styling options, both for map as well as appearance of Polygons / Polylines;
* dynamic default location when creating a new Polygon/Polyline
* on click infowindow and triggering of action (microflow/nanoflow/show page etc);
* optionally disable the infowindow and directly trigger the action
* flipping of coordinates (when drawing, google maps generates the lat / lng pairs in reverse order as can be for instance abstracted from GeoJSON format);

## Usage
* API Key:
  * Production: If you want to use the widget in Production a valid Google Maps API key needs to be entered in every widget instance.
  * Development: Developing can be done without an API key, but will show messages on top of the Google Map, making it unusable in Production. 
* Add the Google Maps Polygon widget to your page, see screenshots for Settings in Studio Pro.

* At least configure:

1. Data source: the Mendix objects containing the Polygon/Polyline data
2. Coordinates attribute: required format : ((lat1,long1),(lat2,long2),(lat3,long3),(..)) or [[lat1,long1],[lat2,long2],[lat3,long3],[..]]
3. Color attribute: any simple color (red, green, blue) or hexadecimal (with the #) will suffice;
4. Type attribute: Enum containing values Polygon and Polyline.
5. Infowindow attribute: the string attribute containing the to be displayed name in the infowindow popup

## Demo project
https://googlemapspolygona-sandbox.mxapps.io

## Issues, suggestions and feature requests
None

## Development and contribution
Thanks to the team behind the React Google Maps vis-gl library.

## GoogleMapsPolygon
Displaying and editing Polygons and Polylines within your Mendix application.

Additional features:

Support for all datasources;
Support for all types of on click behavior when clicking on a Polygon / Polyline overlay;
Editability based on Mendix Studio Pro, respecting entity access rights;

## Features

DRAWING
* Drawing, editing and dragging of polygons and polylines
* Multiple holes per polygon supported. Can't be edited directly within Polygon
* Area calculation (in hectares) for polygons
* Undo Redo for drawing
* Validation of format both for polygons as well as holes per polygon

CUSTOMIZATION
* Styling of polygons and polylines can be fully customized; color, stroke weight, opacity etc
* Infowindow popup can be configured as a Mendix dataview hence fully styled to users liking

INTERACTION
* Possibility for static as well as dynamic default location
* Recenter button
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

## Demo project
https://googlemapspolygona-sandbox.mxapps.io

## Issues, suggestions and feature requests
If you are in single object edit mode (so drawing enabled) and you would like changes to for instance color, opacity and stroke weight, to be directly reflecting in the drawn polygon/polyline, an infowindow dataview NEEDS to be placed inside the widget. This will make sure Mendix pushes direct updates to the map.

## Development and contribution
Thanks to the team behind the React Google Maps vis-gl and Terra Draw libraries.

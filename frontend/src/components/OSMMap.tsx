import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';

type Marker = {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  emoji?: string;
};

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  routeTo?: { lat: number; lng: number } | null;
  height?: number | string;
};

export default function OSMMap({ center, zoom = 14, markers = [], routeTo = null, height = '100%' }: Props) {
  const html = useMemo(() => {
    const markersJs = markers
      .map(
        (m, i) =>
          `L.marker([${m.lat},${m.lng}], {icon: L.divIcon({html:'<div style="background:${m.color || '#FFFFFF'};color:#000;border-radius:999px;padding:6px 10px;font-weight:900;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.6);border:2px solid #000">${m.emoji || '📍'}</div>', className:'', iconSize:[32,32]})}).addTo(map).bindPopup(${JSON.stringify(m.label || '')});`,
      )
      .join('\n');

    const routeJs = routeTo
      ? `L.polyline([[${center.lat},${center.lng}],[${routeTo.lat},${routeTo.lng}]], {color:'#FFFFFF',weight:4,dashArray:'8,8'}).addTo(map);`
      : '';

    return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#000000}
.leaflet-tile{filter:grayscale(1) invert(1) contrast(0.9) brightness(0.85)}
.leaflet-container{background:#000000 !important}
.leaflet-control-attribution{background:rgba(28,28,30,.9) !important;color:#8E8E93 !important;font-size:9px !important}
.leaflet-control-attribution a{color:#FFFFFF !important}
</style></head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map',{zoomControl:false,attributionControl:true}).setView([${center.lat},${center.lng}], ${zoom});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19,attribution:'© OSM'}).addTo(map);
${markersJs}
${routeJs}
</script></body></html>`;
  }, [center.lat, center.lng, zoom, JSON.stringify(markers), JSON.stringify(routeTo)]);

  return (
    <View style={[styles.container, { height: height as any }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#000000', overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#000000' },
});

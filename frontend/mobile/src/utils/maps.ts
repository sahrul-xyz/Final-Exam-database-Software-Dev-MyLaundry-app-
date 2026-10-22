export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface MappableOutlet {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: string;
  price: string;
  photo?: string;
  latitude: number;
  longitude: number;
  approximate?: boolean;
}

export type MapProvider = "google" | "osm";

export const DEFAULT_MAP_REGION = {
  latitude: -6.875,
  longitude: 107.601,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export function isValidCoordinate(coord?: {
  latitude?: number | null;
  longitude?: number | null;
} | null): coord is Coordinate {
  if (!coord) return false;
  const { latitude, longitude } = coord;
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function centerForCoordinates(
  coordinates: Coordinate[],
  fallback: Coordinate = {
    latitude: DEFAULT_MAP_REGION.latitude,
    longitude: DEFAULT_MAP_REGION.longitude,
  }
): Coordinate {
  if (coordinates.length === 0) {
    return { latitude: fallback.latitude, longitude: fallback.longitude };
  }

  const latitudes = coordinates.map((c) => c.latitude);
  const longitudes = coordinates.map((c) => c.longitude);

  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

export function regionForCoordinates(
  coordinates: Coordinate[],
  fallback = DEFAULT_MAP_REGION
) {
  if (coordinates.length === 0) return fallback;

  const latitudes = coordinates.map((c) => c.latitude);
  const longitudes = coordinates.map((c) => c.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const centerLatitude = (minLat + maxLat) / 2;
  const centerLongitude = (minLng + maxLng) / 2;

  const latitudeDelta = Math.max((maxLat - minLat) * 1.6, 0.02);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.6, 0.02);

  return {
    latitude: centerLatitude,
    longitude: centerLongitude,
    latitudeDelta,
    longitudeDelta,
  };
}

export function haversineDistanceKm(from: Coordinate, to: Coordinate): number {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);

  const h =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "-";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export interface OutletCoordinateInput {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  name?: string;
  address?: string;
}

const CITY_ANCHORS: {
  keywords: string[];
  latitude: number;
  longitude: number;
}[] = [
  {
    keywords: ["jakarta", "kemang", "kalibata", "pancoran", "passed", "sudirman", "kuningan", "tebet"],
    latitude: -6.2088,
    longitude: 106.8456,
  },
  {
    keywords: ["bandung", "setiabudi", "dago", "coblong", "ciwalk", "pasteur", "sukajadi"],
    latitude: -6.875,
    longitude: 107.601,
  },
  {
    keywords: ["surabaya", "gubeng", "kedungdoro", "wonokromo"],
    latitude: -7.2575,
    longitude: 112.7521,
  },
  {
    keywords: ["malang", "klojen"],
    latitude: -7.9666,
    longitude: 112.6326,
  },
  {
    keywords: ["yogyakarta", "yogya", "malioboro", "dekol"],
    latitude: -7.7956,
    longitude: 110.3695,
  },
  { keywords: ["semarang"], latitude: -6.9667, longitude: 110.4167 },
  { keywords: ["bogor"], latitude: -6.595, longitude: 106.8166 },
  { keywords: ["depok"], latitude: -6.4025, longitude: 106.7942 },
  { keywords: ["bekasi"], latitude: -6.2383, longitude: 106.9756 },
  { keywords: ["tangerang"], latitude: -6.1783, longitude: 106.6319 },
];

function anchorForOutlet(outlet: {
  name?: string;
  address?: string;
}): Coordinate | null {
  const haystack = `${outlet.name ?? ""} ${outlet.address ?? ""}`.toLowerCase();

  if (!haystack.trim()) return null;

  for (const city of CITY_ANCHORS) {
    if (city.keywords.some((keyword) => haystack.includes(keyword))) {
      return { latitude: city.latitude, longitude: city.longitude };
    }
  }

  return null;
}

export function resolveOutletCoordinates<T extends OutletCoordinateInput>(
  outlets: T[],
  fallbackCenter: Coordinate = {
    latitude: DEFAULT_MAP_REGION.latitude,
    longitude: DEFAULT_MAP_REGION.longitude,
  }
): (T & { latitude: number; longitude: number; approximate: boolean })[] {
  const known = outlets.filter((outlet) => isValidCoordinate(outlet));

  const base = centerForCoordinates(
    known.map((outlet) => ({
      latitude: outlet.latitude as number,
      longitude: outlet.longitude as number,
    })),
    fallbackCenter
  );

  const anchorCounters: Record<string, number> = {};

  return outlets.map((outlet) => {
    if (isValidCoordinate(outlet)) {
      return {
        ...outlet,
        latitude: outlet.latitude as number,
        longitude: outlet.longitude as number,
        approximate: false,
      };
    }

    const anchor = anchorForOutlet(outlet);
    const anchorKey = anchor ? "city" : "default";
    const index = anchorCounters[anchorKey] ?? 0;
    anchorCounters[anchorKey] = index + 1;

    const origin = anchor ?? base;
    const angle = (index * 137.508 * Math.PI) / 180;
    const radius = anchor ? 0.004 + index * 0.002 : 0.011 + index * 0.005;

    return {
      ...outlet,
      latitude: origin.latitude + radius * Math.sin(angle),
      longitude: origin.longitude + radius * Math.cos(angle),
      approximate: true,
    };
  });
}

const BASE_STYLE = `
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      body { background: #eaf4ff; font-family: -apple-system, Roboto, sans-serif; overflow: hidden; }
      .mylauncher { border-radius: 12px; overflow: hidden; }
      .myloc { background: transparent; border: none; }
      .myloc-dot { width: 22px; height: 22px; border-radius: 50%; background: #1a73e8; border: 3px solid #ffffff; box-sizing: border-box; box-shadow: 0 1px 5px rgba(9,35,77,.45); }
      .myloc-pulse { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: rgba(26,115,232,.22); }
`;

const SHARED_SCRIPT = `
        function postToApp(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function escapeText(value) {
          return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        }

        function haversineKm(from, to) {
          var R = 6371;
          var rad = function (value) { return value * Math.PI / 180; };
          var dLat = rad(to.lat - from.lat);
          var dLng = rad(to.lng - from.lng);
          var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
          return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
        }

        function formatKm(km) {
          if (!isFinite(km) || km < 0) return '-';
          if (km < 1) return Math.round(km * 1000) + ' m';
          return km.toFixed(1).replace('.', ',') + ' km';
        }

        function distanceLabel(outlet) {
          if (DATA.userLocation) {
            var km = haversineKm(DATA.userLocation, { lat: outlet.lat, lng: outlet.lng });
            return formatKm(km) + ' dari Anda';
          }
          return outlet.distance;
        }

        function infoContent(o) {
          var note = o.approximate
            ? '<div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">Lokasi perkiraan</div>'
            : '';
          var photo = o.photo
            ? '<img src="' + escapeText(o.photo) + '" style="width:100%;height:88px;object-fit:cover;border-radius:10px;margin-bottom:9px;background:#eaf4ff;" />'
            : '';
          return (
            '<div style="min-width:200px;padding:12px 14px;">' +
            photo +
            '<div style="font-size:13px;font-weight:800;color:#09234d;margin-bottom:5px;">' +
            escapeText(o.name) +
            '</div>' +
            '<div style="font-size:11px;color:#64748b;line-height:1.5;margin-bottom:6px;">&#128205; ' +
            escapeText(o.address) +
            '</div>' +
            '<div style="font-size:11px;color:#d98208;font-weight:700;margin-bottom:10px;">&#11088; ' +
            escapeText(o.rating) +
            ' &bull; ' +
            escapeText(distanceLabel(o)) +
            ' &bull; ' +
            escapeText(o.price) +
            '</div>' +
            note +
            '<button data-order="' +
            escapeText(o.id) +
            '" style="background:#0878f9;color:#ffffff;border:none;border-radius:9px;padding:8px 14px;font-size:11px;font-weight:700;">Pesan</button>' +
            '</div>'
          );
        }

        document.addEventListener('click', function (event) {
          var target = event.target;
          if (target && target.getAttribute && target.getAttribute('data-order')) {
            var id = target.getAttribute('data-order');
            postToApp({ type: 'order', id: id });
          }
        });
`;

const GOOGLE_SCRIPT = `
        var map = null;
        var markers = [];
        var outletsById = {};
        var infoWindows = {};
        var userMarker = null;
        var userCircle = null;
        var pickMode = false;
        var userPosition = DATA.userLocation;

        function userIcon() {
          var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26">' +
            '<circle cx="13" cy="13" r="6.5" fill="#1a73e8" stroke="#ffffff" stroke-width="3"/>' +
            '<circle cx="13" cy="13" r="10.5" fill="none" stroke="#1a73e8" stroke-width="2" stroke-opacity="0.35"/>' +
            '</svg>';
          return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(26, 26),
            anchor: new google.maps.Point(13, 13)
          };
        }

        function setUserLocation(position, accuracy) {
          userPosition = position;
          DATA.userLocation = position;
          if (!map) return;

          if (!userMarker) {
            userMarker = new google.maps.Marker({
              map: map,
              position: position,
              title: 'Lokasi Anda',
              zIndex: 999,
              icon: userIcon()
            });
          } else {
            userMarker.setPosition(position);
          }

          Object.keys(infoWindows).forEach(function (id) {
            var entry = infoWindows[id];
            entry.info.setContent(infoContent(entry.outlet));
          });

          if (accuracy && accuracy > 0) {
            if (!userCircle) {
              userCircle = new google.maps.Circle({
                map: map,
                strokeColor: '#1a73e8',
                strokeOpacity: 0.6,
                strokeWeight: 1,
                fillColor: '#1a73e8',
                fillOpacity: 0.15,
                clickable: false
              });
            }
            userCircle.setCenter(position);
            userCircle.setRadius(accuracy);
          } else if (userCircle) {
            userCircle.setMap(null);
            userCircle = null;
          }
        }

        function centerOnUser(zoom) {
          if (!map || !userPosition) return;
          map.panTo(userPosition);
          if (zoom) { map.setZoom(zoom); }
        }

        function init() {
          map = new google.maps.Map(document.getElementById('map'), {
            center: DATA.center,
            zoom: 14,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy'
          });

          var bounds = new google.maps.LatLngBounds();

          DATA.outlets.forEach(function (o, index) {
            outletsById[o.id] = o;
            var position = { lat: o.lat, lng: o.lng };

            var marker = new google.maps.Marker({
              map: map,
              position: position,
              title: o.name,
              label: {
                text: String(index + 1),
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700'
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 16,
                fillColor: '#0878f9',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3
              }
            });

            var info = new google.maps.InfoWindow({ content: infoContent(o) });
            marker.addListener('click', function () {
              info.setContent(infoContent(o));
              info.open({ anchor: marker, map: map });
            });

            infoWindows[o.id] = { info: info, outlet: o };

            markers.push(marker);
            bounds.extend(position);
          });

          if (markers.length > 1) {
            map.fitBounds(bounds, 70);
          } else if (markers.length === 1) {
            map.setView(markers[0].getPosition(), 15);
          } else {
            map.setView(DATA.center, 14);
          }

          google.maps.event.addListener(map, 'click', function (event) {
            if (!pickMode) return;
            var lat = event.latLng.lat();
            var lng = event.latLng.lng();
            setUserLocation({ lat: lat, lng: lng }, 0);
            postToApp({ type: 'userPicked', lat: lat, lng: lng });
          });

          if (DATA.userLocation) {
            setUserLocation(DATA.userLocation, DATA.userAccuracy || 0);
          }

          postToApp({ type: 'ready' });
        }
`;

const OSM_SCRIPT = `
        var map = null;
        var markers = [];
        var outletsById = {};
        var userMarker = null;
        var userCircle = null;
        var pickMode = false;
        var userPosition = DATA.userLocation;

        function setUserLocation(position, accuracy) {
          userPosition = position;
          DATA.userLocation = position;
          if (!map) return;

          if (!userMarker) {
            userMarker = L.marker([position.lat, position.lng], {
              icon: L.divIcon({
                className: 'myloc',
                html: '<div class="myloc-pulse"></div><div class="myloc-dot"></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              }),
              interactive: false,
              keyboard: false,
              zIndexOffset: 1000
            }).addTo(map);
          } else {
            userMarker.setLatLng([position.lat, position.lng]);
          }

          if (accuracy && accuracy > 0) {
            if (!userCircle) {
              userCircle = L.circle([position.lat, position.lng], {
                radius: accuracy,
                color: '#1a73e8',
                weight: 1,
                opacity: 0.6,
                fillColor: '#1a73e8',
                fillOpacity: 0.15,
                interactive: false
              }).addTo(map);
            } else {
              userCircle.setLatLng([position.lat, position.lng]);
              userCircle.setRadius(accuracy);
            }
          } else if (userCircle) {
            map.removeLayer(userCircle);
            userCircle = null;
          }
        }

        function centerOnUser(zoom) {
          if (!map || !userPosition) return;
          map.panTo([userPosition.lat, userPosition.lng]);
          if (zoom) { map.setZoom(zoom); }
        }

        function init() {
          map = L.map('map', { zoomControl: true, attributionControl: true })
            .setView([DATA.center.lat, DATA.center.lng], 14);

          L.tileLayer('${OSM_TILE_URL}', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          var group = [];

          DATA.outlets.forEach(function (o, index) {
            outletsById[o.id] = o;
            var marker = L.marker([o.lat, o.lng], {
              title: o.name,
              bubblingMouseEvents: false,
              icon: L.divIcon({
                className: 'mylauncher',
                html: '<div style="width:30px;height:30px;border-radius:15px;background:#0878f9;border:3px solid #ffffff;color:#ffffff;font:700 13px -apple-system,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(9,35,77,.35);">' +
                      String(index + 1) +
                      '</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              })
            }).addTo(map);

            marker.bindPopup(function () { return infoContent(o); }, { closeButton: false, offset: [0, -6] });
            markers.push(marker);
            group.push([o.lat, o.lng]);
          });

          if (group.length > 1) {
            map.fitBounds(group, { padding: [70, 70] });
          } else if (group.length === 1) {
            map.setView(group[0], 15);
          }

          map.on('click', function (event) {
            if (!pickMode) return;
            var lat = event.latlng.lat;
            var lng = event.latlng.lng;
            setUserLocation({ lat: lat, lng: lng }, 0);
            postToApp({ type: 'userPicked', lat: lat, lng: lng });
          });

          if (DATA.userLocation) {
            setUserLocation(DATA.userLocation, DATA.userAccuracy || 0);
          }

          postToApp({ type: 'ready' });
        }
`;

export function buildMapHtml(options: {
  apiKey: string;
  outlets: MappableOutlet[];
  center?: Coordinate;
  userLocation?: Coordinate | null;
  userAccuracy?: number | null;
  provider?: MapProvider;
}): string {
  const {
    apiKey,
    outlets,
    center = {
      latitude: DEFAULT_MAP_REGION.latitude,
      longitude: DEFAULT_MAP_REGION.longitude,
    },
    userLocation = null,
    userAccuracy = null,
    provider = "google",
  } = options;

  const payload = {
    outlets: outlets.map((o) => ({
      id: o.id,
      name: o.name,
      address: o.address,
      distance: o.distance,
      rating: o.rating,
      price: o.price,
      photo: o.photo ?? "",
      approximate: !!o.approximate,
      lat: o.latitude,
      lng: o.longitude,
    })),
    center: { lat: center.latitude, lng: center.longitude },
    userLocation: userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null,
    userAccuracy: userAccuracy ?? 0,
  };

  const data = JSON.stringify(payload).replace(/</g, "\\u003c");

  const head =
    provider === "google"
      ? `
    <script src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&libraries=geometry"></script>`
      : `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>.leaflet-container { font: inherit; }</style>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`;

  const providerScript = provider === "google" ? GOOGLE_SCRIPT : OSM_SCRIPT;

  const tileSelector =
    provider === "google" ? ".gm-style img" : ".leaflet-tile-loaded";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href="https://localhost/" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <style>${BASE_STYLE}</style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var DATA = ${data};
    </script>${head}
    <script>
      (function () {
        ${SHARED_SCRIPT}
        ${providerScript}

        window.addEventListener('message', function (event) {
          var message = null;
          try {
            message = JSON.parse(event.data);
          } catch (err) {
            return;
          }
          if (!message) return;

          if (message.type === 'userLocation') {
            setUserLocation({ lat: message.lat, lng: message.lng }, message.accuracy || 0);
            if (message.center) { centerOnUser(message.zoom || 16); }
          }

          if (message.type === 'centerUser') {
            centerOnUser(message.zoom || 16);
          }

          if (message.type === 'setPickMode') {
            pickMode = !!message.enabled;
            postToApp({ type: 'pickMode', enabled: pickMode });
          }

          if (message.type === 'focus' && outletsById[message.id]) {
            var target = outletsById[message.id];
            if (map.panTo) { map.panTo({ lat: target.lat, lng: target.lng }); }
            if (map.setZoom) { map.setZoom(16); }
          }
        });

        setTimeout(function () {
          var tiles = document.querySelectorAll('${tileSelector}');
          var loaded = 0;
          for (var i = 0; i < tiles.length; i++) {
            var img = tiles[i];
            if (img.tagName === 'IMG' && img.naturalWidth > 0) { loaded++; }
            else if (img.tagName !== 'IMG') { loaded++; }
          }
          if (loaded === 0) { postToApp({ type: 'tilesFailed' }); }
        }, 6000);

        if (typeof google !== 'undefined' && google.maps) {
          init();
        } else if (typeof L !== 'undefined') {
          init();
        } else {
          window.addEventListener('load', init);
        }
      })();
    </script>
  </body>
</html>`;
}

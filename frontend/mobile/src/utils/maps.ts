export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** Titik tengah default (Kota Bandung) bila lokasi outlet tidak tersedia. */
export const DEFAULT_MAP_REGION = {
  latitude: -6.875,
  longitude: 107.601,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

/** Outlet yang siap ditampilkan sebagai marker pada peta. */
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
}

/** Penyedia peta yang dipakai di dalam WebView. */
export type MapProvider = "google" | "osm";

/** URL tile OpenStreetMap standar (tanpa API key). */
export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/**
 * Memeriksa apakah koordinat valid dan bisa dipakai sebagai marker peta.
 */
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

/**
 * Menghitung titik tengah dari sekumpulan koordinat.
 */
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

/**
 * Menghitung region awal peta agar seluruh marker outlet terlihat.
 */
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

  // Padding minimal agar marker tidak menempel di tepi peta
  const latitudeDelta = Math.max((maxLat - minLat) * 1.6, 0.02);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.6, 0.02);

  return {
    latitude: centerLatitude,
    longitude: centerLongitude,
    latitudeDelta,
    longitudeDelta,
  };
}

/** Meloloskan teks agar aman disisipkan ke dalam HTML/JS. */
function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** CSS dasar yang dipakai bersama oleh kedua penyedia peta. */
const BASE_STYLE = `
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      body { background: #eaf4ff; font-family: -apple-system, Roboto, sans-serif; }
      .mylauncher { border-radius: 12px; overflow: hidden; }
`;

/**
 * Komponen InfoWindow/Popup untuk detail outlet.
 * Tombol "Pesan" mengirim pesan balik ke aplikasi React Native.
 */
function buildInfoContentScript(): string {
  return `
        function infoContent(o) {
          return (
            '<div style="min-width:190px;padding:12px 14px;">' +
            '<div style="font-size:13px;font-weight:800;color:#09234d;margin-bottom:5px;">' +
            escapeText(o.name) +
            '</div>' +
            '<div style="font-size:11px;color:#64748b;line-height:1.5;margin-bottom:6px;">&#128205; ' +
            escapeText(o.address) +
            '</div>' +
            '<div style="font-size:11px;color:#d98208;font-weight:700;margin-bottom:10px;">&#11088; ' +
            escapeText(o.rating) +
            ' &bull; ' +
            escapeText(o.distance) +
            ' &bull; ' +
            escapeText(o.price) +
            '</div>' +
            '<button data-order="' +
            escapeText(o.id) +
            '" style="background:#0878f9;color:#ffffff;border:none;border-radius:9px;padding:8px 14px;font-size:11px;font-weight:700;">Pesan</button>' +
            '</div>'
          );
        }

        function escapeText(value) {
          return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }

        // Delegasi klik untuk tombol "Pesan" di dalam InfoWindow / Popup
        document.addEventListener('click', function (event) {
          var target = event.target;
          if (target && target.getAttribute && target.getAttribute('data-order')) {
            var id = target.getAttribute('data-order');
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'order', id: id })
              );
            }
          }
        });
`;
}

/**
 * Membangun dokumen HTML peta di dalam WebView.
 *
 * - provider "google": Google Maps JavaScript API (butuh API key valid).
 * - provider "osm"   : Leaflet + OpenStreetMap (TIDAK butuh API key).
 *
 * Dipakai WebView (bukan react-native-maps) karena:
 *  - Google Maps SDK native tidak bisa dipakai di Expo Go (API key Expo Go
 *    sudah tidak valid -> peta tampil gelap/hitam).
 *  - WebView hanya butuh internet, sehingga peta selalu tampil di Expo Go,
 *    emulator, maupun build production.
 */
export function buildMapHtml(options: {
  apiKey: string;
  outlets: MappableOutlet[];
  center?: Coordinate;
  userLocation?: Coordinate | null;
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
      lat: o.latitude,
      lng: o.longitude,
    })),
    center: { lat: center.latitude, lng: center.longitude },
    userLocation: userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null,
  };

  // Escape karakter '<' agar payload tidak memutus tag <script>
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

  const initScript =
    provider === "google"
      ? `
        var map = null;
        var markers = [];
        var outletsById = {};
        var userMarker = null;

        function addUserMarker(position) {
          if (!map) return;
          if (userMarker) { userMarker.setPosition(position); return; }
          userMarker = new google.maps.Marker({
            map: map,
            position: position,
            title: 'Lokasi Anda',
            zIndex: 999,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#0878f9',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3
            }
          });
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
              info.open({ anchor: marker, map: map });
            });

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

          if (DATA.userLocation) { addUserMarker(DATA.userLocation); }
        }
`
      : `
        var map = null;
        var markers = [];
        var outletsById = {};
        var userMarker = null;

        function addUserMarker(position) {
          if (!map) return;
          if (userMarker) { userMarker.setLatLng(position); return; }
          userMarker = L.circleMarker([position.lat, position.lng], {
            radius: 7,
            color: '#ffffff',
            weight: 3,
            fillColor: '#0878f9',
            fillOpacity: 1
          }).addTo(map);
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
              icon: L.divIcon({
                className: 'mylauncher',
                html: '<div style="width:30px;height:30px;border-radius:15px;background:#0878f9;border:3px solid #ffffff;color:#ffffff;font:700 13px -apple-system,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(9,35,77,.35);">' +
                      String(index + 1) +
                      '</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              })
            }).addTo(map);

            marker.bindPopup(infoContent(o), { closeButton: false, offset: [0, -6] });
            markers.push(marker);
            group.push([o.lat, o.lng]);
          });

          if (group.length > 1) {
            map.fitBounds(group, { padding: [70, 70] });
          } else if (group.length === 1) {
            map.setView(group[0], 15);
          }

          if (DATA.userLocation) { addUserMarker(DATA.userLocation); }
        }
`;

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
        ${buildInfoContentScript()}
        ${initScript}

        // Pesan dari aplikasi (mis. lokasi pengguna baru diketahui)
        window.addEventListener('message', function (event) {
          try {
            var message = JSON.parse(event.data);
            if (message.type === 'userLocation' && map) {
              addUserMarker({ lat: message.lat, lng: message.lng });
              map.panTo({ lat: message.lat, lng: message.lng });
            }
            if (message.type === 'focus' && map && outletsById[message.id]) {
              var o = outletsById[message.id];
              if (map.panTo) { map.panTo({ lat: o.lat, lng: o.lng }); map.setZoom(16); }
            }
          } catch (err) {
            // abaikan pesan yang tidak valid
          }
        });

        // Deteksi tile gagal dimuat (API key salah / tidak ada internet)
        setTimeout(function () {
          var tiles = document.querySelectorAll('${tileSelector}');
          var loaded = 0;
          for (var i = 0; i < tiles.length; i++) {
            var img = tiles[i];
            if (img.tagName === 'IMG' && img.naturalWidth > 0) { loaded++; }
            else if (img.tagName !== 'IMG') { loaded++; }
          }
          if (loaded === 0 && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'tilesFailed' })
            );
          }
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

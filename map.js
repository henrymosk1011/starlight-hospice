/* Contact page map: our office and the Los Angeles County service area.
   Leaflet (vendor/leaflet, pinned to 1.9.4) loads only when the map comes near the screen. Tiles and map data: OpenStreetMap. */
(function () {
  "use strict";
  var el = document.getElementById("office-map");
  if (!el || !window.Promise) return;
  var root = document.documentElement;
  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  function reduced() { return mq.matches || root.classList.contains("reduce-motion"); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  var fallback = el.querySelector(".map-fallback");
  var msg = el.querySelector(".map-msg");
  if (msg) msg.textContent = "Loading the map.";

  /* Los Angeles County as [lat, lng] rings: the mainland, Santa Catalina, San Clemente, and two harbor pieces.
     Simplified outline from Code for America's click_that_hood project (MIT license). It hides at street level, where the simplification would show. */
  var COUNTY = [
    [[34.0457,-118.9449],[34.075,-118.9408],[34.1682,-118.7889],[34.1679,-118.7234],[34.1682,-118.6682],[34.2404,-118.6677],[34.2404,-118.6325],[34.2634,-118.6325],[34.2918,-118.6368],[34.5058,-118.7419],[34.6554,-118.8159],[34.8019,-118.8868],[34.803,-118.8546],[34.8178,-118.8543],[34.818,-118.7659],[34.8178,-118.4896],[34.8187,-118.44],[34.8201,-118.3087],[34.8202,-118.2041],[34.821,-118.1145],[34.8226,-117.9877],[34.8225,-117.8811],[34.8233,-117.7387],[34.8225,-117.6673],[34.7907,-117.6678],[34.7674,-117.6672],[34.6426,-117.6668],[34.6347,-117.6668],[34.558,-117.667],[34.5578,-117.6603],[34.4528,-117.6598],[34.2892,-117.6464],[34.162,-117.6785],[34.1381,-117.6868],[34.094,-117.7047],[34.0677,-117.7163],[34.0374,-117.7272],[34.0214,-117.7301],[34.0186,-117.7358],[34.0235,-117.7677],[34.0046,-117.7675],[34.0048,-117.7851],[33.9756,-117.8025],[33.9681,-117.7937],[33.9538,-117.7936],[33.9464,-117.7833],[33.9469,-117.852],[33.9461,-117.8881],[33.946,-117.9765],[33.9028,-117.9766],[33.9028,-117.9855],[33.8954,-117.994],[33.8881,-117.9941],[33.8809,-118.0026],[33.8809,-118.0114],[33.8733,-118.0114],[33.8732,-118.0287],[33.8662,-118.0286],[33.8624,-118.0375],[33.8499,-118.0504],[33.8461,-118.0589],[33.8352,-118.059],[33.8315,-118.0635],[33.8196,-118.0632],[33.8151,-118.0726],[33.8032,-118.0846],[33.7961,-118.0867],[33.7765,-118.0991],[33.7683,-118.0937],[33.7585,-118.092],[33.7476,-118.1122],[33.7465,-118.1141],[33.7459,-118.1148],[33.7522,-118.1085],[33.7606,-118.1222],[33.7555,-118.1316],[33.7573,-118.147],[33.7635,-118.1754],[33.7596,-118.191],[33.7534,-118.1922],[33.7329,-118.1852],[33.7363,-118.2024],[33.7508,-118.2069],[33.7701,-118.2269],[33.7657,-118.2456],[33.7704,-118.2507],[33.7531,-118.2674],[33.7513,-118.2738],[33.7382,-118.2787],[33.7204,-118.2711],[33.7138,-118.2846],[33.7092,-118.2828],[33.7047,-118.2945],[33.7099,-118.2984],[33.7272,-118.3513],[33.7373,-118.3608],[33.7423,-118.3819],[33.7361,-118.3981],[33.7431,-118.411],[33.7713,-118.4224],[33.7745,-118.4283],[33.7865,-118.4187],[33.7918,-118.407],[33.7974,-118.4076],[33.8054,-118.3934],[33.8193,-118.3905],[33.8378,-118.3908],[33.856,-118.4007],[33.8663,-118.404],[33.9097,-118.4257],[33.9588,-118.4537],[33.961,-118.4595],[33.9713,-118.4624],[33.9901,-118.4787],[34.0147,-118.5033],[34.0308,-118.5262],[34.0388,-118.546],[34.0378,-118.5543],[34.0416,-118.5701],[34.0375,-118.5845],[34.0395,-118.5948],[34.0364,-118.6099],[34.0379,-118.6233],[34.0362,-118.6362],[34.0391,-118.665],[34.0359,-118.6781],[34.0307,-118.6827],[34.0322,-118.6966],[34.0295,-118.7066],[34.0331,-118.7355],[34.0323,-118.7446],[34.0257,-118.7561],[34.0223,-118.782],[34.0169,-118.7899],[34.0076,-118.7942],[34.0017,-118.8087],[34.0161,-118.8242],[34.0281,-118.8412],[34.0344,-118.8541],[34.0382,-118.8769],[34.0416,-118.9155],[34.046,-118.9253],[34.0432,-118.9371]],
    [[33.4274,-118.4311],[33.4271,-118.4209],[33.416,-118.3961],[33.4177,-118.3891],[33.4104,-118.3829],[33.4066,-118.3676],[33.3911,-118.3694],[33.3713,-118.3498],[33.3587,-118.3319],[33.343,-118.3239],[33.3436,-118.3172],[33.3301,-118.307],[33.3205,-118.3034],[33.309,-118.3047],[33.2991,-118.3254],[33.303,-118.3383],[33.3145,-118.3557],[33.3199,-118.3738],[33.3211,-118.4064],[33.3171,-118.423],[33.3186,-118.441],[33.3261,-118.4655],[33.3446,-118.4822],[33.3566,-118.4887],[33.3759,-118.4795],[33.3864,-118.4786],[33.4179,-118.4873],[33.4215,-118.4984],[33.428,-118.5068],[33.4257,-118.516],[33.4308,-118.5231],[33.429,-118.5327],[33.4347,-118.5372],[33.4359,-118.5498],[33.433,-118.5566],[33.4406,-118.5745],[33.4672,-118.5939],[33.4756,-118.5795],[33.4731,-118.5508],[33.4763,-118.5384],[33.4618,-118.5223],[33.4534,-118.5053],[33.4411,-118.4936],[33.4484,-118.4774],[33.442,-118.4722],[33.4327,-118.4493],[33.4281,-118.4429]],
    [[33.0031,-118.5501],[32.9915,-118.5464],[32.9804,-118.5393],[32.9639,-118.5202],[32.9528,-118.5139],[32.9328,-118.496],[32.9237,-118.4857],[32.9144,-118.4674],[32.8953,-118.4469],[32.8677,-118.4084],[32.8568,-118.3968],[32.8394,-118.3701],[32.8183,-118.3506],[32.8198,-118.371],[32.8247,-118.3807],[32.8244,-118.3937],[32.8204,-118.4014],[32.8119,-118.4037],[32.8039,-118.4284],[32.8151,-118.4329],[32.8193,-118.4495],[32.831,-118.4609],[32.8343,-118.4696],[32.8414,-118.475],[32.8441,-118.4889],[32.8518,-118.4996],[32.8632,-118.5026],[32.871,-118.5083],[32.8768,-118.5066],[32.8832,-118.5167],[32.9161,-118.5404],[32.9329,-118.5494],[32.9451,-118.5512],[32.9563,-118.5585],[32.9692,-118.5736],[32.9863,-118.5766],[32.9936,-118.5822],[33.0104,-118.5882],[33.0154,-118.5961],[33.0147,-118.6065],[33.0301,-118.6053],[33.035,-118.5925],[33.0286,-118.5859],[33.0338,-118.5751],[33.024,-118.5636],[33.0191,-118.5648],[33.006,-118.5593]],
    [[33.7264,-118.2695],[33.7407,-118.2747],[33.7486,-118.27],[33.7595,-118.2578],[33.7684,-118.2254],[33.7568,-118.2248],[33.751,-118.2443],[33.7456,-118.2541],[33.7376,-118.2513]],
    [[33.7337,-118.241],[33.7278,-118.237],[33.7236,-118.2511],[33.7289,-118.2582]]
  ];

  function load(src) {
    return new Promise(function (resolve, reject) {
      var css = /\.css$/.test(src), n = document.createElement(css ? "link" : "script");
      n.onload = resolve; n.onerror = reject;
      if (css) { n.rel = "stylesheet"; n.href = src; document.head.insertBefore(n, document.querySelector('link[href="styles.css"]')); }
      else { n.src = src; document.body.appendChild(n); }
    });
  }

  function fail() {
    if (fallback && !el.contains(fallback)) { el.textContent = ""; el.appendChild(fallback); }
    if (msg) msg.textContent = "The map could not load.";
  }

  function announce(text) {
    var status = document.getElementById("map-status");
    if (!status) return;
    status.textContent = "";
    setTimeout(function () { status.textContent = text; }, 60);
  }

  function init() {
    var L = window.L;
    var office = [parseFloat(el.getAttribute("data-lat")), parseFloat(el.getAttribute("data-lng"))];
    var home = parseFloat(el.getAttribute("data-zoom")) || 14;
    var touch = window.matchMedia("(pointer: coarse)").matches;
    el.textContent = "";

    var map = L.map(el, {
      center: office, zoom: home, minZoom: 7, maxZoom: 18, zoomSnap: 0.5,
      zoomControl: false,
      /* The page keeps scrolling when a mouse wheel passes over the map */
      scrollWheelZoom: false,
      /* On touch screens one finger scrolls the page and two fingers move or zoom the map */
      dragging: !touch
    });

    /* Reduced motion: every pan and zoom jumps instead of gliding, including keyboard, double click, and inertia after a drag */
    ["setView", "panBy"].forEach(function (name) {
      var fn = map[name], at = name === "setView" ? 2 : 1;
      map[name] = function () {
        var args = Array.prototype.slice.call(arguments);
        if (reduced()) args[at] = L.extend({}, args[at], { animate: false });
        return fn.apply(map, args);
      };
    });
    map.on("dragstart", function () { map.options.inertia = !reduced(); });
    /* Leaflet checks this flag for every tile, so the tile fade follows the Reduce motion switch */
    Object.defineProperty(map, "_fadeAnimated", { get: function () { return !reduced(); } });

    map.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var area = L.polygon(COUNTY.map(function (ring) { return [ring]; }), {
      color: "#283891", weight: 2, dashArray: "7 6", fillColor: "#283891", fillOpacity: 0.08, interactive: false
    });
    var areaBounds = L.latLngBounds(COUNTY[0]);

    L.marker(office, {
      interactive: false, keyboard: false,
      icon: L.divIcon({
        className: "map-pin", iconSize: [44, 44], iconAnchor: [22, 22],
        html: '<span class="map-pin-dot"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg></span><span class="map-pin-label">Starlight Hospice</span>'
      })
    }).addTo(map);

    var zoomIn = document.querySelector('[data-map-zoom="in"]'), zoomOut = document.querySelector('[data-map-zoom="out"]');
    function sync() {
      var z = map.getZoom();
      if (z < 12) area.addTo(map); else area.remove();
      if (zoomIn) zoomIn.setAttribute("aria-disabled", z >= map.getMaxZoom() ? "true" : "false");
      if (zoomOut) zoomOut.setAttribute("aria-disabled", z <= map.getMinZoom() ? "true" : "false");
    }
    map.on("zoomend", sync);
    sync();

    /* Buttons give every drag and pinch a single pointer alternative (WCAG 2.5.1 and 2.5.7) */
    $$("[data-map-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-map-view") === "area") {
          if (reduced()) map.fitBounds(areaBounds, { padding: [16, 16] });
          else map.flyToBounds(areaBounds, { padding: [16, 16], duration: 1.2 });
          announce("Showing Los Angeles County, our service area.");
        } else {
          if (reduced()) map.setView(office, home);
          else map.flyTo(office, home, { duration: 1.2 });
          announce("Showing our office in Burbank.");
        }
      });
    });
    $$("[data-map-pan]").forEach(function (b) {
      var d = b.getAttribute("data-map-pan").split(",").map(Number);
      b.addEventListener("click", function () {
        var s = map.getSize();
        map.panBy([d[0] * Math.round(s.x / 3), d[1] * Math.round(s.y / 3)]);
      });
    });
    if (zoomIn) zoomIn.addEventListener("click", function () { map.zoomIn(); });
    if (zoomOut) zoomOut.addEventListener("click", function () { map.zoomOut(); });

    /* Keyboard focus coming up from the controls below: show the map's top edge at once instead of gliding with it under the header */
    el.addEventListener("focus", function () {
      var keyboard = true;
      try { keyboard = el.matches(":focus-visible"); } catch (e) { /* older browsers */ }
      if (keyboard && el.getBoundingClientRect().top < (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0)) el.scrollIntoView({ block: "nearest", behavior: "instant" });
    });

    /* Text size and spacing changes can resize the map without a window resize */
    if ("ResizeObserver" in window) new ResizeObserver(function () { map.invalidateSize({ pan: false }); }).observe(el);

    $$(".map-tools, .map-notes").forEach(function (n) { n.hidden = false; });
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    Promise.all([load("vendor/leaflet/leaflet.css"), load("vendor/leaflet/leaflet.js")]).then(init).catch(fail);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
  } else { start(); }
})();

(function () {
  "use strict";

  var section = document.getElementById("destinations");
  var data = window.AMS_DESTINATION_DATA;
  if (!section || !data) return;

  var modeInputs = section.querySelectorAll('input[name="deMode"]');
  var domesticPanel = document.getElementById("deDomesticPanel");
  var internationalPanel = document.getElementById("deInternationalPanel");
  var status = document.getElementById("deStatus");
  var mapMount = document.getElementById("deMap");
  var stateSelect = document.getElementById("deStateSelect");
  var overview = document.getElementById("deOverview");
  var current = document.getElementById("deCurrent");
  var currentName = document.getElementById("deCurrentName");
  var currentType = document.getElementById("deCurrentType");
  var currentCount = document.getElementById("deCurrentCount");
  var regionCards = document.getElementById("deRegionCards");
  var regionDetail = document.getElementById("deRegionDetail");
  var changeRegion = document.getElementById("deChangeRegion");

  var countrySearch = document.getElementById("deCountrySearch");
  var countryList = document.getElementById("deCountryList");
  var countryResult = document.getElementById("deCountryResult");
  var countryName = document.getElementById("deCountryName");
  var countryCards = document.getElementById("deCountryCards");
  var countryDetail = document.getElementById("deCountryDetail");
  var countryEmpty = document.getElementById("deCountryEmpty");
  var countryEmptyName = document.getElementById("deCountryEmptyName");
  var coverage = document.getElementById("deCoverage");
  var changeCountry = document.getElementById("deChangeCountry");
  var intlIntro = document.getElementById("deIntlIntro");

  if (!domesticPanel || !internationalPanel || !mapMount || !stateSelect || !countryList || !countryResult) return;

  var state = { mode: "domestic", region: null, destination: null, country: null };
  var regionById = {};
  var countryByCode = {};
  (data.india || []).forEach(function (region) { regionById[region.id] = region; });
  (data.countries || []).forEach(function (country) { countryByCode[country.code] = country; });

  function setStatus(text) {
    if (status) status.textContent = text;
  }
  function curatedCount(list) { return Array.isArray(list) ? list.length : 0; }
  function contextFor(item, region) {
    return (item.city || region.name);
  }
  function sourceHost(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return "source"; }
  }

  function renderDetail(detail, item, context) {
    if (!detail) return;
    detail.hidden = false;
    detail.textContent = "";
    var heading = document.createElement("h4");
    heading.textContent = item.name;
    var contextLine = document.createElement("p");
    contextLine.className = "de-card-context";
    contextLine.textContent = context;
    var description = document.createElement("p");
    description.textContent = item.description;
    var source = document.createElement("span");
    source.className = "de-detail-source";
    source.textContent = "Source: " + sourceHost(item.source);
    var link = document.createElement("a");
    link.className = "de-link";
    link.href = "#inquiry";
    link.textContent = "Plan this trip ↗";
    detail.appendChild(heading);
    detail.appendChild(contextLine);
    detail.appendChild(description);
    detail.appendChild(source);
    detail.appendChild(link);
  }

  function clearDetail(detail) {
    if (!detail) return;
    detail.hidden = true;
    detail.textContent = "";
  }

  function renderCards(host, destinations, region, onSelect) {
    host.textContent = "";
    (destinations || []).forEach(function (item, index) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "de-card";
      card.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-label", item.name + ", " + item.category + ". View destination details");

      var category = document.createElement("span");
      category.className = "de-card-cat";
      category.textContent = item.category;
      var title = document.createElement("h4");
      title.textContent = item.name;
      var context = document.createElement("p");
      context.className = "de-card-context";
      context.textContent = contextFor(item, region);
      var description = document.createElement("p");
      description.textContent = item.description;

      card.appendChild(category);
      card.appendChild(title);
      card.appendChild(context);
      card.appendChild(description);
      card.addEventListener("click", function () {
        var cards = host.querySelectorAll(".de-card");
        Array.prototype.forEach.call(cards, function (other) { other.setAttribute("aria-pressed", "false"); });
        card.setAttribute("aria-pressed", "true");
        onSelect(item, index);
      });
      host.appendChild(card);
    });
  }

  function buildStateOptions() {
    if (!stateSelect) return;
    stateSelect.textContent = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a state or union territory";
    stateSelect.appendChild(placeholder);
    (data.india || []).forEach(function (region) {
      var option = document.createElement("option");
      option.value = region.id;
      option.textContent = region.name + " · " + region.type;
      stateSelect.appendChild(option);
    });
  }

  function updateMapSelection(id) {
    var regions = mapMount.querySelectorAll("[data-region], [data-region-alias]");
    Array.prototype.forEach.call(regions, function (element) {
      var regionId = element.getAttribute("data-region") || element.getAttribute("data-region-alias");
      element.setAttribute("aria-pressed", regionId === id ? "true" : "false");
    });
  }

  function selectRegion(id) {
    var region = regionById[id];
    if (!region) return;
    state.region = id;
    state.destination = null;
    stateSelect.value = id;
    updateMapSelection(id);
    if (overview) overview.hidden = true;
    if (current) current.hidden = false;
    currentName.textContent = region.name;
    currentType.textContent = region.type;
    currentCount.textContent = curatedCount(region.destinations) + " curated destinations";
    renderCards(regionCards, region.destinations, region, function (item) {
      renderDetail(regionDetail, item, region.name + ", " + region.type);
    });
    clearDetail(regionDetail);
    setStatus("Domestic · " + region.name + " selected · " + curatedCount(region.destinations) + " curated destinations.");
  }

  function resetRegion(focus) {
    state.region = null;
    state.destination = null;
    stateSelect.value = "";
    updateMapSelection("");
    if (current) current.hidden = true;
    if (currentName) currentName.textContent = "";
    if (currentType) currentType.textContent = "";
    if (currentCount) currentCount.textContent = "";
    if (overview) overview.hidden = false;
    if (regionCards) regionCards.textContent = "";
    clearDetail(regionDetail);
    setStatus("Domestic · choose a state or union territory to explore its curated destinations.");
    if (focus && stateSelect) stateSelect.focus({ preventScroll: true });
  }

  function loadMap() {
    if (mapMount.getAttribute("data-loaded") === "true") return;
    fetch("assets/india-states-uts.svg")
      .then(function (response) {
        if (!response.ok) throw new Error("map load failed");
        return response.text();
      })
      .then(function (text) {
        var parsed = new DOMParser().parseFromString(text, "image/svg+xml");
        if (parsed.querySelector("parsererror")) throw new Error("map parse failed");
        var svg = parsed.documentElement;
        svg.setAttribute("class", "de-svg");
        svg.setAttribute("role", "group");
        svg.setAttribute("aria-label", "Interactive map of India states and union territories");

        var nodes = svg.querySelectorAll("[id]");
        Array.prototype.forEach.call(nodes, function (node) {
          var id = node.getAttribute("id");
          var canonical = id === "dd" ? "dn" : id;
          var region = regionById[canonical];
          if (!region) return;
          if (canonical === id) node.setAttribute("data-region", canonical);
          else node.setAttribute("data-region-alias", canonical);
          node.setAttribute("role", "button");
          node.setAttribute("tabindex", "0");
          node.setAttribute("aria-label", "Select " + region.name + ", " + region.type.toLowerCase());
          node.setAttribute("aria-pressed", "false");
        });

        mapMount.replaceChildren(document.importNode(svg, true));
        Array.prototype.forEach.call(mapMount.querySelectorAll("[data-region], [data-region-alias]"), function (node) {
          var canonical = node.getAttribute("data-region") || node.getAttribute("data-region-alias");
          node.addEventListener("click", function () { selectRegion(canonical); });
          node.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
              event.preventDefault();
              selectRegion(canonical);
            }
          });
        });
        mapMount.setAttribute("data-loaded", "true");
        if (state.region) updateMapSelection(state.region);
      })
      .catch(function () {
        mapMount.textContent = "The interactive map is unavailable. Use the state and union territory selector below.";
        mapMount.setAttribute("data-loaded", "error");
      });
  }

  function buildCountries() {
    countryList.textContent = "";
    (data.countries || []).forEach(function (country) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "de-country";
      button.setAttribute("data-country", country.code);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Select " + country.name);

      var flag = document.createElement("span");
      flag.className = "de-flag";
      flag.setAttribute("aria-hidden", "true");
      flag.textContent = country.flag;
      var name = document.createElement("span");
      name.className = "de-country-name";
      name.textContent = country.name;
      var code = document.createElement("span");
      code.className = "de-country-code";
      code.setAttribute("aria-hidden", "true");
      code.textContent = country.code;

      button.appendChild(flag);
      button.appendChild(name);
      button.appendChild(code);
      button.addEventListener("click", function () { selectCountry(country.code); });
      button.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          selectCountry(country.code);
        }
      });
      countryList.appendChild(button);
    });
  }

  function updateCountrySelection(code) {
    Array.prototype.forEach.call(countryList.querySelectorAll(".de-country"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-country") === code ? "true" : "false");
    });
  }

  function selectCountry(code) {
    var country = countryByCode[code];
    if (!country) return;
    state.country = code;
    state.destination = null;
    updateCountrySelection(code);
    if (intlIntro) intlIntro.hidden = true;
    countryResult.hidden = false;
    countryName.textContent = country.name;
    countryCards.textContent = "";
    clearDetail(countryDetail);
    var guide = (data.international || {})[code];
    var destinations = guide && guide.destinations;
    if (destinations && destinations.length) {
      countryEmpty.hidden = true;
      renderCards(countryCards, destinations, { name: country.name }, function (item) {
        renderDetail(countryDetail, item, country.name);
      });
      setStatus("International · " + country.name + " selected · " + destinations.length + " curated destinations.");
    } else {
      countryEmpty.hidden = false;
      countryEmptyName.textContent = country.name;
      setStatus("International · " + country.name + " selected · destination guide coming soon.");
    }
  }

  function resetCountry(focus) {
    state.country = null;
    state.destination = null;
    updateCountrySelection("");
    if (intlIntro) intlIntro.hidden = false;
    countryResult.hidden = true;
    countryCards.textContent = "";
    clearDetail(countryDetail);
    if (countryEmpty) countryEmpty.hidden = true;
    if (countrySearch) countrySearch.value = "";
    Array.prototype.forEach.call(countryList.querySelectorAll(".de-country"), function (button) { button.hidden = false; });
    setStatus("International · search or browse countries to explore curated destination guides.");
    if (focus && countrySearch) countrySearch.focus({ preventScroll: true });
  }

  function filterCountries() {
    var query = (countrySearch.value || "").trim().toLowerCase();
    var visible = 0;
    Array.prototype.forEach.call(countryList.querySelectorAll(".de-country"), function (button) {
      var country = countryByCode[button.getAttribute("data-country")];
      var haystack = (country.name + " " + country.code).toLowerCase();
      button.hidden = query.length > 0 && haystack.indexOf(query) === -1;
      if (!button.hidden) visible++;
    });
    setStatus("International · " + visible + " of " + (data.countries || []).length + " countries match “" + countrySearch.value + "”.");
  }

  function switchMode(mode) {
    state.mode = mode;
    domesticPanel.hidden = mode !== "domestic";
    internationalPanel.hidden = mode !== "international";
    if (mode === "domestic") {
      loadMap();
      setStatus(state.region
        ? "Domestic · " + regionById[state.region].name + " selected."
        : "Domestic · choose a state or union territory to explore its curated destinations.");
    } else {
      if (regionCards) regionCards.textContent = "";
      clearDetail(regionDetail);
      setStatus(state.country
        ? "International · " + countryByCode[state.country].name + " selected."
        : "International · search or browse countries to explore curated destination guides.");
    }
  }

  buildStateOptions();
  buildCountries();
  if (coverage) {
    coverage.textContent = "Verified curated guides: " + Object.keys(data.international || {}).length +
      " of " + (data.countries || []).length + " countries. Each guide is selective, not exhaustive.";
  }

  Array.prototype.forEach.call(modeInputs, function (input) {
    input.addEventListener("change", function () { if (input.checked) switchMode(input.value); });
  });
  stateSelect.addEventListener("change", function () {
    if (stateSelect.value) selectRegion(stateSelect.value); else resetRegion(false);
  });
  if (changeRegion) changeRegion.addEventListener("click", function () { resetRegion(true); });
  if (changeCountry) changeCountry.addEventListener("click", function () { resetCountry(true); });
  if (countrySearch) countrySearch.addEventListener("input", filterCountries);

  switchMode("domestic");
})();

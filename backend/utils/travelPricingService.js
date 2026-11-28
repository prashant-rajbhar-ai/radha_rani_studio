const REQUEST_TIMEOUT_MS = 6000;
const GEOCODE_CACHE_LIMIT = 1000;
const geocodeCache = new Map();

function readEnvNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '')
    return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// All distance limits are one-way road km from your studio pin.
// Rate is ₹12.50 per km each way (effectively ₹25 per extra one-way km for the round trip).
const FREE_RADIUS_KM = readEnvNumber('TRAVEL_FREE_KM', 25);
const MAX_SERVICE_KM = readEnvNumber('TRAVEL_MAX_KM', 200);
const RATE_PER_KM_EACH_WAY = readEnvNumber('TRAVEL_RATE_PER_KM_EACH_WAY', 12.5);
const ROUND_TRIP_RATE_PER_ONE_WAY_KM = RATE_PER_KM_EACH_WAY * 2;
const ROAD_FALLBACK_MULTIPLIER = 1.25;

const NOT_AVAILABLE_MESSAGE =
  'We are not currently available in this location.';

function getStudioCoordinates() {
  const lat = Number(process.env.STUDIO_LAT);
  const lng = Number(process.env.STUDIO_LNG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      'Studio coordinates (STUDIO_LAT, STUDIO_LNG) are not configured.',
    );
  }
  return { lat, lng };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function setCachedCoords(key, value) {
  if (geocodeCache.size >= GEOCODE_CACHE_LIMIT) {
    const oldestKey = geocodeCache.keys().next().value;
    geocodeCache.delete(oldestKey);
  }
  geocodeCache.set(key, value);
}

async function queryNominatim(params) {
  const query = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'in',
    ...params,
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${query.toString()}`,
    {
      headers: {
        'User-Agent': 'RadhaRaniStudio/1.0 (https://radharanistudio.in)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) return null;
  const results = await response.json().catch(() => []);
  if (!Array.isArray(results) || !results.length) return null;

  const lat = Number(results[0].lat);
  const lng = Number(results[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

async function lookupPostalPinInfo(pinCode) {
  if (!/^[1-9]\d{5}$/.test(pinCode)) return null;
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${encodeURIComponent(pinCode)}`,
      {
        headers: {
          'User-Agent': 'RadhaRaniStudio/1.0 (https://radharanistudio.in)',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!response.ok) return null;
    const data = await response.json().catch(() => []);
    const entry = Array.isArray(data) ? data[0] : null;
    const postOffice =
      entry?.Status === 'Success' && Array.isArray(entry.PostOffice)
        ? entry.PostOffice[0]
        : null;
    if (!postOffice) return null;

    return {
      officeName: String(postOffice.Name || '').trim(),
      district: String(postOffice.District || '').trim(),
      state: String(postOffice.State || '').trim(),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Resolves Indian venue location using specific locality/district/PIN first,
 * with India Post PIN lookup and PIN fallback.
 */
async function geocodeEventLocation({ pinCode, locality, district, state }) {
  const cleanPin = String(pinCode || '').trim();
  const cleanLocality = String(locality || '').trim();
  const cleanDistrict = String(district || '').trim();
  const cleanState = String(state || '').trim();

  const cacheKey = [
    cleanPin,
    cleanLocality.toLowerCase(),
    cleanDistrict.toLowerCase(),
    cleanState.toLowerCase(),
  ].join('|');

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  let coords = null;
  const pinInfo = /^[1-9]\d{5}$/.test(cleanPin)
    ? await lookupPostalPinInfo(cleanPin)
    : null;

  // 1. Most specific query: locality + district + state + PIN
  if ((cleanLocality || cleanDistrict) && /^[1-9]\d{5}$/.test(cleanPin)) {
    coords = await queryNominatim({
      q: [cleanLocality, cleanDistrict, cleanState, cleanPin, 'India']
        .filter(Boolean)
        .join(', '),
    });
  }

  // 2. Locality + district + state
  if (!coords && cleanLocality && cleanDistrict) {
    coords = await queryNominatim({
      q: [cleanLocality, cleanDistrict, cleanState, 'India']
        .filter(Boolean)
        .join(', '),
    });
  }

  // 3. India Post office/district lookup for the PIN code
  if (!coords && pinInfo) {
    coords = await queryNominatim({
      q: [
        cleanLocality || pinInfo.officeName,
        cleanDistrict || pinInfo.district,
        cleanState || pinInfo.state,
        cleanPin,
        'India',
      ]
        .filter(Boolean)
        .join(', '),
    });
  }

  // 4. Direct PIN code lookup
  if (!coords && /^[1-9]\d{5}$/.test(cleanPin)) {
    coords = await queryNominatim({ postalcode: cleanPin });
  }

  // 5. District + state fallback
  if (!coords && (cleanDistrict || pinInfo?.district)) {
    coords = await queryNominatim({
      q: [
        cleanDistrict || pinInfo?.district,
        cleanState || pinInfo?.state,
        'India',
      ]
        .filter(Boolean)
        .join(', '),
    });
  }

  // 6. Studio coordinate fallback for studio PIN (221706) when external geocoders block/miss
  if (!coords && cleanPin === '221706') {
    const studioCoords = getStudioCoordinates();
    coords = { lat: studioCoords.lat, lng: studioCoords.lng };
  }

  if (coords) {
    setCachedCoords(cacheKey, coords);
  }
  return coords;
}

/**
 * Computes one-way road driving distance via OSRM, falling back to road-adjusted Haversine.
 */
async function getRoadDistanceKm(origin, destination) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RadhaRaniStudio/1.0 (https://radharanistudio.in)',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const meters = data?.routes?.[0]?.distance;
      if (Number.isFinite(meters) && meters >= 0) {
        return Math.round((meters / 1000) * 10) / 10;
      }
    }
  } catch (error) {
    // Fall back to road-adjusted straight-line distance so checkout never stalls.
  }

  const straightKm = haversineKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
  );
  return Math.round(straightKm * ROAD_FALLBACK_MULTIPLIER * 10) / 10;
}

/**
 * Transparent unified per-km pricing across all modes of transport:
 * - 0 to 25 km (one-way): ₹0
 * - > 25 km to 200 km (one-way): ₹12.50/km each way (= ₹25/km for the round trip)
 * - > 200 km (one-way): Not serviceable
 */
function calculateTravelCharge(distanceKm) {
  if (distanceKm <= FREE_RADIUS_KM) {
    return {
      available: true,
      tier: 'free',
      extraOneWayKm: 0,
      extraRoundTripKm: 0,
      ratePerKmEachWay: RATE_PER_KM_EACH_WAY,
      roundTripRatePerOneWayKm: ROUND_TRIP_RATE_PER_ONE_WAY_KM,
      travelCharge: 0,
      message: `Within our ${FREE_RADIUS_KM} km free travel range. No travel cost applies.`,
    };
  }

  if (distanceKm > MAX_SERVICE_KM) {
    return {
      available: false,
      tier: 'not_serviceable',
      extraOneWayKm: 0,
      extraRoundTripKm: 0,
      ratePerKmEachWay: RATE_PER_KM_EACH_WAY,
      roundTripRatePerOneWayKm: ROUND_TRIP_RATE_PER_ONE_WAY_KM,
      travelCharge: 0,
      message: NOT_AVAILABLE_MESSAGE,
    };
  }

  const extraOneWayKm = Math.round((distanceKm - FREE_RADIUS_KM) * 10) / 10;
  const extraRoundTripKm = Math.round(extraOneWayKm * 2 * 10) / 10;
  const travelCharge = Math.round(extraRoundTripKm * RATE_PER_KM_EACH_WAY);
  const formattedRate = Number.isInteger(RATE_PER_KM_EACH_WAY)
    ? String(RATE_PER_KM_EACH_WAY)
    : RATE_PER_KM_EACH_WAY.toFixed(2);

  return {
    available: true,
    tier: 'chargeable',
    extraOneWayKm,
    extraRoundTripKm,
    ratePerKmEachWay: RATE_PER_KM_EACH_WAY,
    roundTripRatePerOneWayKm: ROUND_TRIP_RATE_PER_ONE_WAY_KM,
    travelCharge,
    message: `Travel cost of ₹${travelCharge.toLocaleString('en-IN')} applies (${extraRoundTripKm} km round-trip beyond our ${FREE_RADIUS_KM} km free range at ₹${formattedRate}/km each way).`,
  };
}

async function evaluateTravelForLocation(eventLocation = {}) {
  const studioCoords = getStudioCoordinates();
  const destinationCoords = await geocodeEventLocation(eventLocation);

  if (!destinationCoords) {
    return {
      available: false,
      tier: 'unresolved',
      distanceKm: null,
      extraOneWayKm: 0,
      extraRoundTripKm: 0,
      ratePerKmEachWay: RATE_PER_KM_EACH_WAY,
      roundTripRatePerOneWayKm: ROUND_TRIP_RATE_PER_ONE_WAY_KM,
      travelCharge: 0,
      freeRadiusKm: FREE_RADIUS_KM,
      maxServiceKm: MAX_SERVICE_KM,
      message:
        'We could not locate this PIN code and district. Please check your event address details.',
    };
  }

  const distanceKm = await getRoadDistanceKm(studioCoords, destinationCoords);
  const pricing = calculateTravelCharge(distanceKm);

  return {
    ...pricing,
    distanceKm,
    freeRadiusKm: FREE_RADIUS_KM,
    maxServiceKm: MAX_SERVICE_KM,
  };
}

module.exports = {
  FREE_RADIUS_KM,
  MAX_SERVICE_KM,
  RATE_PER_KM_EACH_WAY,
  ROUND_TRIP_RATE_PER_ONE_WAY_KM,
  NOT_AVAILABLE_MESSAGE,
  calculateTravelCharge,
  evaluateTravelForLocation,
};

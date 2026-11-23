'use strict';

// Exact Apps Script deployment currently used by the production site.
const FALLBACK_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbws7-JF8PELXJtPO_cBAC9bwV7fXlJB5cy4QYI9QDm4Ef4XFznVyDw4KYhQPKmz2DqZlA/exec';
const ENQUIRY_FIELDS = ['name', 'email', 'phone', 'website'];
const DEFAULT_TIMEOUT_MS = 8000;

function respond(res, status, payload, extraHeaders) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function (key) { res.setHeader(key, extraHeaders[key]); });
  }
  return res.status(status).json(payload);
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseBody(req) {
  let raw = req.body;
  if (isPlainObject(raw)) return raw;
  if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
  if (typeof raw !== 'string') return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function validEnquiry(body) {
  if (!isPlainObject(body)) return false;
  const keys = Object.keys(body);
  if (keys.length !== ENQUIRY_FIELDS.length) return false;
  if (!ENQUIRY_FIELDS.every(function (key) { return Object.prototype.hasOwnProperty.call(body, key); })) return false;
  if (typeof body.website !== 'string') return false;
  return ENQUIRY_FIELDS.slice(0, 3).every(function (key) {
    return typeof body[key] === 'string' && body[key].trim().length > 0;
  });
}

function timeoutMs() {
  const configured = parseInt(process.env.APPS_SCRIPT_TIMEOUT_MS, 10);
  if (Number.isFinite(configured) && configured > 0 && configured <= 30000) return configured;
  return DEFAULT_TIMEOUT_MS;
}

function firstString(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 300) : '';
}

function classify(payload) {
  if (!isPlainObject(payload)) return 502;
  if (payload.success === true) return 200;

  const text = [payload.error, payload.reason, payload.message, payload.code]
    .map(firstString).join(' ').toLowerCase();

  if (payload.duplicate === true || payload.isDuplicate === true || /duplicate|already (?:exists|submitted|received)/.test(text)) return 409;
  if (payload.rateLimited === true || payload.rateLimited === 'true' || /rate.?limit|too many (?:requests|submissions)/.test(text)) return 429;
  if (payload.honeypot === true || /honeypot|bot (?:submission|detected)/.test(text)) return 400;
  if (payload.valid === false || payload.validation === false || payload.ok === false || firstString(payload.error) || firstString(payload.message) || firstString(payload.reason)) return 400;

  return 502;
}

function publicResult(payload, status) {
  const result = { success: status === 200 };
  if (!isPlainObject(payload)) return result;

  if (typeof payload.notificationSent === 'boolean') result.notificationSent = payload.notificationSent;
  if (typeof payload.duplicate === 'boolean') result.duplicate = payload.duplicate;
  if (typeof payload.rateLimited === 'boolean') result.rateLimited = payload.rateLimited;

  const message = firstString(payload.message) || firstString(payload.error) || firstString(payload.reason);
  if (message) result.message = message;
  return result;
}

function genericError(message) {
  return { success: false, message: message };
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ms);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return respond(res, 405, genericError('Method not allowed.'), { Allow: 'POST' });
  }

  const body = parseBody(req);
  if (!validEnquiry(body)) {
    return respond(res, 400, genericError('Invalid enquiry payload.'));
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL(process.env.APPS_SCRIPT_URL || FALLBACK_APPS_SCRIPT_URL);
  } catch (e) {
    console.error('Enquiry upstream URL is invalid.');
    return respond(res, 502, genericError('Submission service is unavailable.'));
  }

  ENQUIRY_FIELDS.forEach(function (key) {
    upstreamUrl.searchParams.set(key, body[key].trim());
  });

  let upstreamResponse;
  try {
    upstreamResponse = await fetchWithTimeout(upstreamUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    }, timeoutMs());
  } catch (e) {
    console.error('Enquiry upstream request failed.');
    return respond(res, 502, genericError('Submission service is unavailable.'));
  }

  if (!upstreamResponse || !upstreamResponse.ok) {
    console.error('Enquiry upstream returned an unsuccessful status.');
    return respond(res, 502, genericError('Submission service is unavailable.'));
  }

  let payload;
  try {
    payload = await upstreamResponse.json();
  } catch (e) {
    console.error('Enquiry upstream response was not JSON.');
    return respond(res, 502, genericError('Submission service returned an invalid response.'));
  }

  const status = classify(payload);
  if (status !== 200 && status !== 400 && status !== 409 && status !== 429) {
    console.error('Enquiry upstream response was not recognized.');
    return respond(res, 502, genericError('Submission service returned an invalid response.'));
  }

  return respond(res, status, publicResult(payload, status));
};

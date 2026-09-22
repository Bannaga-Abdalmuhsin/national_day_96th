const SITE_IDS = [
  "CWH935", "CWH942", "CWH352", "COW652", "CWH353", "CWH937",
  "CWH943", "CWH973", "COW847", "CWH944", "COW522", "CWN109",
  "CWH037", "CWN917", "CWN052", "CWH009", "CWN213", "CWS810",
  "CWH316", "CWS814", "COW527", "COW054", "COW735", "COW019",
] as const;

const SITE_ID_SET = new Set<string>(SITE_IDS);
const JSON_HEADERS = { "Content-Type": "application/json" };

type StringRow = Record<string, string>;
type SourceRow = { values: StringRow; sourceRowNumber: number };
type SheetsResponse = { values?: unknown[][] };
type GoogleServiceAccount = { client_email?: unknown; private_key?: unknown; token_uri?: unknown };
type SyncCounts = {
  powerSourceRows: number;
  outageSourceRows: number;
  powerUpserted: number;
  outagesUpserted: number;
  powerDeactivated: number;
  outagesDeactivated: number;
  powerSkipped: number;
  outagesSkipped: number;
};

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

class SyncError extends Error {}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, "Access-Control-Allow-Origin": "*" },
  });
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").replace(/\u00a0/g, " ").trim();
}

function rowsFromValues(values: unknown[][], headerRowIndex: number): SourceRow[] {
  const headers = (values[headerRowIndex] ?? []).map(normalizeHeader);
  if (!headers.some(Boolean)) throw new SyncError("Source sheet header row is empty");

  return values.slice(headerRowIndex + 1).map((rawRow, offset) => {
    const row: StringRow = {};
    headers.forEach((header, index) => {
      if (header) row[header] = normalizeValue(rawRow?.[index]);
    });
    return { values: row, sourceRowNumber: headerRowIndex + offset + 2 };
  });
}

function firstValue(row: StringRow, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)] ?? "";
    if (value !== "") return value;
  }
  return "";
}

function siteIdFrom(row: StringRow): string {
  return firstValue(row, [
    "site_id", "site id", "site", "site_code", "site code", "cow_id", "cow id", "cow site",
  ]).trim().toUpperCase();
}

function isNoAlarm(value: string): boolean {
  return /^no\s+alarm$/i.test(value.trim());
}

function nullable(value: string): string | null {
  return value === "" || isNoAlarm(value) ? null : value;
}

function parseNumeric(value: string): number | null {
  if (!value || isNoAlarm(value)) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string): number | null {
  const parsed = parseNumeric(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function statusValue(value: string): string | null {
  return value === "" || isNoAlarm(value) ? null : value.trim().toUpperCase();
}

function isInactiveStatus(value: string | null): boolean {
  return value !== null && ["CLOSED", "CLEARED", "RESOLVED", "INACTIVE", "CANCELLED", "CANCELED"].includes(value);
}

function parseDatePart(value: string): string | null {
  const trimmed = value.trim();
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(trimmed);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(trimmed);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTimePart(value: string): string | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(trimmed);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  const meridiem = match[4]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function timestampFrom(
  row: StringRow,
  directAliases: string[],
  dateAliases: string[],
  timeAliases: string[],
): string | null {
  const direct = firstValue(row, directAliases);
  if (direct) {
    const directDate = new Date(direct);
    if (!Number.isNaN(directDate.getTime()) && /\d{4}/.test(direct)) return directDate.toISOString();
  }

  const dateValue = firstValue(row, dateAliases);
  const timeValue = firstValue(row, timeAliases);
  if (!dateValue) return null;
  const datePart = parseDatePart(dateValue);
  if (!datePart) {
    const parsed = new Date(timeValue ? `${dateValue} ${timeValue}` : dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const timePart = parseTimePart(timeValue) ?? "00:00:00";
  const parsed = new Date(`${datePart}T${timePart}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8Base64Url(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function pemToBytes(pem: string): Uint8Array {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function googleAccessToken(serviceAccountJson: string): Promise<string> {
  let serviceAccount: GoogleServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as GoogleServiceAccount;
  } catch {
    throw new SyncError("Google service account configuration is invalid");
  }

  const email = typeof serviceAccount.client_email === "string" ? serviceAccount.client_email : "";
  const privateKey = typeof serviceAccount.private_key === "string" ? serviceAccount.private_key : "";
  const tokenUri = typeof serviceAccount.token_uri === "string" ? serviceAccount.token_uri : "https://oauth2.googleapis.com/token";
  if (!email || !privateKey) throw new SyncError("Google service account configuration is incomplete");

  const now = Math.floor(Date.now() / 1000);
  const header = utf8Base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = utf8Base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(privateKey) as unknown as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new SyncError("Google authorization failed");
  const tokenBody = await response.json() as { access_token?: unknown };
  if (typeof tokenBody.access_token !== "string" || !tokenBody.access_token) {
    throw new SyncError("Google authorization returned no access token");
  }
  return tokenBody.access_token;
}

async function readSheet(spreadsheetId: string, sheetName: string, accessToken: string): Promise<unknown[][]> {
  const range = `'${sheetName.replace(/'/g, "''")}'!A:ZZZ`;
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new SyncError("Google Sheets read failed");
  const body = await response.json() as SheetsResponse;
  if (!Array.isArray(body.values)) throw new SyncError("Google Sheets returned no values");
  return body.values;
}

async function supabaseRequest<T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new SyncError("Supabase request failed");
  if (response.status === 204) return null;
  const responseText = await response.text();
  return responseText ? JSON.parse(responseText) as T : null;
}

async function upsertRows(
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const uniqueRows = Array.from(new Map(rows.map((row) => [String(row.tt_number), row])).values());
  await supabaseRequest(supabaseUrl, serviceRoleKey, `${table}?on_conflict=tt_number`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(uniqueRows),
  });
  return uniqueRows.length;
}

async function activeTicketNumbers(supabaseUrl: string, serviceRoleKey: string, table: string): Promise<string[]> {
  const rows = await supabaseRequest<{ tt_number?: unknown }[]>(
    supabaseUrl,
    serviceRoleKey,
    `${table}?is_active=eq.true&select=tt_number`,
  );
  return (rows ?? [])
    .map((row) => typeof row.tt_number === "string" ? row.tt_number : "")
    .filter(Boolean);
}

async function deactivateMissing(
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  sourceTickets: Set<string>,
): Promise<number> {
  const activeTickets = await activeTicketNumbers(supabaseUrl, serviceRoleKey, table);
  const missing = activeTickets.filter((ticket) => !sourceTickets.has(ticket));
  await Promise.all(missing.map((ticket) => supabaseRequest(
    supabaseUrl,
    serviceRoleKey,
    `${table}?tt_number=eq.${encodeURIComponent(ticket)}`,
    { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: false }) },
  )));
  return missing.length;
}

function powerAlarmRows(
  sourceRows: SourceRow[],
  syncedAt: string,
): { rows: Record<string, unknown>[]; tickets: Set<string> } {
  const tickets = new Set<string>();
  const mapped = sourceRows.flatMap(({ values: row, sourceRowNumber }) => {
    const siteId = siteIdFrom(row);
    const ttNumber = firstValue(row, ["tt_number", "tt number", "ticket_number", "ticket number", "trouble_ticket", "tt"]);
    const problemDescription = firstValue(row, ["problem_description", "problem description", "alarm", "power_alarm", "alarm_description", "description"]);
    const status = statusValue(firstValue(row, ["status", "state", "alarm_status"]));
    if (!SITE_ID_SET.has(siteId) || !ttNumber || isNoAlarm(ttNumber) || isNoAlarm(problemDescription) || isNoAlarm(status ?? "")) return [];
    tickets.add(ttNumber);
    return [{
      site_id: siteId,
      tt_number: ttNumber,
      start_at: timestampFrom(row, ["start_at", "start at", "alarm_start_at"], ["start_date", "start date", "alarm_start_date", "date"], ["start_time", "start time", "alarm_start_time", "time"]),
      end_at: timestampFrom(row, ["end_at", "end at", "alarm_end_at"], ["end_date", "end date", "alarm_end_date"], ["end_time", "end time", "alarm_end_time"]),
      problem_description: nullable(problemDescription),
      action_taken: nullable(firstValue(row, ["action_taken", "action taken"])),
      issue: nullable(firstValue(row, ["issue"])),
      fo_staff: nullable(firstValue(row, ["fo_staff", "fo staff"])),
      assigned_at: timestampFrom(row, ["assigned_at", "assigned at"], ["assigned_date", "assigned date"], ["assigned_time", "assigned time"]),
      comments: nullable(firstValue(row, ["comments", "comment"])),
      owner_responsible: nullable(firstValue(row, ["owner_responsible", "owner responsible", "owner"])),
      status,
      power_source: nullable(firstValue(row, ["power_source", "power source"])),
      vendor: nullable(firstValue(row, ["vendor"])),
      chain: nullable(firstValue(row, ["chain"])),
      tt_severity: nullable(firstValue(row, ["tt_severity", "tt severity", "severity", "priority"])),
      site_label: nullable(firstValue(row, ["site_label", "site label"])),
      subcon: nullable(firstValue(row, ["subcon", "sub_con"])),
      region: nullable(firstValue(row, ["region"])),
      district: nullable(firstValue(row, ["district", "area"])),
      duration_min: parseNumeric(firstValue(row, ["duration_min", "duration min", "duration"])),
      summary: nullable(firstValue(row, ["summary"])),
      source_row_number: sourceRowNumber,
      source_updated_at: timestampFrom(row, ["source_updated_at", "source updated at", "updated_at", "updated at", "last_updated"], ["updated_date", "updated date"], ["updated_time", "updated time"]),
      synced_at: syncedAt,
      is_active: !isInactiveStatus(status),
    }];
  });
  return { rows: mapped, tickets };
}

function outageRows(
  sourceRows: SourceRow[],
  syncedAt: string,
): { rows: Record<string, unknown>[]; tickets: Set<string> } {
  const tickets = new Set<string>();
  const mapped = sourceRows.flatMap(({ values: row, sourceRowNumber }) => {
    const siteId = siteIdFrom(row);
    const ttNumber = firstValue(row, ["tt_number", "tt number", "ticket_number", "ticket number", "trouble_ticket", "tt"]);
    const alarmsDescription = firstValue(row, ["alarms_description", "alarms description", "alarm_description", "alarm description"]);
    const status = statusValue(firstValue(row, ["status", "state", "sir_status"]));
    if (!SITE_ID_SET.has(siteId) || !ttNumber || isNoAlarm(ttNumber) || isNoAlarm(alarmsDescription) || isNoAlarm(status ?? "")) return [];
    tickets.add(ttNumber);
    return [{
      site_id: siteId,
      tt_number: ttNumber,
      technology: nullable(firstValue(row, ["technology", "tech"])),
      oos_start_at: timestampFrom(row, ["oos_start_at", "oos start at", "outage_start_at"], ["oos_start_date", "oos start date", "outage_start_date", "start_date", "start date"], ["oos_start_time", "oos start time", "outage_start_time", "start_time", "start time"]),
      oos_end_at: timestampFrom(row, ["oos_end_at", "oos end at", "outage_end_at"], ["oos_end_date", "oos end date", "outage_end_date", "end_date", "end date"], ["oos_end_time", "oos end time", "outage_end_time", "end_time", "end time"]),
      alarms_description: nullable(alarmsDescription),
      fo_staff: nullable(firstValue(row, ["fo_staff", "fo staff"])),
      action_taken: nullable(firstValue(row, ["action_taken", "action taken"])),
      assigned_at: timestampFrom(row, ["assigned_at", "assigned at"], ["assigned_date", "assigned date"], ["assigned_time", "assigned time"]),
      fault_type: nullable(firstValue(row, ["fault_type", "fault type"])),
      without_alarms_feedback: nullable(firstValue(row, ["without_alarms_feedback", "without alarms feedback"])),
      comment: nullable(firstValue(row, ["comment", "comments"])),
      power_alarm_at: timestampFrom(row, ["power_alarm_at", "power alarm at"], ["power_alarm_date", "power alarm date"], ["power_alarm_time", "power alarm time"]),
      referring_at: timestampFrom(row, ["referring_at", "referring at"], ["referring_date", "referring date"], ["referring_time", "referring time"]),
      status,
      power_source: nullable(firstValue(row, ["power_source", "power source"])),
      vendor: nullable(firstValue(row, ["vendor"])),
      chain: nullable(firstValue(row, ["chain"])),
      tt_severity: nullable(firstValue(row, ["tt_severity", "tt severity", "severity", "priority"])),
      site_label: nullable(firstValue(row, ["site_label", "site label"])),
      region: nullable(firstValue(row, ["region"])),
      subcon: nullable(firstValue(row, ["subcon", "sub_con"])),
      area: nullable(firstValue(row, ["area", "district"])),
      physical_impacted_sites: parseInteger(firstValue(row, ["exact_number_of_physical_impacted_sites", "exact number of physical impacted sites", "physical_impacted_sites", "physical impacted sites"])),
      sites_2g: nullable(firstValue(row, ["sites_2g", "sites 2g"])),
      sites_4g: nullable(firstValue(row, ["sites_4g", "sites 4g"])),
      sites_5g: nullable(firstValue(row, ["sites_5g", "sites 5g"])),
      battery_status: nullable(firstValue(row, ["battery_status", "battery status"])),
      owner: nullable(firstValue(row, ["owner", "owner_responsible", "owner responsible"])),
      duration_min: parseNumeric(firstValue(row, ["duration_min", "duration min", "duration"])),
      summary: nullable(firstValue(row, ["summary"])),
      source_row_number: sourceRowNumber,
      source_updated_at: timestampFrom(row, ["source_updated_at", "source updated at", "updated_at", "updated at", "last_updated"], ["updated_date", "updated date"], ["updated_time", "updated time"]),
      synced_at: syncedAt,
      is_active: !isInactiveStatus(status),
    }];
  });
  return { rows: mapped, tickets };
}

async function sync(): Promise<SyncCounts> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const spreadsheetId = Deno.env.get("SOURCE_SPREADSHEET_ID");
  const powerAlarmsSheetName = Deno.env.get("POWER_ALARMS_SHEET_NAME");
  const outagesSheetName = Deno.env.get("OUTAGES_SHEET_NAME");
  if (!supabaseUrl || !serviceRoleKey || !serviceAccountJson || !spreadsheetId || !powerAlarmsSheetName || !outagesSheetName) {
    throw new SyncError("Required sync configuration is missing");
  }

  const accessToken = await googleAccessToken(serviceAccountJson);
  const [powerValues, outageValues] = await Promise.all([
    readSheet(spreadsheetId, powerAlarmsSheetName, accessToken),
    readSheet(spreadsheetId, outagesSheetName, accessToken),
  ]);
  const syncedAt = new Date().toISOString();
  const power = powerAlarmRows(rowsFromValues(powerValues, 0), syncedAt);
  const outages = outageRows(rowsFromValues(outageValues, 1), syncedAt);

  const powerUpserted = await upsertRows(supabaseUrl, serviceRoleKey, "national_day_power_alarms", power.rows);
  const outagesUpserted = await upsertRows(supabaseUrl, serviceRoleKey, "national_day_outages", outages.rows);
  const [powerDeactivated, outagesDeactivated] = await Promise.all([
    deactivateMissing(supabaseUrl, serviceRoleKey, "national_day_power_alarms", power.tickets),
    deactivateMissing(supabaseUrl, serviceRoleKey, "national_day_outages", outages.tickets),
  ]);
  const powerSourceRows = Math.max(0, powerValues.length - 1);
  const outageSourceRows = Math.max(0, outageValues.length - 2);
  const counts = {
    powerSourceRows,
    outageSourceRows,
    powerUpserted,
    outagesUpserted,
    powerDeactivated,
    outagesDeactivated,
    powerSkipped: Math.max(0, powerSourceRows - power.rows.length),
    outagesSkipped: Math.max(0, outageSourceRows - outages.rows.length),
  };
  await supabaseRequest(supabaseUrl, serviceRoleKey, "national_day_sync_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "completed", synced_at: syncedAt, ...counts }),
  });
  return counts;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...JSON_HEADERS,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (request.method !== "POST") return jsonResponse({ ok: false, status: "method_not_allowed" }, 405);

  try {
    const counts = await sync();
    console.log("National Day sync completed", counts);
    return jsonResponse({ ok: true, status: "completed", counts });
  } catch (error) {
    const reason = error instanceof SyncError ? error.message : "unexpected sync failure";
    console.error("National Day sync failed", { reason });
    return jsonResponse({ ok: false, status: "failed" }, 500);
  }
});

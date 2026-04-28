const DEFAULT_API_BASE_URL = "/api";
const AUTH_TOKEN_KEY = "tms.auth.token";
const BACKEND_TMS_PROXY_PREFIX = "/backend_Tms";
const BACKEND_TMS_HOSTED_BASE_URL = "https://da.apps.nttdataservices.com/backend_Tms";
const GET_CACHE_STORAGE_KEY = "tms.api.get_cache";
const DEFAULT_GET_CACHE_TTL_MS = 60 * 1000;
const getRequestCache = new Map();

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const safeStructuredClone = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const getCacheStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
};

const buildCacheKey = ({ method, url, responseType }) => `${method}:${responseType}:${url}`;

const readCachedResponse = (cacheKey) => {
  const now = Date.now();
  const memoryEntry = getRequestCache.get(cacheKey);

  if (memoryEntry && memoryEntry.expiresAt > now) {
    return safeStructuredClone(memoryEntry.data);
  }

  if (memoryEntry) {
    getRequestCache.delete(cacheKey);
  }

  const storage = getCacheStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(GET_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const storageEntry = parsed[cacheKey];

    if (!storageEntry) {
      return null;
    }

    if (storageEntry.expiresAt <= now) {
      delete parsed[cacheKey];
      storage.setItem(GET_CACHE_STORAGE_KEY, JSON.stringify(parsed));
      return null;
    }

    getRequestCache.set(cacheKey, storageEntry);
    return safeStructuredClone(storageEntry.data);
  } catch {
    return null;
  }
};

const writeCachedResponse = (cacheKey, data, ttlMs) => {
  const entry = {
    expiresAt: Date.now() + ttlMs,
    data: safeStructuredClone(data),
  };

  getRequestCache.set(cacheKey, entry);

  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  try {
    const raw = storage.getItem(GET_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[cacheKey] = entry;
    storage.setItem(GET_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage quota or serialization issues and keep in-memory cache only.
  }
};

export const clearRequestCache = () => {
  getRequestCache.clear();

  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(GET_CACHE_STORAGE_KEY);
};

const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return trimTrailingSlash(configuredBaseUrl || DEFAULT_API_BASE_URL);
};

const getBaseOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost";
};

const getBackendTmsBaseUrl = () => trimTrailingSlash(import.meta.env.DEV ? BACKEND_TMS_PROXY_PREFIX : BACKEND_TMS_HOSTED_BASE_URL);

const buildBackendTmsUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${getBackendTmsBaseUrl()}${normalizedPath}`, getBaseOrigin()).toString();
};

const buildUrl = (path, query) => {
  const normalizedPath = path.startsWith("http") ? path : `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const url = new URL(normalizedPath, getBaseOrigin());

  if (!query) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          url.searchParams.append(key, String(item));
        }
      });
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiError";
    this.status = details.status ?? 0;
    this.data = details.data;
    this.method = details.method;
    this.url = details.url;
  }
}

export const getStoredAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setStoredAuthToken = (token) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    clearRequestCache();
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  clearRequestCache();
};

export const clearStoredAuthToken = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  clearRequestCache();
};

const parseResponse = async (response, responseType) => {
  if (response.status === 204) {
    return null;
  }

  if (responseType === "raw") {
    return response;
  }

  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "text") {
    return response.text();
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

export const request = async (path, options = {}) => {
  const {
    method = "GET",
    query,
    body,
    headers = {},
    token,
    responseType = "json",
    signal,
    cache = method === "GET" && (responseType === "json" || responseType === "text"),
    cacheTtlMs = DEFAULT_GET_CACHE_TTL_MS,
  } = options;

  const url = buildUrl(path, query);
  const authToken = token ?? getStoredAuthToken();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const requestHeaders = new Headers(headers);

  if (!isFormData && body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  const cacheKey = buildCacheKey({ method, url, responseType });

  if (cache) {
    const cachedResponse = readCachedResponse(cacheKey);
    if (cachedResponse !== null) {
      return cachedResponse;
    }
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    signal,
  });

  const data = await parseResponse(response, responseType);

  if (!response.ok) {
    const message =
      (typeof data === "object" && data?.message) ||
      (typeof data === "string" && data) ||
      `${method} ${url} failed with status ${response.status}`;

    throw new ApiError(message, {
      status: response.status,
      data,
      method,
      url,
    });
  }

  if (cache) {
    writeCachedResponse(cacheKey, data, cacheTtlMs);
  } else if (method !== "GET") {
    clearRequestCache();
  }

  return data;
};

const buildFormData = (entries = {}) => {
  const formData = new FormData();

  Object.entries(entries).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
      return;
    }

    formData.append(key, value);
  });

  return formData;
};

export const createApiClient = () => ({
  auth: {
    login: async (credentials, options = {}) => {
      const response = await request("/auth/login", {
        method: "POST",
        body: credentials,
        ...options,
      });

      if (response?.token) {
        setStoredAuthToken(response.token);
      }

      return response;
    },
    logout: async (options = {}) => {
      const response = await request("/auth/logout", {
        method: "POST",
        ...options,
      });

      clearStoredAuthToken();
      return response;
    },
    me: (options = {}) => request("/auth/me", options),
    trainerLogin: (credentials, options = {}) =>
      request(buildBackendTmsUrl("/Login/"), {
        method: "POST",
        body: buildFormData({
          portal_id: credentials.portalId,
          password: credentials.password,
        }),
        ...options,
      }),
  },

  dashboard: {
    summary: (options = {}) =>
      request(buildBackendTmsUrl("/Dashboard_Page/"), {
        method: "GET",
        ...options,
      }),
  },

  users: {
    list: (query, options = {}) => request("/users", { query, ...options }),
    create: (payload, options = {}) => request("/users", { method: "POST", body: payload, ...options }),
    update: (id, payload, options = {}) => request(`/users/${id}`, { method: "PUT", body: payload, ...options }),
    metrics: (id, options = {}) => request(`/users/${id}/metrics`, options),
  },

  trainers: {
    list: (options = {}) =>
      request(buildBackendTmsUrl("/Supervisor_Page/"), {
        method: "GET",
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Supervisor_Page/"), {
        method: "POST",
        body: buildFormData({
          portalid: payload.portalid ?? payload.portalId,
          emailid: payload.emailid ?? payload.email,
          first_name: payload.first_name ?? payload.firstName,
          last_name: payload.last_name ?? payload.lastName,
          region: payload.region ?? payload.location,
          location: payload.location ?? payload.region,
          role: payload.role,
          status: payload.status,
          leader: payload.leader,
          supervisor: payload.supervisor,
        }),
        ...options,
      }),
    update: (id, payload, options = {}) =>
      request(buildBackendTmsUrl(`/Supervisor_Page/${encodeURIComponent(id)}/`), {
        method: "PATCH",
        body: buildFormData({
          portalid: payload.portalid ?? payload.portalId,
          emailid: payload.emailid ?? payload.email,
          first_name: payload.first_name ?? payload.firstName,
          last_name: payload.last_name ?? payload.lastName,
          region: payload.region ?? payload.location,
          location: payload.location ?? payload.region,
          role: payload.role,
          status: payload.status,
          leader: payload.leader,
          supervisor: payload.supervisor,
        }),
        ...options,
      }),
  },

  supervisors: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Supervisor_List/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  students: {
    list: (query, options = {}) => request("/students", { query, ...options }),
    create: (payload, options = {}) => request("/students", { method: "POST", body: payload, ...options }),
    update: (id, payload, options = {}) => request(`/students/${id}`, { method: "PUT", body: payload, ...options }),
    detail: (id, options = {}) => request(`/students/${id}`, options),
  },

  studentsPage: {
    list: (options = {}) =>
      request(buildBackendTmsUrl("/Students_page/"), {
        method: "GET",
        ...options,
      }),
    detail: (portalId, options = {}) =>
      request(buildBackendTmsUrl(`/Students_page/${encodeURIComponent(portalId)}/`), {
        method: "GET",
        ...options,
      }),
    create: (student, options = {}) =>
      request(buildBackendTmsUrl("/Students_page/"), {
        method: "POST",
        body: buildFormData({
          Source: student.source,
          LastName: student.lastName,
          FirstName: student.firstName,
          Location: student.location,
          WFH: student.wfh,
          Status: student.status,
          Level1: student.level1,
          Level2: student.level2,
          Level3: student.level3,
          RoleAssignment: student.roleAssignment,
          Billing: student.billing,
          TL: student.tl,
          Language: student.language,
          EmpId: student.empId,
          portalid: student.empId,
          emp_id: student.empId,
          Windows: student.windows,
          NTTBPOEmail: student.nttBpoEmail,
          ntt_bpo_email: student.nttBpoEmail,
          PCBReqNo: student.pcbReq,
          pcb_req_no: student.pcbReq,
          HomePhone: student.homePhone,
          home_phone: student.homePhone,
          HomeEmailAddress: student.homeEmail,
          home_email_address: student.homeEmail,
          TSYS: student.tsys,
          MACGUI: student.macGui,
          mac_gui: student.macGui,
          ICE: student.ice,
          Genesys: student.genesys,
          Notes: student.notes,
          DOJ: student.doj || student.createdAt,
          doj: student.doj || student.createdAt,
        }),
        ...options,
      }),
    update: (portalId, student, options = {}) =>
      request(buildBackendTmsUrl(`/Students_page/${encodeURIComponent(portalId)}/`), {
        method: "PUT",
        body: buildFormData({
          Source: student.source,
          LastName: student.lastName,
          FirstName: student.firstName,
          Location: student.location,
          WFH: student.wfh,
          Status: student.status,
          Level1: student.level1,
          Level2: student.level2,
          Level3: student.level3,
          RoleAssignment: student.roleAssignment,
          Billing: student.billing,
          TL: student.tl,
          Language: student.language,
          EmpId: student.empId,
          portalid: student.portalId ?? student.empId,
          emp_id: student.empId,
          Windows: student.windows,
          NTTBPOEmail: student.nttBpoEmail,
          ntt_bpo_email: student.nttBpoEmail,
          PCBReqNo: student.pcbReq,
          pcb_req_no: student.pcbReq,
          HomePhone: student.homePhone,
          home_phone: student.homePhone,
          HomeEmailAddress: student.homeEmail,
          home_email_address: student.homeEmail,
          TSYS: student.tsys,
          MACGUI: student.macGui,
          mac_gui: student.macGui,
          ICE: student.ice,
          Genesys: student.genesys,
          Notes: student.notes,
          DOJ: student.doj || student.createdAt,
          doj: student.doj || student.createdAt,
        }),
        ...options,
      }),
  },

  templates: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Program_Templates/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  holidays: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Holidays/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  trainingPrograms: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Training_Programs/"), {
        method: "GET",
        query,
        ...options,
      }),
    detail: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Training_Programs/${encodeURIComponent(id)}/`), {
        method: "GET",
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Training_Programs/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
  },

  scheduledTrainings: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Schedule_Training/"), {
        method: "GET",
        query,
        ...options,
      }),
    detail: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Schedule_Training/${encodeURIComponent(id)}/`), {
        method: "GET",
        ...options,
      }),
    sessions: (query, options = {}) =>
      request(buildBackendTmsUrl("/Schedule_Training/Sessions/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Schedule_Training/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
  },

  programs: {
    list: (query, options = {}) => request("/programs", { query, ...options }),
    create: (payload, options = {}) => request("/programs", { method: "POST", body: payload, ...options }),
    update: (id, payload, options = {}) => request(`/programs/${id}`, { method: "PUT", body: payload, ...options }),
    detail: (id, options = {}) => request(`/programs/${id}`, options),
  },

  sessions: {
    list: (query, options = {}) => request("/sessions", { query, ...options }),
    update: (id, payload, options = {}) => request(`/sessions/${id}`, { method: "PUT", body: payload, ...options }),
  },

  attendance: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Attendance_Matrix_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    bulk: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Attendance_Matrix_Page/batch/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    batch: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Attendance_Matrix_Page/batch/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    history: (query, options = {}) =>
      request(buildBackendTmsUrl("/Attendance_Matrix_Page/history/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  observations: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Observations_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    bulk: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Observations_Page/bulk/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
  },

  feedback: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Feedback_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Feedback_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
  },

  auditLogs: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Audit_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  reports: {
    performance: (query, options = {}) => request("/reports/performance", { query, ...options }),
    exports: (query, options = {}) =>
      request(buildBackendTmsUrl("/Reports_Page/exports/"), {
        method: "GET",
        query,
        ...options,
      }),
    downloadExport: (filename, options = {}) =>
      request(buildBackendTmsUrl(`/Reports_Page/exports/download/${encodeURIComponent(filename)}/`), {
        responseType: "blob",
        ...options,
      }),
  },

  options: {
    get: (query, options = {}) =>
      request(buildBackendTmsUrl("/Options_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  trainerAttendance: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Attendance_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Attendance_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    bulk: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Attendance_Page/bulk/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    export: (query, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Attendance_Page/export/"), {
        method: "GET",
        query,
        responseType: "blob",
        cache: false,
        ...options,
      }),
  },

  trainerObservations: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Observations_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Observations_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    summary: (query, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Observations_Page/summary/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  trainerUtilization: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Trainer_Utilization_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  orgChart: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Org_Chart_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
  },

  skillsMatrix: {
    meta: (query, options = {}) =>
      request(buildBackendTmsUrl("/Skills_Matrix_Page/meta/"), {
        method: "GET",
        query,
        ...options,
      }),
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Skills_Matrix_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    update: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Skills_Matrix_Page/"), {
        method: "PUT",
        body: payload,
        ...options,
      }),
  },

  availabilityPage: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Availability_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Availability_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    update: (id, payload, options = {}) =>
      request(buildBackendTmsUrl(`/Availability_Page/${encodeURIComponent(id)}/`), {
        method: "PATCH",
        body: payload,
        ...options,
      }),
    remove: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Availability_Page/${encodeURIComponent(id)}/`), {
        method: "DELETE",
        ...options,
      }),
  },

  tasksPage: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Tasks_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Tasks_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    update: (id, payload, options = {}) =>
      request(buildBackendTmsUrl(`/Tasks_Page/${encodeURIComponent(id)}/`), {
        method: "PATCH",
        body: payload,
        ...options,
      }),
    remove: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Tasks_Page/${encodeURIComponent(id)}/`), {
        method: "DELETE",
        ...options,
      }),
    addComment: (id, payload, options = {}) =>
      request(buildBackendTmsUrl(`/Tasks_Page/${encodeURIComponent(id)}/comments/`), {
        method: "POST",
        body: payload,
        ...options,
      }),
  },

  materialsPage: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Materials_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Materials_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    remove: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Materials_Page/${encodeURIComponent(id)}/`), {
        method: "DELETE",
        ...options,
      }),
    versions: (id, query, options = {}) =>
      request(buildBackendTmsUrl(`/Materials_Page/${encodeURIComponent(id)}/versions/`), {
        method: "GET",
        query,
        ...options,
      }),
    addVersion: (id, payload, options = {}) =>
      request(buildBackendTmsUrl(`/Materials_Page/${encodeURIComponent(id)}/versions/`), {
        method: "POST",
        body: payload,
        ...options,
      }),
  },

  certificationsPage: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Certifications_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Certifications_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
    update: (id, payload, options = {}) =>
      request(buildBackendTmsUrl(`/Certifications_Page/${encodeURIComponent(id)}/`), {
        method: "PATCH",
        body: payload,
        ...options,
      }),
    remove: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Certifications_Page/${encodeURIComponent(id)}/`), {
        method: "DELETE",
        ...options,
      }),
  },

  courseDetail: {
    detail: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Course_Detail_Page/${encodeURIComponent(id)}/`), {
        method: "GET",
        ...options,
      }),
  },

  imports: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Imports_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: ({ file, ...fields }, options = {}) =>
      request(buildBackendTmsUrl("/Imports_Page/"), {
        method: "POST",
        body: buildFormData({ file, ...fields }),
        ...options,
      }),
    detail: (id, options = {}) =>
      request(buildBackendTmsUrl(`/Imports_Page/${encodeURIComponent(id)}/`), {
        method: "GET",
        ...options,
      }),
    preview: (id, query, options = {}) =>
      request(buildBackendTmsUrl(`/Imports_Page/${encodeURIComponent(id)}/preview/`), {
        method: "GET",
        query,
        ...options,
      }),
    updateRow: (id, rowNumber, payload, options = {}) =>
      request(buildBackendTmsUrl(`/Imports_Page/${encodeURIComponent(id)}/rows/${encodeURIComponent(rowNumber)}/`), {
        method: "PUT",
        body: payload,
        ...options,
      }),
    apply: (id, payload = {}, options = {}) =>
      request(buildBackendTmsUrl(`/Imports_Page/${encodeURIComponent(id)}/apply/`), {
        method: "POST",
        body: payload,
        ...options,
      }),
    reprocess: (id, payload = {}, options = {}) =>
      request(buildBackendTmsUrl(`/Imports_Page/${encodeURIComponent(id)}/reprocess/`), {
        method: "POST",
        body: payload,
        ...options,
      }),
    downloadErrors: (id, query, options = {}) =>
      request(buildBackendTmsUrl(`/Imports_Page/${encodeURIComponent(id)}/errors/`), {
        query,
        method: "GET",
        ...options,
      }),
  },

  mappings: {
    list: (query, options = {}) =>
      request(buildBackendTmsUrl("/Mappings_Page/"), {
        method: "GET",
        query,
        ...options,
      }),
    create: (payload, options = {}) =>
      request(buildBackendTmsUrl("/Mappings_Page/"), {
        method: "POST",
        body: payload,
        ...options,
      }),
  },

  exports: {
    download: (query, options = {}) =>
      request("/exports", {
        query,
        responseType: "blob",
        ...options,
      }),
  },

  localReports: {
    transition: (options = {}) => request("/reports/local/transition", options),
    kpi: (options = {}) => request("/reports/local/kpi", options),
    trainerAttendance: (options = {}) => request("/reports/local/trainer-attendance", options),
  },
});

export const api = createApiClient();

export default api;

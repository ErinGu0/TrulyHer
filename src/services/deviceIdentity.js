// src/services/deviceIdentity.js
//
// A stable per-browser id so the server can keep one person's journal separate
// from another's. This is a partition key, NOT authentication -- see
// api/_lib/identity.js. Replace with the Cognito subject claim when login lands.

const STORAGE_KEY = 'trulyher_device_id';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Safari < 15.4 and non-secure origins.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Private browsing with storage disabled: the session still works, it just
    // will not sync across reloads.
    return generateId();
  }
}

/** Headers every call to the memory-backed endpoints needs. */
export function identityHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-user-id': getDeviceId()
  };
}

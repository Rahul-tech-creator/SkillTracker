/**
 * Unified Session & Cookie Management Utility
 * Keeps sessionStorage, localStorage, and Cookies in sync for robust authentication persistence.
 */

const TOKEN_KEY = 'skilling_token';
const USER_KEY = 'skilling_user';

/**
 * Get a cookie value by name
 */
export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
};

/**
 * Set a cookie with expiration in days
 */
export const setCookie = (name, value, days = 7) => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = '; expires=' + date.toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value || '')}${expires}; path=/; SameSite=Lax${secure}`;
};

/**
 * Erase a cookie by name
 */
export const eraseCookie = (name) => {
  document.cookie = `${name}=; Max-Age=-99999999; path=/; SameSite=Lax`;
};

/**
 * Retrieve the active authentication token from sessionStorage, localStorage, or cookies
 */
export const getSessionToken = () => {
  // 1. Check sessionStorage (active tab session)
  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  if (sessionToken) return sessionToken;

  // 2. Check localStorage (persistent cross-tab session)
  const localToken = localStorage.getItem(TOKEN_KEY);
  if (localToken) {
    sessionStorage.setItem(TOKEN_KEY, localToken); // Sync to sessionStorage
    return localToken;
  }

  // 3. Check Cookie fallback
  const cookieToken = getCookie(TOKEN_KEY);
  if (cookieToken) {
    sessionStorage.setItem(TOKEN_KEY, cookieToken);
    localStorage.setItem(TOKEN_KEY, cookieToken);
    return cookieToken;
  }

  return null;
};

/**
 * Retrieve the stored user profile
 */
export const getSessionUser = () => {
  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Save user session to sessionStorage, localStorage, and Cookies
 */
export const saveSession = (token, user) => {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
    setCookie(TOKEN_KEY, token, 7);
  }

  if (user) {
    const userStr = JSON.stringify(user);
    sessionStorage.setItem(USER_KEY, userStr);
    localStorage.setItem(USER_KEY, userStr);
  }
};

/**
 * Clear all session storage, local storage, and cookies on logout
 */
export const clearSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  eraseCookie(TOKEN_KEY);
};

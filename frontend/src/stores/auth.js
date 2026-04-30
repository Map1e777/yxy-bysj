import { reactive } from 'vue';

const storageKey = 'campus_shuttle_auth';

function readInitialState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { token: '', user: null };
    }
    return JSON.parse(raw);
  } catch {
    return { token: '', user: null };
  }
}

const state = reactive(readInitialState());

function persist() {
  localStorage.setItem(storageKey, JSON.stringify({
    token: state.token,
    user: state.user
  }));
}

export function useAuthStore() {
  function setAuth(data) {
    state.token = data.token;
    state.user = data.user;
    persist();
  }

  function clearAuth() {
    state.token = '';
    state.user = null;
    localStorage.removeItem(storageKey);
  }

  return {
    state,
    setAuth,
    clearAuth
  };
}

import { setAuthTokenGetter } from "@workspace/api-client-react";

export function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("admin_token", token);
  } else {
    localStorage.removeItem("admin_token");
  }
}

// Initialize the API client's token getter
setAuthTokenGetter(() => getToken());

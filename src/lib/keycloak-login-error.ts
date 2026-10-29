const KEYCLOAK_LOGIN_ERROR = 'keycloakLoginError'

export const storeKeycloakLoginError = (message: string) => {
  window.sessionStorage.setItem(KEYCLOAK_LOGIN_ERROR, message)
}

export const consumeKeycloakLoginError = () => {
  const message = window.sessionStorage.getItem(KEYCLOAK_LOGIN_ERROR)
  if (!message) return null
  window.sessionStorage.removeItem(KEYCLOAK_LOGIN_ERROR)
  return message
}

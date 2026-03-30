export interface AccessLogEntry {
  timestamp: string
  clicks: number
  totalClicksAfterSession: number
}

export type SocialProvider = 'google' | 'apple' | 'microsoft'

export interface UserAccount {
  email: string
  name: string
  passwordHash: string
  totalClicks: number
  accessLogs: AccessLogEntry[]
  isAdmin?: boolean
  recoveryToken?: string
  recoveryTokenExpiry?: number
}

const STORAGE_USERS_KEY = 'react-course-auth-users'
const STORAGE_SESSION_KEY = 'react-course-auth-current-user'
const RECOVERY_TOKEN_TTL = 1000 * 60 * 15

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function ensureAccountDefaults(account: Partial<UserAccount>): UserAccount {
  return {
    email: account.email ?? '',
    name: account.name ?? account.email ?? '',
    passwordHash: account.passwordHash ?? '',
    totalClicks: typeof account.totalClicks === 'number' ? account.totalClicks : 0,
    accessLogs: Array.isArray(account.accessLogs)
      ? account.accessLogs.map((entry) => ({
          timestamp: entry?.timestamp ?? new Date().toISOString(),
          clicks: typeof entry?.clicks === 'number' ? entry.clicks : 0,
          totalClicksAfterSession:
            typeof entry?.totalClicksAfterSession === 'number' ? entry.totalClicksAfterSession : 0,
        }))
      : [],
    isAdmin: account.isAdmin ?? false,
    recoveryToken: account.recoveryToken,
    recoveryTokenExpiry:
      typeof account.recoveryTokenExpiry === 'number' ? account.recoveryTokenExpiry : undefined,
  }
}

export async function hashPassword(password: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return toHex(hashBuffer)
}

export function loadAccounts(): UserAccount[] {
  const stored = window.localStorage.getItem(STORAGE_USERS_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored) as Partial<UserAccount>[]
    return parsed.map(ensureAccountDefaults)
  } catch {
    return []
  }
}

export function saveAccounts(accounts: UserAccount[]) {
  window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts))
}

export function getCurrentUser(): string | null {
  return window.localStorage.getItem(STORAGE_SESSION_KEY)
}

export function setCurrentUser(email: string) {
  window.localStorage.setItem(STORAGE_SESSION_KEY, email)
}

export function clearCurrentUser() {
  window.localStorage.removeItem(STORAGE_SESSION_KEY)
}

export function getUserAccount(email: string): UserAccount | undefined {
  const normalizedEmail = normalizeEmail(email)
  return loadAccounts().find((account) => account.email === normalizedEmail)
}

function saveAccount(account: UserAccount) {
  const accounts = loadAccounts()
  const normalizedEmail = normalizeEmail(account.email)
  const index = accounts.findIndex((item) => item.email === normalizedEmail)
  if (index >= 0) {
    accounts[index] = account
  } else {
    accounts.push(account)
  }

  saveAccounts(accounts)
}

export function adminAccountExists() {
  return loadAccounts().some((account) => account.isAdmin)
}

export async function createAdminAccount(email: string, password: string, name = '') {
  const accounts = loadAccounts()
  const normalizedEmail = normalizeEmail(email)
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error('Já existe uma conta com este e-mail.')
  }

  const passwordHash = await hashPassword(password)
  accounts.push({
    email: normalizedEmail,
    name: name.trim() || normalizedEmail,
    passwordHash,
    totalClicks: 0,
    accessLogs: [],
    isAdmin: true,
  })
  saveAccounts(accounts)
}

export async function registerUser(email: string, password: string, name = '') {
  const accounts = loadAccounts()
  const normalizedEmail = normalizeEmail(email)
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error('Já existe uma conta com este e-mail.')
  }

  const passwordHash = await hashPassword(password)
  accounts.push({
    email: normalizedEmail,
    name: name.trim() || normalizedEmail,
    passwordHash,
    totalClicks: 0,
    accessLogs: [],
    isAdmin: false,
  })
  saveAccounts(accounts)
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)
  const account = getUserAccount(normalizedEmail)
  if (!account) {
    return false
  }

  const passwordHash = await hashPassword(password)
  return passwordHash === account.passwordHash
}

export function createAccessLogEntry(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const account = getUserAccount(normalizedEmail)
  if (!account) return

  account.accessLogs.push({
    timestamp: new Date().toISOString(),
    clicks: 0,
    totalClicksAfterSession: account.totalClicks,
  })
  saveAccount(account)
}

export function recordUserClick(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const account = getUserAccount(normalizedEmail)
  if (!account) return

  account.totalClicks += 1
  if (account.accessLogs.length === 0) {
    account.accessLogs.push({
      timestamp: new Date().toISOString(),
      clicks: 1,
      totalClicksAfterSession: account.totalClicks,
    })
  } else {
    const lastLog = account.accessLogs[account.accessLogs.length - 1]
    lastLog.clicks += 1
    lastLog.totalClicksAfterSession = account.totalClicks
  }

  saveAccount(account)
}

export function getUserAccessLogs(email: string): AccessLogEntry[] {
  return getUserAccount(email)?.accessLogs ?? []
}

export function generateRecoveryToken(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const account = getUserAccount(normalizedEmail)
  if (!account) {
    throw new Error('Conta não encontrada.')
  }

  const token = Math.floor(100000 + Math.random() * 900000).toString()
  account.recoveryToken = token
  account.recoveryTokenExpiry = Date.now() + RECOVERY_TOKEN_TTL
  saveAccount(account)
  return token
}

export function validateRecoveryToken(email: string, token: string) {
  const normalizedEmail = normalizeEmail(email)
  const account = getUserAccount(normalizedEmail)
  if (!account || !account.recoveryToken || !account.recoveryTokenExpiry) {
    return false
  }

  if (Date.now() > account.recoveryTokenExpiry) {
    return false
  }

  return account.recoveryToken === token.trim()
}

export function loginWithProvider(provider: SocialProvider) {
  const normalizedProvider = normalizeEmail(provider)
  const providerEmail = `${normalizedProvider}@provider.com`
  let account = getUserAccount(providerEmail)

  if (!account) {
    const providerName =
      provider === 'google'
        ? 'Google User'
        : provider === 'apple'
        ? 'Apple User'
        : 'Microsoft User'

    account = {
      email: providerEmail,
      name: providerName,
      passwordHash: '',
      totalClicks: 0,
      accessLogs: [],
      isAdmin: false,
    }
    saveAccount(account)
  }

  return account.email
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  const normalizedEmail = normalizeEmail(email)
  const account = getUserAccount(normalizedEmail)
  if (!account) {
    throw new Error('Conta não encontrada.')
  }

  if (!validateRecoveryToken(normalizedEmail, token)) {
    throw new Error('Código de recuperação inválido ou expirado.')
  }

  account.passwordHash = await hashPassword(newPassword)
  account.recoveryToken = undefined
  account.recoveryTokenExpiry = undefined
  saveAccount(account)
  return true
}

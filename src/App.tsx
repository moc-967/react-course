import { useEffect, useState } from 'react'
import {
  authenticateUser,
  clearCurrentUser,
  createAccessLogEntry,
  generateRecoveryToken,
  getCurrentUser,
  getUserAccount,
  recordUserClick,
  registerUser,
  resetPassword,
  setCurrentUser,
  UserAccount,
} from './auth'

function App() {
  const [currentUser, setCurrentUserState] = useState<string | null>(null)
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionClicks, setSessionClicks] = useState(0)

  useEffect(() => {
    const savedUser = getCurrentUser()
    setCurrentUserState(savedUser)

    if (savedUser) {
      const account = getUserAccount(savedUser)
      if (account) {
        setCurrentAccount(account)
        const lastLog = account.accessLogs[account.accessLogs.length - 1]
        setSessionClicks(lastLog?.clicks ?? 0)
      }
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setCurrentAccount(null)
      return
    }

    const account = getUserAccount(currentUser)
    if (account) {
      setCurrentAccount(account)
      const lastLog = account.accessLogs[account.accessLogs.length - 1]
      setSessionClicks(lastLog?.clicks ?? 0)
    }
  }, [currentUser])

  const clearForm = () => {
    setEmail('')
    setName('')
    setPassword('')
    setRecoveryCode('')
    setMessage(null)
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    const normalizedEmail = email.trim().toLowerCase()
    const authenticated = await authenticateUser(normalizedEmail, password)
    if (!authenticated) {
      setMessage('E-mail ou senha inválidos.')
      return
    }

    setCurrentUser(normalizedEmail)
    createAccessLogEntry(normalizedEmail)
    setCurrentUserState(normalizedEmail)
    clearForm()
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    try {
      await registerUser(email, password, name)
      const normalizedEmail = email.trim().toLowerCase()
      setCurrentUser(normalizedEmail)
      createAccessLogEntry(normalizedEmail)
      setCurrentUserState(normalizedEmail)
      clearForm()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao registrar conta.')
    }
  }

  const handleSendRecovery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    try {
      const token = generateRecoveryToken(email)
      setRecoveryCode(token)
      setMessage('Código de recuperação gerado. Use-o para redefinir sua senha.')
      setAuthMode('reset')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao gerar código de recuperação.')
    }
  }

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    try {
      await resetPassword(email, recoveryCode, password)
      setMessage('Senha redefinida com sucesso. Faça login com a nova senha.')
      setAuthMode('login')
      clearForm()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao redefinir senha.')
    }
  }

  const handleLogout = () => {
    clearCurrentUser()
    setCurrentUserState(null)
    setCurrentAccount(null)
    setSessionClicks(0)
    setAuthMode('login')
    clearForm()
  }

  const handleClick = () => {
    if (!currentUser) return
    recordUserClick(currentUser)
    const account = getUserAccount(currentUser)
    if (account) {
      setCurrentAccount(account)
      setSessionClicks((value) => value + 1)
    }
  }

  if (loading) {
    return <div className="app">Carregando...</div>
  }

  if (!currentUser) {
    const isRegister = authMode === 'register'
    const isForgot = authMode === 'forgot'
    const isReset = authMode === 'reset'

    return (
      <div className="app auth-page">
        <main>
          <h1>
            {isRegister
              ? 'Criar conta'
              : isForgot
              ? 'Recuperar senha'
              : isReset
              ? 'Redefinir senha'
              : 'Entrar'}
          </h1>
          <p>
            {isRegister
              ? 'Preencha seus dados para criar uma conta segura.'
              : isForgot
              ? 'Digite o e-mail da conta para gerar um código de recuperação.'
              : isReset
              ? 'Informe o e-mail, o código e a nova senha.'
              : 'Faça login para acessar o aplicativo.'}
          </p>

          <form
            onSubmit={
              isRegister
                ? handleRegister
                : isForgot
                ? handleSendRecovery
                : isReset
                ? handleResetPassword
                : handleLogin
            }
          >
            {isRegister && (
              <label>
                Nome
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}

            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {(!isForgot || isReset) && (
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </label>
            )}

            {isReset && (
              <label>
                Código de recuperação
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                  required
                />
              </label>
            )}

            {message && <p className="auth-message">{message}</p>}

            <button type="submit">
              {isRegister
                ? 'Cadastrar'
                : isForgot
                ? 'Gerar código'
                : isReset
                ? 'Redefinir senha'
                : 'Entrar'}
            </button>
          </form>

          <div className="auth-actions">
            {isRegister ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuthMode('login')
                  clearForm()
                }}
              >
                Já tenho conta
              </button>
            ) : isForgot ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuthMode('login')
                  clearForm()
                }}
              >
                Voltar ao login
              </button>
            ) : isReset ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuthMode('login')
                  clearForm()
                }}
              >
                Voltar ao login
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setAuthMode('forgot')
                    clearForm()
                  }}
                >
                  Esqueceu a senha?
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setAuthMode('register')
                    clearForm()
                  }}
                >
                  Criar conta
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <main>
        <div className="app-header">
          <div>
            <h1>Aplicação React + TypeScript</h1>
            <p>Bem-vindo, {currentAccount?.name || currentUser}!</p>
          </div>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>

        <p>Use este projeto para treinar componentes, estado e hooks.</p>

        <div className="stats-row">
          <div className="stats-block">
            <strong>Total de cliques desde a conta foi criada</strong>
            <p>{currentAccount?.totalClicks ?? 0}</p>
          </div>
          <div className="stats-block">
            <strong>Cliques nesta sessão</strong>
            <p>{sessionClicks}</p>
          </div>
        </div>

        <div className="card">
          <button type="button" onClick={handleClick}>
            Você clicou {sessionClicks} vezes
          </button>
        </div>

        <section>
          <h2>Registro de acessos</h2>
          {currentAccount?.accessLogs.length ? (
            <table className="access-log-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Cliques</th>
                  <th>Total após acesso</th>
                </tr>
              </thead>
              <tbody>
                {[...currentAccount.accessLogs].reverse().map((entry, index) => (
                  <tr key={`${entry.timestamp}-${index}`}>
                    <td>{new Date(entry.timestamp).toLocaleString('pt-BR')}</td>
                    <td>{entry.clicks}</td>
                    <td>{entry.totalClicksAfterSession}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Seu acesso ainda não foi registrado. Faça login para iniciar o primeiro registro.</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App

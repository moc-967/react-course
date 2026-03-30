import { useEffect, useState } from 'react'
import {
  authenticateUser,
  clearCurrentUser,
  createAccessLogEntry,
  createAdminAccount,
  generateRecoveryToken,
  getCurrentUser,
  getUserAccount,
  adminAccountExists,
  loadAccounts,
  recordUserClick,
  registerUser,
  resetPassword,
  setCurrentUser,
  UserAccount,
} from './auth'

function App() {
  const [currentUser, setCurrentUserState] = useState<string | null>(null)
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'createAdmin'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionClicks, setSessionClicks] = useState(0)
  const [adminExists, setAdminExists] = useState(false)

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

    setAdminExists(adminAccountExists())
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

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    try {
      await createAdminAccount(email, password, name)
      const normalizedEmail = email.trim().toLowerCase()
      setCurrentUser(normalizedEmail)
      createAccessLogEntry(normalizedEmail)
      setCurrentUserState(normalizedEmail)
      setAdminExists(true)
      clearForm()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao criar conta de administrador.')
    }
  }

  const handleSendRecovery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    try {
      generateRecoveryToken(email)
      setRecoveryCode('')
      setMessage(
        'Um código de recuperação foi enviado para o seu e-mail cadastrado. Verifique sua caixa de entrada.'
      )
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

  const isAdmin = currentAccount?.isAdmin || currentAccount?.email === 'admin@admin.com'
  const allAccounts = loadAccounts()
  const accessedAccounts = allAccounts.filter((account) => account.accessLogs.length > 0)
  const totalClicksAll = allAccounts.reduce((sum, account) => sum + account.totalClicks, 0)
  const totalAccessSessions = accessedAccounts.reduce((sum, account) => sum + account.accessLogs.length, 0)

  if (loading) {
    return <div className="app">Carregando...</div>
  }

  if (!currentUser) {
    const isRegister = authMode === 'register'
    const isForgot = authMode === 'forgot'
    const isReset = authMode === 'reset'
    const isCreateAdmin = authMode === 'createAdmin'

    return (
      <div className="app auth-page">
        <main>
          <h1>
            {isRegister
              ? 'Criar conta'
              : isCreateAdmin
              ? 'Criar conta admin'
              : isForgot
              ? 'Recuperar senha'
              : isReset
              ? 'Redefinir senha'
              : 'Entrar'}
          </h1>
          <p>
            {isRegister
              ? 'Preencha seus dados para criar uma conta segura.'
              : isCreateAdmin
              ? 'Defina um e-mail e senha para o administrador da aplicação.'
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
                : isCreateAdmin
                ? handleCreateAdmin
                : isForgot
                ? handleSendRecovery
                : isReset
                ? handleResetPassword
                : handleLogin
            }
          >
            {(isRegister || isCreateAdmin) && (
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

            {(!isForgot || isReset || isCreateAdmin) && (
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
                : isCreateAdmin
                ? 'Criar admin'
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
                {!adminExists && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setAuthMode('createAdmin')
                      clearForm()
                    }}
                  >
                    Criar conta admin
                  </button>
                )}
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

        <div className="card">
          <button type="button" onClick={handleClick}>
            Você clicou {sessionClicks} vezes
          </button>
        </div>

        {isAdmin ? (
          <>
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

            <section>
              <h2>Visão geral dos usuários</h2>
              <div className="stats-row">
                <div className="stats-block">
                  <strong>Total de usuários</strong>
                  <p>{allAccounts.length}</p>
                </div>
                <div className="stats-block">
                  <strong>Usuários com acesso</strong>
                  <p>{accessedAccounts.length}</p>
                </div>
                <div className="stats-block">
                  <strong>Total de cliques de todos</strong>
                  <p>{totalClicksAll}</p>
                </div>
              </div>

              <section>
                <h3>Usuários que acessaram a app</h3>
                {accessedAccounts.length ? (
                  <table className="access-log-table">
                    <thead>
                      <tr>
                        <th>E-mail</th>
                        <th>Nome</th>
                        <th>Cliques totais</th>
                        <th>Registros de sessão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessedAccounts.map((account) => (
                        <tr key={account.email}>
                          <td>{account.email}</td>
                          <td>{account.name}</td>
                          <td>{account.totalClicks}</td>
                          <td>{account.accessLogs.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Nenhum usuário acessou a aplicação ainda.</p>
                )}
              </section>
            </section>

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
          </>
        ) : (
          <div className="card">
            <p>Você não tem permissão para ver as estatísticas e o registro de acessos.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

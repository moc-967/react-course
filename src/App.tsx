import { useEffect, useRef, useState } from 'react'
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
  loginWithProvider,
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
  // Bolinha 3D ping pong
  const [dotActive, setDotActive] = useState(false)
  const [dotX, setDotX] = useState(0) // px
  const [dotY, setDotY] = useState(0) // px (0 = chão)
  const [dotDir, setDotDir] = useState(1) // 1 = direita, -1 = esquerda
  const [dotEnergy, setDotEnergy] = useState(1) // 1 = pulo máximo, decresce
  const dotAnimRef = useRef<number | null>(null)
  // Limites da tela
  const dotGround = 0
  const dotRadius = 28 // px
  const [viewport, setViewport] = useState({ width: 800, height: 600 })

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

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'microsoft') => {
    setMessage(null)

    try {
      const providerEmail = await loginWithProvider(provider)
      setCurrentUser(providerEmail)
      createAccessLogEntry(providerEmail)
      setCurrentUserState(providerEmail)
      setAuthMode('login')
      clearForm()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao autenticar com o provedor.')
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

  // Ping pong animation logic
  // Atualiza tamanho da viewport
  useEffect(() => {
    function update() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleClick = () => {
    if (!currentUser) return
    recordUserClick(currentUser)
    const account = getUserAccount(currentUser)
    if (account) {
      setCurrentAccount(account)
      setSessionClicks((value) => value + 1)
    }
    // Reinicia a animação 3D
    setDotActive(false)
    setTimeout(() => {
      setDotX(viewport.width / 2)
      setDotY(0)
      setDotDir(Math.random() > 0.5 ? 1 : -1)
      setDotEnergy(1)
      setDotActive(true)
    }, 30)
  }

  // Animação 3D: movimento horizontal e quique
  useEffect(() => {
    if (!dotActive) {
      if (dotAnimRef.current) cancelAnimationFrame(dotAnimRef.current)
      return
    }
    let x = dotX
    let y = dotY
    let dir = dotDir
    let energy = dotEnergy
    let vy = 0
    let vx = 10 * dir
    let gravity = 2.5
    let bounceLoss = 0.6
    let frame = 0
    const minX = dotRadius
    const maxX = viewport.width - dotRadius
    const ground = viewport.height - 80 // 80px do chão

    function animate() {
      frame++
      // Movimento horizontal
      x += vx
      if (x > maxX) {
        x = maxX
        dir = -1
        vx = -vx
      } else if (x < minX) {
        x = minX
        dir = 1
        vx = -vx
      }
      // Movimento vertical
      vy += gravity
      y += vy
      if (y > ground) {
        y = ground
        if (Math.abs(vy) > 2) {
          vy = -vy * energy
          energy *= bounceLoss
        } else {
          vy = 0
          energy = 0
          setDotActive(false)
          setDotY(ground)
          setDotX(x)
          setDotEnergy(0)
          return
        }
      }
      setDotX(x)
      setDotY(y)
      setDotDir(dir)
      setDotEnergy(energy)
      dotAnimRef.current = requestAnimationFrame(animate)
    }
    dotAnimRef.current = requestAnimationFrame(animate)
    return () => {
      if (dotAnimRef.current) cancelAnimationFrame(dotAnimRef.current)
    }
    // eslint-disable-next-line
  }, [dotActive, viewport.width, viewport.height])

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

          {authMode === 'login' && (
            <div className="auth-actions social-login-actions">
              <button
                type="button"
                className="social-btn google"
                onClick={() => handleSocialLogin('google')}
              >
                <span className="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22"><g><path fill="#4285F4" d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.148s2.75-6.148 6.125-6.148c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.711-1.57-3.922-2.539-6.656-2.539-5.523 0-10 4.477-10 10s4.477 10 10 10c5.781 0 9.594-4.055 9.594-9.773 0-.656-.07-1.156-.156-1.457z"/><path fill="#34A853" d="M3.545 7.548l3.281 2.406c.891-1.68 2.531-2.906 4.449-2.906 1.219 0 2.297.414 3.148 1.219l2.367-2.305c-1.484-1.383-3.406-2.227-5.515-2.227-3.672 0-6.75 2.484-7.859 5.867z"/><path fill="#FBBC05" d="M12 22c2.438 0 4.484-.805 5.977-2.188l-2.773-2.266c-.773.547-1.773.867-3.203.867-2.484 0-4.594-1.68-5.352-3.945l-3.289 2.547c1.484 3.32 4.805 5.985 8.64 5.985z"/><path fill="#EA4335" d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.148s2.75-6.148 6.125-6.148c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.711-1.57-3.922-2.539-6.656-2.539-5.523 0-10 4.477-10 10s4.477 10 10 10c5.781 0 9.594-4.055 9.594-9.773 0-.656-.07-1.156-.156-1.457z" opacity=".1"/></g></svg>
                </span>
                Continuar com Google
              </button>
              <button
                type="button"
                className="social-btn apple"
                onClick={() => handleSocialLogin('apple')}
              >
                <span className="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22"><g><path fill="#fff" d="M16.365 1.43c0 1.14-.93 2.07-2.07 2.07-.06 0-.12 0-.18-.01-.09-.12-.17-.25-.25-.38-.13-.23-.25-.47-.34-.72 0-.01 0-.01-.01-.02.23-.09.47-.14.72-.14 1.14 0 2.06.93 2.06 2.07zm3.13 5.13c-.07-.09-.14-.18-.22-.27-.7-.8-1.7-1.27-2.77-1.27-.97 0-1.7.33-2.22.33-.54 0-1.25-.32-2.07-.32-.98 0-2.01.53-2.71 1.44-1.01 1.32-1.18 3.8-.09 5.44.47.72 1.09 1.53 1.89 1.53.7 0 .89-.45 1.81-.45.92 0 1.08.45 1.8.45.8 0 1.36-.78 1.83-1.5.32-.47.56-.97.73-1.5-1.91-.73-2.22-3.36.29-3.82.01-.01.01-.01.02-.01-.06-.19-.13-.37-.22-.54zm-3.13-3.13c0 1.14-.92 2.07-2.06 2.07-.25 0-.49-.05-.72-.14.01-.01.01-.01.01-.02.09-.25.21-.49.34-.72.08-.13.16-.26.25-.38.06-.01.12-.01.18-.01 1.14 0 2.07.93 2.07 2.07z"/></g></svg>
                </span>
                Continuar com Apple
              </button>
            </div>
          )}

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

        <div className="card click-card">
          <button type="button" onClick={handleClick}>
            Você clicou {sessionClicks} vezes
          </button>
        </div>

        {/* Bolinha 3D global */}
        <span
          className="click-dot-3d-global"
          style={{
            left: dotX - 14,
            top: dotY - 14,
            opacity: 1,
          }}
        />

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
                  <div className="table-wrapper">
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
                </div>
                ) : (
                  <p>Nenhum usuário acessou a aplicação ainda.</p>
                )}
              </section>
            </section>

            <section>
              <h2>Registro de acessos</h2>
              {currentAccount?.accessLogs.length ? (
                <div className="table-wrapper">
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
                </div>
              ) : (
                <p>Seu acesso ainda não foi registrado. Faça login para iniciar o primeiro registro.</p>
              )}
            </section>
          </>
        ) : (
          <div className="card">
            <p>Continue clicando para aumentar seu contador e acompanhar sua evolução!</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

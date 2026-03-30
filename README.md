# react-course

Aplicação de treino em React + TypeScript

## Estrutura do Projeto

```
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── auth.ts
│   ├── index.css
│   └── main.tsx
```

## Funcionalidades

- Cadastro e login de usuários com e-mail e senha
- Login social simulado (Google, Apple) com botões personalizados e logomarcas
- Criação e login de conta admin
- Painel admin com:
	- Lista de todos os usuários que acessaram a aplicação
	- Estatísticas globais (total de usuários, total de cliques, sessões)
	- Visualização dos registros de acesso de cada usuário
- Usuário comum pode:
	- Clicar para incrementar seu contador
	- Visualizar seu próprio progresso
	- Ver animação de bolinha pulando a cada clique
- Recuperação de senha por código
- Interface responsiva e moderna

## Como executar

1. Instale as dependências:

```bash
npm install
```

2. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

3. Abra o endereço mostrado no terminal.

## Autenticação Social

Os botões "Continuar com Google" e "Continuar com Apple" simulam o login social. O código já está pronto para integração real com APIs OAuth (Google, Apple, Microsoft, etc). Basta implementar a função `getOAuthProfile` em `src/auth.ts`.

## Conta Admin

O primeiro admin pode ser criado pelo botão "Criar conta admin" na tela de login. O admin tem acesso ao painel de estatísticas e à lista de usuários.

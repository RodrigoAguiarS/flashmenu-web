# FRONTEND-API-CONTRACTS.md - Contratos da API FlashMenu para o Frontend

Este arquivo documenta os contratos da API FlashMenu que o frontend Angular deve
respeitar. As respostas simples retornam DTO diretamente, sem wrapper obrigatorio.

Base local da API:

```text
http://localhost:8080
```

No Angular, use sempre:

```typescript
environment.apiUrl
```

---

## Autenticacao

### Login

```text
POST /auth/login
```

Endpoint publico.

Request:

```json
{
  "email": "usuario@email.com",
  "senha": "senha"
}
```

Response `200 OK`:

```json
{
  "accessToken": "jwt-token",
  "tokenType": "Bearer",
  "usuario": {
    "id": 1,
    "nome": "Joao Silva",
    "email": "joao@flashmenu.com",
    "telefone": "84987061013",
    "ativo": true,
    "perfil": {
      "id": 1,
      "descricao": "ADMIN",
      "permissoes": [
        {
          "id": 1,
          "codigo": 1,
          "authority": "VENDA_REALIZAR",
          "criadoEm": "2026-01-01T10:00:00",
          "atualizadoEm": "2026-01-01T10:00:00"
        }
      ],
      "criadoEm": "2026-01-01T10:00:00",
      "atualizadoEm": "2026-01-01T10:00:00"
    },
    "criadoEm": "2026-01-01T10:00:00",
    "atualizadoEm": "2026-01-01T10:00:00"
  }
}
```

TypeScript:

```typescript
export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  usuario: UsuarioResponse;
}
```

---

### Usuario Logado

```text
GET /auth/usuarioLogado
```

Endpoint protegido.

Header:

```text
Authorization: Bearer {accessToken}
```

Response `200 OK`:

```typescript
UsuarioResponse
```

---

## DTOs de Usuario, Perfil e Permissao

Datas vindas do backend como `LocalDateTime` devem ser tipadas como `string` no
DTO do frontend.

```typescript
export interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  perfil: PerfilResponse | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PerfilResponse {
  id: number;
  descricao: string;
  permissoes: PermissaoResponse[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface PermissaoResponse {
  id: number;
  codigo: number;
  authority: string;
  criadoEm: string;
  atualizadoEm: string;
}
```

---

## Erros da API

### Erro Padrao

```typescript
export interface StandardError {
  timestamp: number;
  status: number;
  error: string;
  message: string;
  path: string;
}
```

Exemplo:

```json
{
  "timestamp": 1780000000000,
  "status": 401,
  "error": "Senha ou email incorretos",
  "message": "Bad credentials",
  "path": "/auth/login"
}
```

### Erro de Validacao

```typescript
export interface FieldMessage {
  fieldName: string;
  message: string;
}

export interface ValidationError extends StandardError {
  errors: FieldMessage[];
}
```

Exemplo:

```json
{
  "timestamp": 1780000000000,
  "status": 400,
  "error": "Erro de validacao",
  "message": "Erro na validacao dos campos",
  "path": "/auth/login",
  "errors": [
    {
      "fieldName": "email",
      "message": "must be a well-formed email address"
    }
  ]
}
```

---

## Regras de Consumo HTTP

- Respostas simples retornam DTO diretamente.
- Nao assumir wrapper `{ data, mensagem }` por padrao.
- Usar wrapper somente se o endpoint documentado exigir.
- Em listagens paginadas, esperar contrato Spring `Page<T>` quando o backend retornar paginacao.
- Tratar `401` como sessao invalida ou credenciais incorretas, dependendo da rota.
- Tratar `403` como acesso negado.
- Tratar `400` com `ValidationError` quando existir `errors`.
- Nao logar senha nem token completo.

---

## Storage Recomendado para Auth

Chaves:

```text
flashmenu_access_token
flashmenu_token_type
flashmenu_usuario
```

Header montado:

```text
Authorization: Bearer {accessToken}
```

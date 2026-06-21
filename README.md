# SGMM - Sistema de Gestão do Ministério de Mídias
### Igreja Betel

---

## O que é

Sistema web completo para o Ministério de Mídias gerenciar escalas, tarefas e o repositório de fotos e vídeos dos cultos integrado ao Google Drive.

---

## Como rodar localmente (sem Docker)

### 1. Instalar dependências

```bash
# Back-end
cd backend
npm install

# Front-end
cd ../frontend
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha:

```bash
cd backend
cp .env.example .env
```

Preencha o `.env` com suas chaves do Google Drive (veja seção abaixo).

### 3. Rodar

Abra dois terminais:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

Acesse: **http://localhost:3000**

**Login inicial:**
- Email: `lider@igrejabetel.com`
- Senha: `password`

> **Importante:** Troque a senha no primeiro acesso!

---

## Como fazer o deploy online (recomendado: Railway)

1. Crie uma conta em [railway.app](https://railway.app) (gratuito)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente no painel do Railway
4. O deploy é automático

Alternativa gratuita: **Render.com** — processo similar.

---

## Configurar Google Drive

Para que o upload de arquivos funcione, você precisa de credenciais OAuth2 do Google.

### Passo a passo:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto novo (ex: "SGMM Igreja Betel")
3. Ative a **Google Drive API**
4. Em "Credenciais", crie um **OAuth 2.0 Client ID** do tipo "Web application"
5. Adicione `http://localhost:3001/api/auth/google/callback` nos URIs autorizados
6. Copie o **Client ID** e **Client Secret** para o `.env`
7. Para obter o **Refresh Token**, use o [OAuth Playground](https://developers.google.com/oauthplayground) com o escopo `https://www.googleapis.com/auth/drive`
8. Crie uma pasta no seu Google Drive para o sistema e copie o ID da URL

---

## Perfis de acesso

| Perfil | O que pode fazer |
|---|---|
| **Líder de Mídias (admin)** | Tudo: usuários, escalas, tarefas, arquivos |
| **Pastoral** | Visualizar tudo, criar e gerenciar tarefas |
| **Secretaria** | Criar e editar escalas, visualizar avisos |
| **Voluntário** | Ver suas escalas, confirmar presença, fazer upload de material |

---

## Estrutura do projeto

```
sgmm/
├── backend/
│   ├── src/
│   │   ├── routes/        # auth, users, schedules, tasks, media, notifications
│   │   ├── middleware/    # autenticação JWT e RBAC
│   │   ├── services/      # integração Google Drive
│   │   └── config/        # banco de dados (JSON local)
│   └── data/              # db.json (gerado automaticamente)
│
├── frontend/
│   └── src/
│       ├── pages/         # Login, Dashboard, Escalas, Tarefas, Mídia, Usuários, Perfil
│       ├── components/    # Sidebar, TopBar, Layout
│       ├── contexts/      # AuthContext
│       └── services/      # axios configurado
│
└── docker-compose.yml     # Para deploy com Docker
```

---

## Novidades desta versão

- **Lembrete por WhatsApp** — no botão "Avisar pelo WhatsApp" de cada escala agora há duas opções: *Convocação* (com link de confirmação) e *Lembrete*. O envio continua manual, abrindo o WhatsApp com a mensagem pronta.
- **Upload de vários arquivos** — o repositório de mídia aceita selecionar e enviar vários arquivos de uma vez.
- **Anexos nas tarefas** — cada tarefa pode receber anexos, seja fazendo upload de um arquivo novo ou vinculando um arquivo que já está no repositório.
- **Arquivos permanentes** — o ícone de estrela em cada arquivo marca/desmarca como permanente. Arquivos permanentes nunca são removidos pela limpeza automática.
- **Limpeza automática (60 dias)** — uma rotina diária remove do app os arquivos com mais de 60 dias (configurável em `MEDIA_RETENTION_DAYS`), preservando os permanentes. Os arquivos continuam no Google Drive. O líder pode rodar manualmente em `POST /api/admin/cleanup` e ver a prévia em `GET /api/admin/cleanup/preview`.

---

## Dúvidas ou problemas

Entre em contato com quem configurou o sistema ou abra uma issue no repositório.

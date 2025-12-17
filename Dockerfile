# Dockerfile para SaaS Agentes - EasyPanel

# Stage 1: Build
FROM node:20-alpine AS builder

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS runner

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copiar apenas arquivos necessários
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expor porta
EXPOSE 3000

# Usar usuário não-root
USER nodejs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicialização
CMD ["node", "dist/index.js"]


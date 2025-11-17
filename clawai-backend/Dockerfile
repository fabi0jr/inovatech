# Usar imagem leve do Node
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar apenas os arquivos de dependência primeiro (para cache eficiente)
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto do código
COPY . .

# Buildar o projeto NestJS
RUN npm run build

# Expor a porta que o NestJS usa (vimos no main.ts que é 3001)
EXPOSE 3001

# Comando para iniciar
CMD ["npm", "run", "start:prod"]
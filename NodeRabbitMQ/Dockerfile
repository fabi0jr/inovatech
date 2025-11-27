FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema para serialport
RUN apk add --no-cache python3 make g++ linux-headers udev

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código da aplicação
COPY index.js ./

# Comando para iniciar a aplicação
CMD ["node", "index.js"]


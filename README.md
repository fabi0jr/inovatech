# 📘 Guia de Inicialização e Uso - Projeto INOVATECH

Este guia descreve o passo a passo para configurar o ambiente de desenvolvimento, identificar o hardware de visão computacional e iniciar o sistema completo da Mão Robótica com IA.

**Pré-requisitos:**
* Docker e Docker Compose instalados.
* Python 3 instalado.
* Ambiente Linux (nativo ou WSL2).

---

## 1. Preparação do Ambiente Local (Python)

Antes de subir os containers, precisamos rodar um script utilitário localmente para identificar qual ID o sistema operacional atribuiu à sua câmera USB. Para não poluir seu sistema, usaremos um ambiente virtual.

### 1.1. Criar e Ativar o Ambiente Virtual (venv)

Abra o terminal na raiz do projeto e execute os comandos abaixo para criar e ativar a venv:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 1.2. Instalar Dependências de Diagnóstico

Com a venv ativa (o terminal deve mostrar `(venv)` no início da linha), instale o OpenCV para que o script de teste funcione:

```bash
pip install opencv-python
```

---

## 2. Identificação da Câmera (Hardware)

O sistema precisa saber qual porta USB a webcam está utilizando. Geralmente, notebooks possuem uma webcam integrada (ID 0), e a câmera da webcam será um ID diferente (1, 2, etc.).

### 2.1. Executar o Script de Diagnóstico

Certifique-se de que a câmera está conectada à porta USB e execute o script incluído no projeto:

```bash
python3 camId.py
```

**O que observar na saída:**
O script listará os IDs disponíveis.
* Se aparecer apenas `ID 0`, provavelmente é a sua webcam integrada.
* Se aparecer `ID 0` e `ID 1` (ou outro número), anote o ID que corresponde à câmera externa.

> **Exemplo:** Vamos supor que o script identificou a câmera externa como **ID 2**.

---

## 3. Configuração do Docker

Agora que você tem o ID correto, precisamos configurar o serviço de captura para utilizar esse dispositivo específico.

Abra o arquivo `docker-compose.yml` e localize o serviço `capture-service`. Você precisará fazer duas alterações para garantir que o Docker tenha permissão de acesso ao dispositivo:

1.  **Alterar a variável de ambiente:** Mude o valor de `VIDEOCAPTUREID` para o ID encontrado.
2.  **Mapear o dispositivo (devices):** Alterar o mapeamento do dispositivo Linux.

**Exemplo de como deve ficar (se sua câmera for ID 2):**

```bash
  capture-service:
    # ... outras configurações ...
    devices:
      - "/dev/video2:/dev/video2"  <-- Altere aqui para corresponder ao ID encontrado
    environment:
      - VIDEOCAPTUREID=2           <-- Altere aqui também
```

---

## 4. Inicialização do Sistema

Com a configuração salva, vamos construir e subir todos os serviços (Banco de Dados, Backend, Frontend, IA e Captura).

Execute no terminal:

```bash
docker compose up --build -d
```

*Nota: Se você estiver usando uma versão mais antiga do Docker, utilize `docker-compose up --build -d`.*

### Verificando se tudo está rodando

Para garantir que os containers subiram corretamente e verificar logs de erro, use:

```bash
docker compose logs -f
```

---

## 5. Acessando a Interface

Após o carregamento de todos os containers, o sistema estará operante.

* **Interface Web (Live Monitor):** Abra seu navegador em [http://localhost:5173](http://localhost:5173)
* **API Backend:** Disponível em [http://localhost:3001](http://localhost:3001)

### 🛑 Parando o Sistema

Para encerrar a execução e parar todos os containers:

```bash
docker compose down
```
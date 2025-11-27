const amqp = require('amqplib');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// --- CONFIGURAÇÕES ---
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBIT_URL = `amqp://${RABBITMQ_HOST}`; 
const QUEUE_NAME = 'fila_deteccao'; 
const CAMINHO_PORTA = process.env.SERIAL_PORT || '/dev/ttyUSB0'; // CONFIRA SUA PORTA
const BAUD_RATE = 9600;

// Configuração de Persistência
const MAX_TENTATIVAS = 40; 
const INTERVALO_MS = 500;  

// --- INICIALIZAÇÃO ---
const port = new SerialPort({ path: CAMINHO_PORTA, baudRate: BAUD_RATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

let channel = null;

async function setupRabbit() {
    try {
        const connection = await amqp.connect(RABBIT_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`[RABBIT] Conectado.`);
    } catch (error) {
        console.error('[RABBIT] Erro:', error.message);
        setTimeout(setupRabbit, 5000);
    }
}

port.on('open', () => console.log(`[SERIAL] Arduino conectado na ${CAMINHO_PORTA}`));

parser.on('data', async (data) => {
    const msg = data.trim();
    console.log(`[ARDUINO]: ${msg}`);

    if (msg === 'DETECTADO') {
        console.log('[LOGICA] Solicitado. Iniciando busca...');
        await tentarBuscarMensagem();
    }
});

async function tentarBuscarMensagem() {
    if (!channel) return console.log('[ERRO] RabbitMQ Offline.');
    const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 1; i <= MAX_TENTATIVAS; i++) {
        const msg = await channel.get(QUEUE_NAME, { noAck: false });

        if (msg) {
            console.log(`[SUCESSO] Mensagem encontrada!`);
            processarMensagem(msg);
            return; 
        } 
        process.stdout.write(`.`); 
        await esperar(INTERVALO_MS); 
    }

    // --- CORREÇÃO AQUI ---
    console.log('\n[TIMEOUT] Nenhuma mensagem. Liberando esteira.');
    port.write('C'); // Manda o Arduino continuar mesmo sem classificar
}

function processarMensagem(msg) {
    try {
        const conteudo = msg.content.toString();
        const dados = JSON.parse(conteudo);
        const objeto = dados.decisao_direcao ? dados.decisao_direcao.toLowerCase() : 'desc';
        console.log(`\n[RABBIT] Objeto: ${objeto}`);

        let comando = null;

        if (objeto.includes('direita')) {
            comando = 'D';
        } else if (objeto.includes('esquerda')) {
            comando = 'E';
        } else {
            // --- CORREÇÃO AQUI ---
            console.log(`[IGNORADO] Sem regra para '${objeto}'. Liberando esteira.`);
            comando = 'C'; // Manda continuar
        }

        if (comando) {
            console.log(`[SERIAL] >>> Enviando '${comando}'`);
            port.write(comando);
        }
        channel.ack(msg);

    } catch (e) {
        console.error('[ERRO] JSON Inválido:', e);
        channel.ack(msg);
        port.write('C'); // Na dúvida, libera a esteira
    }
}

setupRabbit();
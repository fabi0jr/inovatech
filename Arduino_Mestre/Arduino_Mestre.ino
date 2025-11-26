#include <SoftwareSerial.h>

// --- Comunicação com Arduino B (Braço) ---
// RX=2, TX=3 (Ligar cruzado no outro Arduino)
SoftwareSerial arduinoBraco(2, 3); 

// --- Hardware ---
const int PIN_SENSOR_IR = 4; // Sensor de Obstáculo
// Ponte H (Esteira)
const int IN1 = 8;
const int IN2 = 9;
const int IN3 = 10;
const int IN4 = 11;

// --- Estados do Sistema ---
bool aguardandoCamera = false; // Estado: Parado esperando o Node.js
bool aguardandoBraco = false;  // Estado: Parado esperando o Braço terminar

void setup() {
  Serial.begin(9600);       // USB (Conversa com o Node.js)
  arduinoBraco.begin(9600); // Serial (Conversa com o Braço)
  
  // Configura Sensor (INPUT)
  pinMode(PIN_SENSOR_IR, INPUT); 
  
  // Configura Ponte H
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  
  Serial.println("=== SISTEMA INICIADO ===");
  Serial.println("Esteira rodando. Aguardando objeto no sensor...");
}

void loop() {
  
  // --- PRIORIDADE 1: Esperando o Braço terminar o serviço ---
  if (aguardandoBraco) {
    // A esteira continua parada aqui.
    // O Arduino fica ouvindo o Arduino B
    if (arduinoBraco.available() > 0) {
      char resposta = arduinoBraco.read();
      
      if (resposta == 'K') {
        // Recebeu o "OK" do braço
        Serial.println("[ARDUINO] Braço terminou. Liberando esteira...");
        
        aguardandoBraco = false; // Sai desse estado
        // A esteira vai voltar a rodar no próximo loop
        
        // Delay pequeno para a peça sair da frente do sensor e não disparar de novo imediatamente
        rodarEsteira(); 
        delay(1500); 
      }
    }
  }
  
  // --- PRIORIDADE 2: Esperando o Node.js (Câmera) decidir ---
  else if (aguardandoCamera) {
    // A esteira continua parada aqui.
    // O Arduino fica ouvindo o USB (Serial)
    
    if (Serial.available() > 0) {
      char comando = tolower(Serial.read()); // Lê do Node.js
      
      // Se o Node.js mandou Direita ou Esquerda
      if (comando == 'd' || comando == 'e') {
        Serial.print("[ARDUINO] Decisão recebida: ");
        Serial.println(comando);
        
        // 1. Repassa o comando para o Braço via fio
        arduinoBraco.write(toupper(comando)); 
        
        // 2. Muda o estado
        aguardandoCamera = false; // Já recebeu a decisão
        aguardandoBraco = true;   // Agora espera o braço trabalhar
      }else if (comando == 'c') {
        Serial.println("[ARDUINO] Comando Continuar recebido. Ignorando objeto.");
        
        // Não manda nada pro braço, apenas volta a rodar a esteira
        aguardandoCamera = false;
        aguardandoBraco = false; // Garante que não trava
        
        delay(1000); // Tempo para a peça "ignorada" passar pelo sensor
        rodarEsteira();
      }
    }
  }
  
  // --- PRIORIDADE 3: Modo Normal (Esteira Rodando) ---
  else {
    rodarEsteira();
    
    // Lê o Sensor IR
    // LOW geralmente significa "Obstáculo Detectado" nesses sensores
    bool objetoDetectado = digitalRead(PIN_SENSOR_IR) == LOW;

    if (objetoDetectado) {
      // 1. Para tudo imediatamente
      pararEsteira();
      
      Serial.println("DETECTADO"); // <--- MENSAGEM CHAVE PARA O NODE.JS
      
      // 2. Muda o estado para esperar a câmera
      aguardandoCamera = true;
      
      // Delay de estabilização (para a peça não tremer na frente da câmera)
      delay(500);
    }
  }
}

// --- Funções Auxiliares ---
void rodarEsteira() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void pararEsteira() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}
/*
 * PROJETO: ESTEIRA INTELIGENTE COM BRAÇO ROBÓTICO E IA
 * ARDUINO: MESTRE
 * CORREÇÃO: INPUT_PULLUP para evitar ruído no sensor desconectado.
 */

#include <SoftwareSerial.h>

SoftwareSerial arduinoBraco(2, 3); 

const int PIN_SENSOR_IR = 4; 
const int PIN_RELE = 8;     

// --- Configuração de Tempo ---
const int TEMPO_POS_RETIRADA = 3000; 

// --- Variáveis de Estado ---
bool aguardandoCamera = false; 
bool aguardandoBraco = false; 

void setup() {
  Serial.begin(9600);       
  arduinoBraco.begin(9600); 
  
  // --- CORREÇÃO AQUI ---
  // INPUT_PULLUP garante que, se o fio soltar, a leitura será HIGH (1).
  // Como sua lógica detecta objeto com LOW (0), o sistema ficará "Quieto" se o sensor falhar/soltar.
  pinMode(PIN_SENSOR_IR, INPUT_PULLUP); 
  
  digitalWrite(PIN_RELE, HIGH); 
  pinMode(PIN_RELE, OUTPUT);

  Serial.println("=== SISTEMA INICIADO ===");
  Serial.println("Esteira pronta.");
  
  delay(1000);
  rodarEsteira(); 
}

void loop() {
  
  // 1. ESPERANDO BRAÇO
  if (aguardandoBraco) {
    if (arduinoBraco.available() > 0) {
      char resposta = arduinoBraco.read();
      if (resposta == 'K') {
        Serial.println("[ARDUINO] Braço terminou. Reiniciando...");
        aguardandoBraco = false;
        aguardandoCamera = false;
        rodarEsteira(); 
        delay(TEMPO_POS_RETIRADA); 
      }
    }
  }
  
  // 2. ESPERANDO NODE.JS
  else if (aguardandoCamera) {
    if (Serial.available() > 0) {
      char comando = tolower(Serial.read()); 
      if (comando == 'd' || comando == 'e') {
        arduinoBraco.write(toupper(comando)); 
        aguardandoCamera = false; 
        aguardandoBraco = true;   
      }
      else if (comando == 'c') {
        aguardandoCamera = false;
        aguardandoBraco = false; 
        rodarEsteira();
        delay(1500); 
      }
    }
  }
  
  // 3. MODO NORMAL
  else {
    rodarEsteira(); 
    
    // Agora, graças ao PULLUP, se não tiver sensor, isso aqui lê HIGH (falso)
    // E o relé para de bater.
    bool objetoDetectado = digitalRead(PIN_SENSOR_IR) == LOW;

    if (objetoDetectado) {
      pararEsteira(); 
      Serial.println("DETECTADO"); 
      aguardandoCamera = true; 
      delay(500); 
    }
  }
}

void rodarEsteira() {
  digitalWrite(PIN_RELE, LOW); 
}

void pararEsteira() {
  digitalWrite(PIN_RELE, HIGH);
}
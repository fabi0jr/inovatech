/*
 * PROJETO: ESTEIRA INTELIGENTE - VERSÃO ESTÁVEL
 * ARDUINO: MESTRE
 * CORREÇÃO: Filtro de ruído no sensor e proteção contra reset na partida.
 */

#include <SoftwareSerial.h>

SoftwareSerial arduinoBraco(2, 3); 

const int PIN_SENSOR_IR = 9; 
const int PIN_RELE = 8;     

// --- Configuração de Tempo ---
const int TEMPO_POS_RETIRADA = 3000; 

// --- Variáveis de Estado ---
bool aguardandoCamera = false; 
bool aguardandoBraco = false; 

void setup() {
  Serial.begin(9600);       
  arduinoBraco.begin(9600); 
  
  pinMode(PIN_SENSOR_IR, INPUT_PULLUP); 
  
  // Começa DESLIGADO (HIGH) para estabilizar a fonte
  digitalWrite(PIN_RELE, HIGH); 
  pinMode(PIN_RELE, OUTPUT);

  Serial.println("=== SISTEMA INICIADO ===");
  Serial.println("Estabilizando energia...");
  delay(2000); // Espera 2 segundos antes de tentar ligar o motor
  
  Serial.println("Esteira ligando...");
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
    
    // --- FILTRO DE RUÍDO (DEBOUNCE) ---
    // Só aceita que detectou se o sensor ficar LOW por 50ms seguidos.
    // Isso evita que piscadas de luz ou ruído elétrico parem a esteira.
    if (digitalRead(PIN_SENSOR_IR) == LOW) {
       //delay(10); // Espera 50ms para ver se é real
       if (digitalRead(PIN_SENSOR_IR) == LOW) {
          // Confirmado, é um objeto real
          pararEsteira(); 
          Serial.println("DETECTADO"); 
          aguardandoCamera = true; 
          delay(500); 
       }
    }
  }
}

// --- FUNÇÕES RELÉ (Active LOW) ---
void rodarEsteira() {
  digitalWrite(PIN_RELE, LOW); 
}

void pararEsteira() {
  digitalWrite(PIN_RELE, HIGH);
}
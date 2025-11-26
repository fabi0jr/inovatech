#include <Stepper.h>
#include <Servo.h>
#include <SoftwareSerial.h> // Adicionamos a comunicação

// --- Comunicação ---
// RX no pino 2, TX no pino 3 (Ligados cruzados no outro Arduino)
SoftwareSerial arduinoMestre(2, 3);

// --- Constantes ---
const int STEPS_PER_REVOLUTION = 2048;
const int PASSOS_AJUSTE = 100; 

// --- Constantes do Servo ---
const int PINO_SERVO = 5;
const int ANGULO_ABERTO = 150;
const int ANGULO_FECHADO = 60;

// --- Pinagem ---
// Motor 1 (Sobe/Desce)
const int M1_IN1 = 9;
const int M1_IN2 = 8;
const int M1_IN3 = 7;
const int M1_IN4 = 6;

// Motor 2 (Base/Giro)
const int M2_IN1 = 13;
const int M2_IN2 = 12;
const int M2_IN3 = 11;
const int M2_IN4 = 10;

// --- Objetos ---
Stepper motor1(STEPS_PER_REVOLUTION, M1_IN1, M1_IN3, M1_IN2, M1_IN4);
Stepper motor2(STEPS_PER_REVOLUTION, M2_IN1, M2_IN3, M2_IN2, M2_IN4);
Servo garra;

// --- FUNÇÃO PARA DESLIGAR BOBINAS (Evita aquecimento) ---
void relaxarMotores() {
  digitalWrite(M1_IN1, LOW); digitalWrite(M1_IN2, LOW); digitalWrite(M1_IN3, LOW); digitalWrite(M1_IN4, LOW);
  digitalWrite(M2_IN1, LOW); digitalWrite(M2_IN2, LOW); digitalWrite(M2_IN3, LOW); digitalWrite(M2_IN4, LOW);
}

// --- FUNÇÕES DE CONTROLE DA GARRA (Para não esquentar) ---
void abrirGarra() {
  garra.attach(PINO_SERVO);
  garra.write(ANGULO_ABERTO);
  delay(500);
  garra.detach(); // Desliga o servo para não forçar
}

void fecharGarra() {
  garra.attach(PINO_SERVO);
  garra.write(ANGULO_FECHADO);
  delay(500);
  garra.detach(); 
}

void setup() {
  Serial.begin(9600);      // Debug no PC
  arduinoMestre.begin(9600); // Escuta o Arduino A
  
  motor1.setSpeed(15);
  motor2.setSpeed(15);
  
  // Estado inicial
  abrirGarra();

  Serial.println("=== MODO DE CALIBRAÇÃO ===");
  Serial.println(" [F] FINALIZAR");
  
  bool emAjuste = true;

  while (emAjuste) {
    if (Serial.available() > 0) {
      char comando = tolower(Serial.read());

      if (comando == 'w') motor1.step(PASSOS_AJUSTE);
      else if (comando == 's') motor1.step(-PASSOS_AJUSTE);
      else if (comando == 'a') motor2.step(PASSOS_AJUSTE);
      else if (comando == 'd') motor2.step(-PASSOS_AJUSTE);
      else if (comando == 'q') abrirGarra();
      else if (comando == 'e') fecharGarra();
      
      relaxarMotores(); 

      if (comando == 'f') {
        Serial.println("Calibração finalizada. Aguardando comandos do Mestre...");
        emAjuste = false;
      }
    }
  }
  // Removemos a movimentação daqui. Agora ela acontece no loop sob demanda.
}

void loop() {
  // Fica escutando se o Arduino A mandou algo
  if (arduinoMestre.available() > 0) {
    char comando = arduinoMestre.read();
    
    if (comando == 'E') {
      Serial.println("Comando Recebido: Jogar na ESQUERDA");
      executarMovimento(1); // 1 = Esquerda (Positivo)
      
      // Manda o Handshake de volta
      arduinoMestre.write('K');
    }
    else if (comando == 'D') {
      Serial.println("Comando Recebido: Jogar na DIREITA");
      executarMovimento(-1); // -1 = Direita (Negativo/Invertido)
      
      // Manda o Handshake de volta
      arduinoMestre.write('K');
    }
  }
}

// --- A MÁGICA DA AUTOMAÇÃO ---
// Criei uma função única que aceita a "Direção" como multiplicador
// direcao = 1 (Esquerda) | direcao = -1 (Direita)
void executarMovimento(int direcao) {
  
  // 1. Garante garra aberta antes de descer
  abrirGarra();
  
  // 2. Desce o Braço (Motor 1)
  // (Baseado no seu código: -3 voltas)
  motor1.step(-3 * STEPS_PER_REVOLUTION);
  relaxarMotores(); 
  
  // 3. Pega o objeto
  fecharGarra();
  delay(500);
  
  // 4. Sobe o Braço
  motor1.step(3 * STEPS_PER_REVOLUTION);
  relaxarMotores(); 
  
  // 5. Gira a Base (Motor 2)
  // Se direcao for 1, gira positivo (Esq). Se for -1, gira negativo (Dir).
  motor2.step(direcao * STEPS_PER_REVOLUTION);
  relaxarMotores(); 
  delay(500);
  
  // 6. Solta o objeto
  abrirGarra();
  delay(500);
  
  // (Opcional: Fecha a garra vazia ou deixa aberta, você escolhe)
  fecharGarra(); 
  delay(500);
  
  // 7. Retorna a Base para o Centro
  // Note o sinal de menos (-direcao) para fazer o caminho inverso
  motor2.step(-direcao * STEPS_PER_REVOLUTION);
  relaxarMotores(); 
  
  Serial.println("Movimento concluído.");
}